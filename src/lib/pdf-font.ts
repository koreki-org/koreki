import type { jsPDF } from 'jspdf';
import { logger } from './logger';
import { toErrorMessage } from './error-message';

/**
 * Unicode-Schrift fuer alle PDF-Exporte.
 *
 * jsPDF bringt nur die 14 PDF-Standardschriften mit, und die kennen nur
 * Latin-1. Steht in einer Zeile ein Zeichen ausserhalb davon — „η“ aus
 * „E = A · η · H“, „≠“, „→“, oder ein Name wie „Ayşe“ —, faellt das Zeichen
 * weg und jsPDF setzt die GANZE Zeile zweibytig: „D i e  F o r m e l …“,
 * gesperrt und ueber den Seitenrand hinaus. Das Dokument geht an Schueler
 * und Eltern (Befund 11.11.2026, Demo Solaranlage).
 *
 * Liberation Sans ist laufweitengleich zu Helvetica — das Layout bleibt, wie
 * es war. jsPDF bettet nur die benutzten Zeichen ein (rund 30 KB je PDF).
 * Die Dateien liegen unter `public/fonts/` (SIL OFL, `LiberationSans-OFL.txt`)
 * und kommen aus `pdfjs-dist/standard_fonts`.
 *
 * Bekannte Luecken der Schrift: „⇒“, „∈“, „⊂“ (gemessen am 12.11.2026).
 */

/** Name, unter dem die Schrift im Dokument registriert wird. */
export const PDF_SCHRIFT = 'LiberationSans';

/** Rueckfall, falls die Schriftdateien nicht geladen werden konnten. */
const STANDARDSCHRIFT = 'helvetica';

const SCHRIFTDATEIEN = {
    normal: '/fonts/LiberationSans-Regular.ttf',
    bold: '/fonts/LiberationSans-Bold.ttf',
} as const;

type Schnitt = keyof typeof SCHRIFTDATEIEN;

/** Schriftdateien als Binaerzeichenkette, wie `addFileToVFS` sie annimmt. */
export type PdfSchriftdaten = Record<Schnitt, string>;

const alsBinaerzeichenkette = (puffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(puffer);
    let ergebnis = '';
    // Stueckweise, sonst sprengt `apply` bei grossen Dateien den Aufrufstapel.
    for (let i = 0; i < bytes.length; i += 0x8000) {
        ergebnis += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    }
    return ergebnis;
};

const ladeDatei = async (pfad: string): Promise<string> => {
    const antwort = await fetch(pfad);
    if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
    return alsBinaerzeichenkette(await antwort.arrayBuffer());
};

let geladen: Promise<PdfSchriftdaten | null> | null = null;

/**
 * Laedt beide Schnitte einmal pro Sitzung. Schlaegt das fehl, liefert es
 * `null` — der Export laeuft dann mit der Standardschrift weiter, statt ganz
 * auszufallen; nur Zeichen ausserhalb von Latin-1 sind dann betroffen.
 */
export const ladePdfSchrift = (): Promise<PdfSchriftdaten | null> => {
    if (!geladen) {
        geladen = Promise.all([ladeDatei(SCHRIFTDATEIEN.normal), ladeDatei(SCHRIFTDATEIEN.bold)])
            .then(([normal, bold]) => ({ normal, bold }))
            .catch((err: unknown) => {
                logger.warn(`PDF-Schrift nicht geladen, Rueckfall auf Helvetica: ${toErrorMessage(err)}`);
                geladen = null; // naechster Export versucht es erneut
                return null;
            });
    }
    return geladen;
};

/**
 * Registriert die Schrift im Dokument und stellt sie ein. Gibt den Namen
 * zurueck, der fuer `setFont` und die `font`-Angabe von `autoTable` gilt.
 */
export const bindeSchriftEin = (doc: jsPDF, daten: PdfSchriftdaten | null): string => {
    if (!daten) return STANDARDSCHRIFT;
    (Object.keys(SCHRIFTDATEIEN) as Schnitt[]).forEach((schnitt) => {
        const datei = `${PDF_SCHRIFT}-${schnitt}.ttf`;
        doc.addFileToVFS(datei, daten[schnitt]);
        doc.addFont(datei, PDF_SCHRIFT, schnitt);
    });
    doc.setFont(PDF_SCHRIFT, 'normal');
    return PDF_SCHRIFT;
};
