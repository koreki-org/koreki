import {
    istTextDatei,
    istLesbaresDokument,
    istCodeDatei,
    codeSprache,
    MUSTERLOESUNG_ENDUNGEN,
    SCHUELERARBEIT_ENDUNGEN
} from '../../src/lib/upload-dateiarten';

/**
 * Welche Dateien Koreki als Musterloesung oder Schuelerarbeit liest.
 * Die Liste stand frueher an fuenf Stellen und war nicht deckungsgleich.
 */
describe('upload-dateiarten', () => {
    const d = (name: string, type = '') => ({ name, type });

    it('erkennt Markdown als Text, auch ohne MIME-Typ (Windows)', () => {
        expect(istTextDatei(d('muster.md'))).toBe(true);
        expect(istTextDatei(d('MUSTER.MD'))).toBe(true);
        expect(istTextDatei(d('x', 'text/markdown'))).toBe(true);
        expect(istTextDatei(d('arbeit.txt'))).toBe(true);
    });

    it('nimmt PDF, Bilder und Text an', () => {
        expect(istLesbaresDokument(d('a.pdf', 'application/pdf'))).toBe(true);
        expect(istLesbaresDokument(d('a.pdf'))).toBe(true);
        expect(istLesbaresDokument(d('a.png', 'image/png'))).toBe(true);
        expect(istLesbaresDokument(d('a.md'))).toBe(true);
    });

    it('weist Word, Tabellen und Sitzungen als Einzeldokument ab', () => {
        expect(istLesbaresDokument(d('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(false);
        expect(istLesbaresDokument(d('a.xlsx'))).toBe(false);
        expect(istLesbaresDokument(d('a.koreki', 'application/json'))).toBe(false);
        expect(istLesbaresDokument(d('ohne-endung'))).toBe(false);
    });

    it('bietet .md in beiden Dateidialogen an', () => {
        expect(MUSTERLOESUNG_ENDUNGEN.split(',')).toContain('.md');
        expect(SCHUELERARBEIT_ENDUNGEN.split(',')).toEqual(
            expect.arrayContaining(['.md', '.txt', '.pdf', '.xlsx', '.csv', '.koreki'])
        );
    });

    /**
     * Sprache fuer den Codeblock. Die Tabelle ist die einzige Quelle — die
     * Endungsliste wird daraus abgeleitet, also kann keine Endung als Code
     * erkannt werden und trotzdem ohne Sprache dastehen.
     */
    it('kennt zu jeder Code-Endung eine Sprache, unabhaengig von der Schreibweise', () => {
        expect(codeSprache('kosten.py')).toBe('python');
        expect(codeSprache('KOSTEN.PY')).toBe('python');
        expect(codeSprache('Main.java')).toBe('java');
        expect(codeSprache('abfrage.sql')).toBe('sql');
        expect(codeSprache('start.ps1')).toBe('powershell');
        for (const name of ['a.py', 'a.cpp', 'a.yml', 'a.log', 'a.csv']) {
            expect(istCodeDatei(d(name))).toBe(true);
            expect(codeSprache(name)).not.toBeNull();
        }
    });

    it('gibt Text und Markdown keine Sprache — die sollen gedeutet werden', () => {
        expect(codeSprache('loesung.md')).toBeNull();
        expect(codeSprache('arbeit.txt')).toBeNull();
        expect(codeSprache('scan.pdf')).toBeNull();
    });
});
