import type { BatchFile } from '@/types';
import { neueArbeit } from '@/lib/logic';
import { HANDSCHRIFT_ORDNER, HANDSCHRIFT_SEITEN } from './handschrift-seiten';

/** Die Demo gibt es zweimal: als getippten Text und als handschriftliche Scans. */
export type DemoArt = 'getippt' | 'handschrift';

const alsDataUrl = (bild: Blob): Promise<string> => new Promise((fertig, fehler) => {
    const leser = new FileReader();
    leser.onload = () => fertig(String(leser.result));
    leser.onerror = () => fehler(leser.error);
    leser.readAsDataURL(bild);
});

/**
 * Laedt die Blaetter der Handschrift-Demo als Arbeiten, wie ein Upload sie
 * erzeugt haette: ein Bild je Arbeit, als Scan markiert, noch nicht erkannt.
 * Danach laeuft alles ueber den normalen Weg — erst „Bilderkennung“, dann der
 * erkannte Text zum Pruefen, dann „Korrigieren“. Genau das soll die Demo zeigen.
 */
export async function ladeHandschriftArbeiten(): Promise<BatchFile[]> {
    return Promise.all(HANDSCHRIFT_SEITEN.map(async (seite, i) => {
        const antwort = await fetch(`${HANDSCHRIFT_ORDNER}/${seite.datei}`);
        if (!antwort.ok) throw new Error(`Demo-Blatt ${seite.datei} fehlt (${antwort.status})`);
        const bild = await antwort.blob();
        return {
            ...neueArbeit(new File([bild], seite.datei, { type: 'image/jpeg' }), i + 1, seite.originalName),
            name: seite.name,
            documentType: 'scanned' as const,
            estimatedCredits: 2,
            // Als data:-Adresse, wie nach der Bilderkennung: Die CSP laesst fuer Bilder
            // kein blob: zu, eine Vorschau aus der Datei selbst bliebe leer.
            previewDataUrls: [await alsDataUrl(bild)],
        };
    }));
}
