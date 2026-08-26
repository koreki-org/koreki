import fs from 'fs';
import path from 'path';
import {
    KI_HINWEIS_FUSSZEILE,
    KI_HINWEIS_KURZ,
    pdfKennzeichnung,
    excelKennzeichnung
} from '@/lib/ai-disclosure';

/**
 * Kennzeichnung KI-erzeugter Texte.
 *
 * Der Inhaltstest allein reicht nicht: Die eigentliche Fehlerklasse ist der
 * NEUE Exportweg, der die Kennzeichnung schlicht vergisst. Deshalb pruefen die
 * Waechter unten die Ausgabestellen selbst — jede Datei, die ein PDF erzeugt,
 * muss setProperties aufrufen, und Excel-Dateien duerfen nur ueber den
 * gemeinsamen Schreibpunkt entstehen.
 */

const SRC = path.join(process.cwd(), 'src');

function sammleDateien(dir: string, treffer: string[] = []): string[] {
    for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
        const voll = path.join(dir, eintrag.name);
        if (eintrag.isDirectory()) sammleDateien(voll, treffer);
        else if (/\.(ts|tsx)$/.test(eintrag.name)) treffer.push(voll);
    }
    return treffer;
}

const DATEIEN = sammleDateien(SRC).map((p) => ({ pfad: p, inhalt: fs.readFileSync(p, 'utf8') }));
const relativ = (p: string) => path.relative(process.cwd(), p).replace(/\\/g, '/');

describe('Kennzeichnung KI-erzeugter Inhalte', () => {
    it('nennt die Herkunft im Hinweistext, ohne zu warnen', () => {
        expect(KI_HINWEIS_FUSSZEILE).toMatch(/KI-generiert/i);
        expect(KI_HINWEIS_FUSSZEILE).toMatch(/Lehrkraft/i);
        expect(KI_HINWEIS_KURZ).toMatch(/KI-generiert/i);
    });

    it('legt eine maschinenlesbare Kennung in die PDF-Eigenschaften', () => {
        const props = pdfKennzeichnung('Feedback Beispiel');
        expect(props.title).toBe('Feedback Beispiel');
        expect(props.keywords).toMatch(/AI-generated/);
        expect(props.creator).toBe('Koreki');
    });

    it('legt eine maschinenlesbare Kennung in die Excel-Eigenschaften', () => {
        const props = excelKennzeichnung();
        expect(props.Category).toMatch(/AI-generated/);
        expect(props.Comments).toBe(KI_HINWEIS_FUSSZEILE);
    });
});

describe('Waechter: kein Ausgabeweg ohne Kennzeichnung', () => {
    it('jede PDF-erzeugende Datei setzt Dateieigenschaften', () => {
        const ohne = DATEIEN.filter(
            (d) => /new jsPDF\(/.test(d.inhalt) && !/setProperties\(/.test(d.inhalt)
        ).map((d) => relativ(d.pfad));

        expect(ohne).toEqual([]);
    });

    it('Excel-Dateien entstehen nur ueber den gemeinsamen Schreibpunkt', () => {
        const ohne = DATEIEN.filter(
            (d) =>
                /XLSX\.write\(/.test(d.inhalt) &&
                !d.pfad.endsWith(path.join('lib', 'excel', 'utils.ts'))
        ).map((d) => relativ(d.pfad));

        expect(ohne).toEqual([]);
    });
});
