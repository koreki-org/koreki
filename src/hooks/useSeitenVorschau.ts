import { useEffect, useState } from 'react';
import { oeffnePdf, rendereGross, rendereLeiste, OffenesPdf } from '@/lib/seiten-vorschau';
import { logger } from '@/lib/logger';

export interface SeitenVorschau {
    /** Kleine Bilder je Seitenzahl, fuer die Leiste. Fehlende laden noch. */
    klein: Record<number, string>;
    /** Grosse Bilder je Seitenzahl — nur die, die man schon angesehen hat. */
    gross: Record<number, string>;
    fehler: boolean;
}

/**
 * Oeffnet das PDF einmal, rendert die Leiste im Hintergrund und die aktuelle
 * Seite (plus die naechste, damit Blaettern nicht wartet) gross.
 * Schliessen haengt die Komponente aus — dann hoert alles auf und das PDF wird freigegeben.
 */
export function useSeitenVorschau(datei: File | undefined, von: number, bis: number, aktuelle: number): SeitenVorschau {
    const [pdf, setPdf] = useState<OffenesPdf | null>(null);
    const [klein, setKlein] = useState<Record<number, string>>({});
    const [gross, setGross] = useState<Record<number, string>>({});
    const [fehler, setFehler] = useState(false);

    useEffect(() => {
        if (!datei || datei.type !== 'application/pdf') return;
        let abgebrochen = false;
        let offen: OffenesPdf | null = null;
        const melde = (err: unknown) => {
            if (abgebrochen) return;
            logger.error('Seitenvorschau fehlgeschlagen', { message: String(err) });
            setFehler(true);
        };
        oeffnePdf(datei).then(geoeffnet => {
            offen = geoeffnet;
            if (abgebrochen) { void geoeffnet.destroy(); return; }
            setPdf(geoeffnet);
            return rendereLeiste(geoeffnet, von, bis, (s, url) => setKlein(alt => ({ ...alt, [s]: url })), () => abgebrochen);
        }).catch(melde);
        return () => {
            abgebrochen = true;
            setPdf(null);
            if (offen) void offen.destroy();
        };
    }, [datei, von, bis]);

    useEffect(() => {
        if (!pdf) return;
        let abgebrochen = false;
        const fehlend = [aktuelle, aktuelle + 1].filter(s => s >= von && s <= bis && !gross[s]);
        (async () => {
            for (const seite of fehlend) {
                if (abgebrochen) return;
                const url = await rendereGross(pdf, seite);
                // Auch nach einem Seitenwechsel behalten: Das Bild ist fertig, wer
                // zurueckblaettert, braucht es.
                setGross(alt => ({ ...alt, [seite]: url }));
            }
        })().catch((err: unknown) => {
            if (!abgebrochen) logger.error('Seite nicht gerendert', { message: String(err) });
        });
        return () => { abgebrochen = true; };
        // `gross` bewusst nicht in den Abhaengigkeiten: jedes fertige Bild wuerde
        // den Lauf sonst neu starten. Fehlt eine Seite, holt der naechste Seitenwechsel sie.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdf, aktuelle, von, bis]);

    return { klein, gross, fehler };
}
