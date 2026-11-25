import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { selectFiles } from '@/lib/file-utils';
import { meldeFehler, meldeHinweis, meldeErfolg } from '@/lib/notify';
import { logger } from '@/lib/logger';
import {
    stueckeAus, anfaengeJeSeitenzahl, setzeAnfang, entferneAnfang, leseKlassenliste, baueAufteilung,
    naechsteArbeit, vorigeArbeit, vorschlagJeArbeit, SchuelerName, Stueck, Aufteilung
} from '@/lib/stapel-aufteilen';

/**
 * Eine CSV traegt keinen Zeichensatz in sich. Als Rohdaten gelesen, wurde aus
 * „Müller“ in UTF-8 „MÃ¼ller“. Excel speichert je nach Einstellung UTF-8 oder
 * den Windows-Zeichensatz — erst das eine versuchen, dann das andere.
 */
const csvAlsText = (daten: ArrayBuffer): string => {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(daten);
    } catch {
        return new TextDecoder('windows-1252').decode(daten);
    }
};

/**
 * Zustand des Scheren-Fensters: welche Seite man ansieht, wo geschnitten ist,
 * welcher Name zu welcher Arbeit gehoert. Die Regeln stehen in
 * `lib/stapel-aufteilen.ts`; hier nur, was sich merkt.
 */
export function useStapelAufteilen(erste: number, letzte: number) {
    const [seite, setSeite] = useState(erste);
    const [anfaenge, setAnfaenge] = useState<number[]>([erste]);
    const [eingaben, setEingaben] = useState<Record<number, string>>({});
    const [klassenliste, setKlassenliste] = useState<SchuelerName[]>([]);
    /** Abstand aus „Seiten je Arbeit“ — damit wird nach einer Verschiebung das Ende aufgefuellt. */
    const [seitenJe, setSeitenJe] = useState<number | null>(null);

    const stuecke: Stueck[] = useMemo(() => stueckeAus(anfaenge, erste, letzte), [anfaenge, erste, letzte]);

    const blaettern = useMemo(() => ({
        zu: (s: number) => setSeite(Math.min(letzte, Math.max(erste, s))),
        vor: () => setSeite(s => Math.min(letzte, s + 1)),
        zurueck: () => setSeite(s => Math.max(erste, s - 1)),
        naechsteArbeit: () => setSeite(s => naechsteArbeit(stuecke, s)),
        vorigeArbeit: () => setSeite(s => vorigeArbeit(stuecke, s))
    }), [erste, letzte, stuecke]);

    const anfangHier = useCallback(() => {
        setAnfaenge(alt => setzeAnfang(alt, seite, erste, letzte, seitenJe));
    }, [seite, erste, letzte, seitenJe]);

    const keinAnfangHier = useCallback(() => {
        setAnfaenge(alt => entferneAnfang(alt, seite, erste));
    }, [seite, erste]);

    const jeArbeit = useCallback((seiten: number) => {
        setSeitenJe(seiten);
        setAnfaenge(anfaengeJeSeitenzahl(erste, letzte, seiten));
        setSeite(erste);
    }, [erste, letzte]);

    const setzeName = useCallback((start: number, text: string) => {
        setEingaben(alt => ({ ...alt, [start]: text }));
    }, []);

    const ladeKlassenliste = useCallback(async () => {
        const [datei] = await selectFiles({ accept: '.xlsx,.xls,.csv' });
        if (!datei) return;
        try {
            const mappe = /\.csv$/i.test(datei.name)
                ? XLSX.read(csvAlsText(await datei.arrayBuffer()), { type: 'string' })
                : XLSX.read(await datei.arrayBuffer(), { type: 'array' });
            const blatt = mappe.Sheets[mappe.SheetNames[0]];
            const namen = leseKlassenliste(XLSX.utils.sheet_to_json<unknown[]>(blatt, { header: 1 }));
            if (namen.length === 0) {
                meldeHinweis('Keine Namen gefunden. Erwartet: Spalte A Nachname, Spalte B Vorname.');
                return;
            }
            setKlassenliste(namen);
            // Vorschneiden nur, solange noch niemand selbst geschnitten hat —
            // sonst ueberschriebe die Liste die Arbeit der Lehrkraft.
            const gesamt = letzte - erste + 1;
            const vorschlag = stuecke.length === 1 ? vorschlagJeArbeit(gesamt, namen.length) : null;
            if (!vorschlag) {
                meldeErfolg(`${namen.length} Namen aus der Klassenliste geladen.`);
                return;
            }
            jeArbeit(vorschlag.jeArbeit);
            if (vorschlag.glatt) {
                meldeErfolg(`${namen.length} Namen geladen, je ${vorschlag.jeArbeit} Seiten vorgeschnitten.`);
            } else {
                meldeHinweis(
                    `${namen.length} Namen, ${gesamt} Seiten: Das geht nicht glatt auf. Je ${vorschlag.jeArbeit} Seiten ` +
                    'vorgeschnitten. Prüf beim Durchblättern die Anfänge.'
                );
            }
        } catch (err: unknown) {
            logger.error('Klassenliste nicht lesbar', { message: String(err) });
            meldeFehler('Die Klassenliste ließ sich nicht lesen.');
        }
    }, [erste, letzte, stuecke.length, jeArbeit]);

    const ergebnis = useCallback((): Aufteilung[] => baueAufteilung(stuecke, eingaben, klassenliste),
        [stuecke, eingaben, klassenliste]);

    return {
        seite, blaettern, stuecke, anfangHier, keinAnfangHier, jeArbeit, seitenJe,
        eingaben, setzeName, klassenliste, ladeKlassenliste, ergebnis
    };
}

export type StapelAufteilen = ReturnType<typeof useStapelAufteilen>;
