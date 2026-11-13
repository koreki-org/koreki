/**
 * Die Dateien EINES Prueflings zu einer Arbeit buendeln.
 * 📎
 *
 * Die Verarbeitung danach — Vorschau, Bilderkennung, Schwaerzen, Datenschutz-
 * pruefung — liest je Arbeit genau eine Datei (`files[0]`, an sechs Stellen).
 * Statt alle sechs auf Mappen umzubauen, entsteht hier diese eine Datei:
 *
 * - PDFs und Bilder werden EIN PDF. Vor jeder Datei steht eine Trennseite mit
 *   ihrem Namen. Die Bilderkennung liest sie mit, und die Zuordnung zu den
 *   Aufgaben bekommt einen Hinweis, den der Inhalt nicht immer hat
 *   („Kalkulation.pdf" ohne Aufgabennummer im Text).
 * - Text und Quelltext gehen NICHT ins PDF: Die Bilderkennung verliert die
 *   Einrueckung (gemessen am 13.11.2026 an Python-Code). Sie werden woertlich
 *   als `textBeilagen` an den erkannten Text gehaengt (`mitTextBeilagen`).
 *   Gibt es nur Text, wird daraus eine Textdatei — die liest Koreki ohnehin
 *   ohne KI.
 */
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { istBildDatei, istPdfDatei } from './upload-dateiarten';

export interface GebuendelteAbgabe {
    datei: File;
    /** Woertlicher Text der Text- und Quelltextdateien, mit Dateinamen als Kopf. */
    textBeilagen?: string;
    /** PDFs oder Bilder, die sich nicht oeffnen liessen. */
    unlesbar: string[];
}

const A4 = { breite: 595.28, hoehe: 841.89 };

/** Die Standardschrift kennt nur Latin-1. „Ayşe" wird zu „Ayse", Unbekanntes zu „?". */
function nurDarstellbar(text: string, schrift: PDFFont): string {
    const vorrat = new Set(schrift.getCharacterSet());
    return Array.from(text).map(z => {
        if (vorrat.has(z.codePointAt(0)!)) return z;
        const ohneAkzent = z.normalize('NFD').replace(/[̀-ͯ]/g, '');
        return Array.from(ohneAkzent).every(c => vorrat.has(c.codePointAt(0)!)) ? ohneAkzent : '?';
    }).join('');
}

/** Kopf, unter dem eine Datei im erkannten Text steht. Dieselbe Form wie auf der Trennseite. */
export const dateiKopf = (name: string): string => `=== Datei: ${name} ===`;

async function trennseite(pdf: PDFDocument, schrift: PDFFont, name: string): Promise<void> {
    const seite = pdf.addPage([A4.breite, A4.hoehe]);
    seite.drawText(nurDarstellbar(dateiKopf(name), schrift), {
        x: 56, y: A4.hoehe - 120, size: 16, font: schrift, color: rgb(0, 0, 0)
    });
}

async function haengeAn(pdf: PDFDocument, datei: File): Promise<void> {
    const daten = await datei.arrayBuffer();
    if (istPdfDatei(datei)) {
        const quelle = await PDFDocument.load(daten, { ignoreEncryption: true });
        const seiten = await pdf.copyPages(quelle, quelle.getPageIndices());
        seiten.forEach(s => pdf.addPage(s));
        return;
    }
    const bild = datei.type === 'image/png' ? await pdf.embedPng(daten) : await pdf.embedJpg(daten);
    const faktor = Math.min(1, A4.breite / bild.width, A4.hoehe / bild.height);
    const seite = pdf.addPage([A4.breite, A4.hoehe]);
    seite.drawImage(bild, {
        x: (A4.breite - bild.width * faktor) / 2,
        y: A4.hoehe - bild.height * faktor,
        width: bild.width * faktor,
        height: bild.height * faktor
    });
}

/** Buendelt die Dateien eines Prueflings; `null`, wenn keine einzige lesbar war. */
export async function buendleAbgabe(name: string, dateien: File[]): Promise<GebuendelteAbgabe | null> {
    const dokumente = dateien.filter(d => istPdfDatei(d) || istBildDatei(d));
    const texte = dateien.filter(d => !dokumente.includes(d));

    const textteile: string[] = [];
    for (const t of texte) textteile.push(`${dateiKopf(t.name)}\n${await t.text()}`);
    const textBeilagen = textteile.length > 0 ? textteile.join('\n\n') : undefined;

    const unlesbar: string[] = [];
    if (dokumente.length === 0) {
        return textBeilagen === undefined ? null
            : { datei: new File([textBeilagen], `${name}.txt`, { type: 'text/plain' }), unlesbar };
    }

    const pdf = await PDFDocument.create();
    const schrift = await pdf.embedFont(StandardFonts.Helvetica);
    for (const dok of dokumente) {
        // Erst pruefen, ob sie sich oeffnen laesst — sonst stuende eine Trennseite ohne Inhalt da.
        const probe = await PDFDocument.create();
        try {
            await haengeAn(probe, dok);
        } catch {
            unlesbar.push(dok.name);
            continue;
        }
        await trennseite(pdf, schrift, dok.name);
        await haengeAn(pdf, dok);
    }

    if (pdf.getPageCount() === 0) {
        return textBeilagen === undefined ? null
            : { datei: new File([textBeilagen], `${name}.txt`, { type: 'text/plain' }), unlesbar };
    }
    const bytes = await pdf.save();
    return { datei: new File([new Uint8Array(bytes)], `${name}.pdf`, { type: 'application/pdf' }), textBeilagen, unlesbar };
}

/**
 * Haengt die Text-Beilagen einer Arbeit an den erkannten Text — genau einmal.
 * Nach einem `.koreki`-Import steckt die Beilage schon im gespeicherten Text.
 */
export function mitTextBeilagen(text: string, textBeilagen?: string): string {
    if (!textBeilagen || text.includes(textBeilagen)) return text;
    return `${text}\n\n${textBeilagen}`;
}
