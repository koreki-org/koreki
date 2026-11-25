import * as pdfjsLib from 'pdfjs-dist';
import { renderSinglePage, SEITEN_RENDER_FAKTOR } from './file-utils';
import { promisePool } from './ai/promise-pool';

/**
 * Seitenbilder zum Ansehen — beim Aufteilen eines Sammel-PDFs.
 *
 * Zwei Groessen:
 * - LEISTE: winzige Bilder fuer die Uebersicht, wo die Schnitte sitzen. Alle
 *   Seiten auf einmal, darum klein.
 * - Gross: die Seite, die man gerade liest, mit `SEITEN_RENDER_FAKTOR` — derselbe
 *   Faktor wie fuer die Bilderkennung, also so scharf, wie die KI sie sieht.
 *   Nur bei Bedarf, sonst kostet ein Stapel von 60 Seiten viel Zeit und Speicher.
 *
 * Bis zum 25.11.2026 gab es nur eine mittlere Groesse fuer ein Raster. Die Seite
 * war darin rund 155 Pixel breit, eine Zeile Handschrift drei bis vier Pixel
 * hoch — niemand konnte lesen, wo eine Arbeit beginnt.
 *
 * ARCH: `LEISTEN_FAKTOR` ist bewusst nicht `SEITEN_RENDER_FAKTOR`. Der Waechter
 * render-scale-governance schuetzt jede Fassung, die zur Bilderkennung geht oder
 * geschwaerzt wird. Die Leistenbilder verlassen den Bildschirm nie.
 */
export const LEISTEN_FAKTOR = 0.3;

/** Zwei Seiten gleichzeitig, wie bei der Bilderkennung — mehr bremst grosse Scans eher. */
const GLEICHZEITIG = 2;

export type OffenesPdf = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

export async function oeffnePdf(datei: File): Promise<OffenesPdf> {
    return pdfjsLib.getDocument({ data: await datei.arrayBuffer(), verbosity: 0 }).promise;
}

const alsDataUrl = (base64: string): string => `data:image/jpeg;base64,${base64}`;

/** Eine Seite gross, zum Lesen. */
export async function rendereGross(pdf: OffenesPdf, seite: number): Promise<string> {
    return alsDataUrl(await renderSinglePage(pdf, seite, SEITEN_RENDER_FAKTOR));
}

/**
 * Alle Seiten `von` bis `bis` klein fuer die Leiste; jede wird gemeldet, sobald sie fertig ist.
 * `abgebrochen` wird vor jeder Seite gefragt — wer das Fenster schliesst, haelt den Lauf an.
 */
export async function rendereLeiste(
    pdf: OffenesPdf,
    von: number,
    bis: number,
    onSeite: (seite: number, dataUrl: string) => void,
    abgebrochen: () => boolean
): Promise<void> {
    const seiten: number[] = [];
    for (let s = von; s <= Math.min(bis, pdf.numPages); s++) seiten.push(s);
    await promisePool(seiten, GLEICHZEITIG, async (seite) => {
        if (abgebrochen()) return;
        const url = alsDataUrl(await renderSinglePage(pdf, seite, LEISTEN_FAKTOR));
        if (!abgebrochen()) onSeite(seite, url);
    });
}
