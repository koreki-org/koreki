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
                next[sourceIdx] = {
                    ...next[sourceIdx],
                    redactedDataUrls,
                    redactionRects: rects,
                    isRedacted: true,
                    fileText: "",
                    ocrDone: false,
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

                updates.set(i, {
                    redactedDataUrls: await applyRedactionsToPreviews(basis, merged),
                    redactionRects: merged,
                    isRedacted: true,
                    fileText: "",
                    ocrDone: false,
                    documentType: 'scanned'
                });
            }

            const aktualisiert = Array.from(updates.keys());
            logger.debug("[Schwärzung] Übertragung abgeschlossen", {
                aktualisiert,
                gekennzeichnet: aktualisiert.filter(i => updates.get(i)?.isRedacted)
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
