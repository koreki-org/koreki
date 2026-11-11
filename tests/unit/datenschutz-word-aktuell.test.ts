/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import JSZip from 'jszip';

// jest.setup.js ersetzt JSZip global durch eine Attrappe. Hier wird die echte
// Datei gebaut und gelesen — ohne die echte Bibliothek prüfte der Test nichts.
jest.unmock('jszip');
import { DATENSCHUTZ_QUELLE, DATENSCHUTZ_WORD, DATENSCHUTZ_WORD_URL, datenschutzFuerWord, erzeugeDatenschutzWord } from '@/lib/word/datenschutz-paket';

/**
 * Wächter: Die Word-Datei für Schulen ist nie älter als ihre Quelle.
 *
 * Dieselben Inhalte stehen zweimal da — als Markdown im Repo und als Word-Datei
 * zum Herunterladen. Von Hand gepflegt veraltet die zweite Fassung still, und
 * eine Schule unterschreibt dann etwas, das nicht mehr stimmt. Deshalb wird die
 * Word-Datei erzeugt, und dieser Test erzeugt sie erneut und vergleicht Byte
 * für Byte.
 *
 * Schlägt er fehl: `npm run docs:datenschutz-word` und beide Dateien committen.
 */
describe('Datenschutz-Unterlagen als Word-Datei', () => {
    const quelle = readFileSync(DATENSCHUTZ_QUELLE, 'utf-8');

    it('entspricht der aktuellen Markdown-Quelle', async () => {
        const erwartet = Buffer.from(await erzeugeDatenschutzWord(quelle));
        const vorhanden = readFileSync(DATENSCHUTZ_WORD);
        expect(vorhanden.equals(erwartet)).toBe(true);
    });

    it('liegt dort, wohin der Download-Knopf zeigt', () => {
        expect(`public${DATENSCHUTZ_WORD_URL}`).toBe(DATENSCHUTZ_WORD);
    });

    it('wird bei gleicher Quelle bitgleich erzeugt', async () => {
        const a = Buffer.from(await erzeugeDatenschutzWord(quelle));
        const b = Buffer.from(await erzeugeDatenschutzWord(quelle));
        expect(a.equals(b)).toBe(true);
    });

    it('lässt den Pflege-Abschnitt mit den Quelldateien weg', () => {
        const { inhalt } = datenschutzFuerWord(quelle);
        expect(inhalt).not.toMatch(/## Quellen/);
        expect(inhalt).not.toMatch(/src\/lib\//);
        expect(inhalt).not.toMatch(/^---\ntitle:/);
    });

    it('enthält die Abschnitte und markiert die Ausfüllfelder', async () => {
        const zip = await JSZip.loadAsync(readFileSync(DATENSCHUTZ_WORD));
        const dokument = await (zip.file('word/document.xml') as JSZip.JSZipObject).async('string');
        for (const titel of ['Das Wichtigste', 'Wohin gehen die Daten?', 'Vorlage: Eintrag ins Verarbeitungsverzeichnis', 'Bausteine für die Datenschutz-Folgenabschätzung']) {
            expect(dokument).toContain(titel);
        }
        expect(dokument).toContain('<w:highlight w:val="yellow"/>');
        expect(dokument).not.toMatch(/\*\*|`/);
    });
});
