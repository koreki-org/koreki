/**
 * Unicode-Schrift in den PDF-Exporten (Befund 11.11.2026).
 *
 * Mit der jsPDF-Standardschrift fehlte „η“ aus „E = A · η · H“, und die ganze
 * Zeile lief gesperrt ueber den Seitenrand — im Einzel-Feedback, das an
 * Schueler und Eltern geht. Dieser Test rendert mit dem ECHTEN jsPDF (der
 * globale Mock aus jest.setup.js kann das nicht zeigen) und prueft:
 *   1. Die Schrift hat Glyphen fuer die Zeichen, die in Feedbacks vorkommen.
 *   2. Jeder Text im Dokument laeuft ueber die eingebettete Schrift.
 *   3. Waechter: Jede Datei, die ein jsPDF-Dokument anlegt, bindet die Schrift
 *      ein, und keine setzt Helvetica oder eine Tabelle ohne `font` von Hand.
 */
import fs from 'fs';
import path from 'path';
import type { jsPDF as JsPdfTyp } from 'jspdf';
import { bindeSchriftEin, ladePdfSchrift, PDF_SCHRIFT, PdfSchriftdaten } from '../../src/lib/pdf-font';

// Node-Ausgabe von jsPDF: Die ES-Ausgabe, die Jest sonst aufloest, kann es nicht laden.
const { jsPDF } = jest.requireActual<typeof import('jspdf')>('jspdf/dist/jspdf.node.min.js');

const WURZEL = path.join(__dirname, '..', '..');
const leseSchrift = (datei: string): string =>
    fs.readFileSync(path.join(WURZEL, 'public', 'fonts', datei)).toString('binary');

const SCHRIFT: PdfSchriftdaten = {
    normal: leseSchrift('LiberationSans-Regular.ttf'),
    bold: leseSchrift('LiberationSans-Bold.ttf'),
};

/** Zeichen aus echten Feedbacks und Schuelernamen ausserhalb von Latin-1. */
const PROBE = 'Die Formel E = A · η · H; Bezugspreis ≠ Gewinn; x² → ≤ ≥ √ Δ π ∞ € „ok“ – Ayşe Doğan Łukasz';

/** jsPDF-interne Schriftdaten; nicht in den Typen deklariert. */
interface SchriftMitCmap {
    id: string;
    metadata: { cmap: { unicode: { codeMap: Record<number, number> } } };
}

describe('PDF-Schrift', () => {
    it.each(['normal', 'bold'] as const)('hat Glyphen fuer alle Probezeichen (%s)', (schnitt) => {
        const doc = new jsPDF();
        bindeSchriftEin(doc, SCHRIFT);
        doc.setFont(PDF_SCHRIFT, schnitt);
        const codeMap = (doc.getFont() as unknown as SchriftMitCmap).metadata.cmap.unicode.codeMap;
        const fehlend = Array.from(PROBE).filter((z) => z !== ' ' && !codeMap[z.codePointAt(0) ?? 0]);
        expect(fehlend).toEqual([]);
    });

    it('setzt jeden Text mit der eingebetteten Schrift', () => {
        const doc: JsPdfTyp = new jsPDF();
        const font = bindeSchriftEin(doc, SCHRIFT);
        doc.setFont(font, 'bold');
        doc.text('Gesamtfeedback:', 14, 20);
        doc.setFont(font, 'normal');
        doc.text(doc.splitTextToSize(PROBE, 180), 14, 30);

        const eigeneIds = (['normal', 'bold'] as const).map((s) => {
            doc.setFont(font, s);
            return (doc.getFont() as unknown as SchriftMitCmap).id;
        });
        const pdf = doc.output();
        const benutzt = Array.from(pdf.matchAll(/\/(F\d+) [\d.]+ Tf/g), (m) => m[1]);
        expect(benutzt.length).toBeGreaterThan(0);
        expect(benutzt.filter((id) => !eigeneIds.includes(id))).toEqual([]);
    });

    it('faellt bei fehlender Datei auf Helvetica zurueck, statt den Export abzubrechen', async () => {
        const vorher = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        try {
            const daten = await ladePdfSchrift();
            expect(daten).toBeNull();
            expect(bindeSchriftEin(new jsPDF(), daten)).toBe('helvetica');
        } finally {
            global.fetch = vorher;
            jest.restoreAllMocks();
        }
    });
});

describe('Waechter: jedes PDF nutzt die Unicode-Schrift', () => {
    const quellen = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) return quellen(p);
            return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
        });

    const mitPdf = quellen(path.join(WURZEL, 'src'))
        .map((datei) => ({ datei: path.relative(WURZEL, datei), text: fs.readFileSync(datei, 'utf-8') }))
        .filter(({ text }) => /new jsPDF\(/.test(text));

    it('findet die PDF-Erzeuger', () => {
        expect(mitPdf.length).toBeGreaterThan(0);
    });

    it('bindet die Schrift ein, wo ein Dokument entsteht', () => {
        const ohne = mitPdf.filter(({ text }) =>
            (text.match(/new jsPDF\(/g) ?? []).length > (text.match(/bindeSchriftEin\(/g) ?? []).length);
        expect(ohne.map((d) => d.datei)).toEqual([]);
    });

    it('setzt keine Standardschrift von Hand', () => {
        const mitStandard = mitPdf.filter(({ text }) => /setFont\(\s*['"](helvetica|times|courier)/i.test(text));
        expect(mitStandard.map((d) => d.datei)).toEqual([]);
    });

    it('gibt jeder Tabelle die Schrift mit (autoTable faellt sonst auf Helvetica)', () => {
        const ohne = mitPdf.flatMap(({ datei, text }) =>
            text.split(/autoTable\(doc,/).slice(1)
                .filter((aufruf) => !/\bfont\b/.test(aufruf.split(/\n\s*\}\);/)[0]))
                .map(() => datei));
        expect(ohne).toEqual([]);
    });
});
