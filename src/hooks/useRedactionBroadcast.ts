import { useCallback, useState } from 'react';
import { BatchFile } from '../types';
import { renderDocumentPages } from '../lib/file-utils';
import { logger } from '../lib/logger';
import {
    applyRedactionsToPreviews,
    buildRedactionTemplate,
    mergeRedactionTemplate,
    RedactionRectMap
} from '../lib/privacy-utils';

/**
 * Industrial Redaction Broadcast 🏮🛡️
 *
 * Überträgt eine im Schwärzungs-Modal gezogene Schwärzung auf alle Scans des
 * Stapels. Motivation: Die Schwärzungs-Option hing zuvor ausschließlich am
 * PDF-Split-Dialog und war damit für alle unerreichbar, die ihre Arbeiten
 * bereits vereinzelt hochladen.
 */

/** Ein Scan gilt als übertragbares Ziel, solange er noch nicht korrigiert ist. */
export const isBroadcastTarget = (item: BatchFile): boolean =>
    item.documentType === 'scanned' && item.status === 'pending';

const countRects = (rects?: RedactionRectMap): number =>
    Object.values(rects || {}).reduce((summe, seite) => summe + (seite?.length || 0), 0);

/**
 * Entscheidet, ob eine bereits gelaufene Bilderkennung verworfen werden muss.
 *
 * 🏮 Erkannter Text stammt aus dem Bild, das zum Zeitpunkt der Erkennung
 * vorlag. Kommen Balken hinzu (oder war das Dokument vorher gar nicht
 * geschwärzt), kann der Text noch Klarnamen enthalten — dann MUSS er weg.
 *
 * Ändert sich dagegen nichts an den Balken eines bereits geschwärzten Scans,
 * wäre das Verwerfen reine Zerstörung: Der Lehrer verliert erkannten Text samt
 * seiner manuellen Korrekturen und zahlt die Bilderkennung ein zweites Mal.
 * Genau das passierte bisher bei jeder Sammel-Übertragung dem ganzen Stapel.
 */
const invalidatesOcr = (item: BatchFile, merged: RedactionRectMap): boolean =>
    !item.isRedacted || countRects(merged) !== countRects(item.redactionRects);

export const useRedactionBroadcast = (
    batchFiles: BatchFile[],
    setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>
) => {
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const applyRedaction = useCallback(async (
        sourceIdx: number,
        redactedDataUrls: string[],
        rects: RedactionRectMap,
        applyToAllScans: boolean
    ) => {
        if (!applyToAllScans) {
            logger.debug("[Schwärzung] Nur dieses Dokument (Haken nicht gesetzt)", { index: sourceIdx });
            setBatchFiles(prev => {
                const next = [...prev];
                const verwirftOcr = invalidatesOcr(next[sourceIdx], rects);
                next[sourceIdx] = {
                    ...next[sourceIdx],
                    redactedDataUrls,
                    redactionRects: rects,
                    isRedacted: true,
                    ...(verwirftOcr ? { fileText: "", ocrDone: false } : {}),
                    documentType: 'scanned'
                };
                return next;
            });
            return;
        }

        const template = buildRedactionTemplate(rects);
        logger.debug("[Schwärzung] Übertragung gestartet", {
            vorlageBalken: template.length,
            quelle: sourceIdx,
            stapelgröße: batchFiles.length
        });

        if (template.length === 0) {
            logger.warn("[Schwärzung] Keine Vorlage ermittelbar — nichts zu übertragen");
            return;
        }

        setIsBroadcasting(true);
        try {
            const updates = new Map<number, Partial<BatchFile>>();

            for (let i = 0; i < batchFiles.length; i++) {
                const item = batchFiles[i];
                if (i !== sourceIdx && !isBroadcastTarget(item)) {
                    // Stilles Überspringen war die Ursache eines Fehlers, bei dem
                    // Scans ohne GESCHWÄRZT-Kennzeichnung zurückblieben. Der Grund
                    // gehört deshalb ins Protokoll.
                    logger.debug("[Schwärzung] Scan übersprungen", {
                        index: i,
                        dokumenttyp: item.documentType,
                        status: item.status
                    });
                    continue;
                }

                // Für das Quelldokument dienen die soeben im Modal erzeugten
                // Abzüge als Rückfallebene. Ein erneutes Auftragen derselben
                // Rechtecke auf ein bereits geschwärztes Bild ist deckungsgleich,
                // also unschädlich.
                let basis = (i === sourceIdx && !item.previewDataUrls?.length)
                    ? redactedDataUrls
                    : item.previewDataUrls;

                // Bild-Uploads (JPG/PNG) besitzen nie Vorschaubilder — für sie
                // werden die Seiten hier bei Bedarf gerendert. Ohne das bliebe
                // ausgerechnet der Bild-Upload ungeschwärzt.
                if (!basis?.length && item.files?.[0]) {
                    try {
                        basis = await renderDocumentPages(item.files[0], item.pageRange);
                    } catch (err) {
                        logger.warn("Seitenbilder für Sammel-Schwärzung nicht renderbar", { message: String(err) });
                    }
                }

                const existing = i === sourceIdx ? rects : item.redactionRects;
                const merged = mergeRedactionTemplate(existing, template, basis?.length || item.pageCount || 1);

                if (!basis?.length) {
                    logger.warn("[Schwärzung] Keine Seitenbilder — Scan bleibt ungekennzeichnet", {
                        index: i,
                        hatVorschau: !!item.previewDataUrls?.length,
                        hatDatei: !!item.files?.[0],
                        dateityp: item.files?.[0]?.type || '(leer)',
                        dateiname: item.files?.[0]?.name
                    });
                    // 🏮 Ohne Seitenbilder lässt sich kein anonymisierter Abzug
                    // erzeugen. `isRedacted` bleibt deshalb bewusst aus: gesetzt
                    // ohne `redactedDataUrls` fiele `resolveOCRSource` auf das
                    // ORIGINAL zurück und schickte ungeschwärzte Seiten an die
                    // Bilderkennung. Die Rechtecke werden vorgemerkt und von der
                    // Verarbeitungs-Pipeline aufgetragen, sobald Vorschaubilder
                    // existieren.
                    updates.set(i, { redactionRects: merged });
                    continue;
                }

                // Ein Fehlschlag betrifft nur DIESES Dokument.
                //
                // `applyRedactionsToPreviews` bricht seit dem 19.08.2026 ab,
                // statt eine nicht schwaerzbare Seite im Klartext
                // durchzureichen. Ohne dieses `catch` risse der Abbruch die
                // ganze Sammel-Uebertragung mit — und zwar unbemerkt, weil der
                // Aufrufer sie mit `void` startet.
                //
                // Behandelt wie der Fall ohne Seitenbilder direkt darueber: Die
                // Rechtecke werden vorgemerkt, das Dokument aber NICHT als
                // geschwaerzt gekennzeichnet. Dann greift die
                // Datenschutz-Warnung vor dem Absenden.
                let abzug: string[];
                try {
                    abzug = await applyRedactionsToPreviews(basis, merged);
                } catch (err) {
                    logger.warn("Sammel-Schwärzung für ein Dokument fehlgeschlagen", {
                        index: i, message: String(err)
                    });
                    updates.set(i, { redactionRects: merged });
                    continue;
                }

                const verwirftOcr = invalidatesOcr(item, merged);
                updates.set(i, {
                    redactedDataUrls: abzug,
                    redactionRects: merged,
                    isRedacted: true,
                    ...(verwirftOcr ? { fileText: "", ocrDone: false } : {}),
                    documentType: 'scanned'
                });
            }

            const aktualisiert = Array.from(updates.keys());
            logger.debug("[Schwärzung] Übertragung abgeschlossen", {
                aktualisiert,
                gekennzeichnet: aktualisiert.filter(i => updates.get(i)?.isRedacted),
                ocrVerworfen: aktualisiert.filter(i => updates.get(i)?.ocrDone === false)
            });

            setBatchFiles(prev => prev.map((item, i) => {
                const update = updates.get(i);
                return update ? { ...item, ...update } : item;
            }));
        } finally {
            setIsBroadcasting(false);
        }
    }, [batchFiles, setBatchFiles]);

    return { applyRedaction, isBroadcasting };
};
