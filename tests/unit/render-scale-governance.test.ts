import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Waechter: EIN Renderfaktor fuer alle Fassungen einer PDF-Seite
 * 🏮🛡️
 *
 * Vorschau, Bilderkennung und Schwaerzungs-Modal muessen dieselbe Seite in
 * derselben Groesse rendern. Der Faktor steht als `SEITEN_RENDER_FAKTOR` in
 * src/lib/file-utils.ts; eine Zahl direkt im Code faellt hier durch.
 *
 * GEFUNDEN AM 09.09.2026: Die beiden Zahlen waren auseinandergelaufen — 2.5 in
 * der Bilderkennung, 2.0 im Schwaerzungs-Modal. Sichtbar wurde das als Fehler,
 * der wie Zauberei aussah: Eine Korrektur mit lokalem Ollama brach mit 500 ab,
 * lief aber sauber durch, sobald man vorher im Modal einen Balken zog. Denn
 * dann schickt `resolveOCRSource` den Abzug des Modals — die kleinere Fassung —
 * und der Weg mit 2.5 wird uebersprungen. 1490 x 2100 px liessen den
 * Bild-Encoder 9,6 GB am Stueck anfordern, 1190 x 1684 px nicht.
 *
 * Zwei Zahlen an zwei Orten driften. Eine Zahl an einem Ort kann es nicht.
 */

const SRC_DIR = join(process.cwd(), 'src');
const KONSTANTE = 'SEITEN_RENDER_FAKTOR';

const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    readdirSync(dir).forEach(entry => {
        const filePath = join(dir, entry);
        results = lstatSync(filePath).isDirectory()
            ? results.concat(getFilesRecursively(filePath))
            : results.concat(filePath);
    });
    return results;
};

const toRelative = (filePath: string) => relative(SRC_DIR, filePath).split(sep).join('/');

/** `getViewport({ scale: 2.5 })` — eine Zahl statt der Konstanten. */
const VIEWPORT_MIT_ZAHL = /getViewport\(\s*\{[^}]*\bscale\s*:\s*[\d.]/;

/** `renderSinglePage(pdf, seite, 2.5)` — dritter Parameter als Zahl. */
const RENDER_MIT_ZAHL = /renderSinglePage\s*\([^)]*,\s*[\d.]+\s*\)/;

describe('Render-Faktor Governance', () => {
    const dateien = getFilesRecursively(SRC_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    it('rendert Seiten nur ueber SEITEN_RENDER_FAKTOR, nie ueber eine Zahl im Code', () => {
        const verstoesse: string[] = [];

        dateien.forEach(filePath => {
            const inhalt = readFileSync(filePath, 'utf8');
            const relativePath = toRelative(filePath);

            if (VIEWPORT_MIT_ZAHL.test(inhalt)) {
                verstoesse.push(
                    `${relativePath}: getViewport mit fester Zahl. ` +
                    `Bitte ${KONSTANTE} aus lib/file-utils.ts verwenden.`
                );
            }
            if (RENDER_MIT_ZAHL.test(inhalt)) {
                verstoesse.push(
                    `${relativePath}: renderSinglePage mit festem Faktor. ` +
                    `Bitte ${KONSTANTE} aus lib/file-utils.ts verwenden.`
                );
            }
        });

        if (verstoesse.length > 0) {
            throw new Error(`RENDER-FAKTOR GATE:\n  - ${verstoesse.join('\n  - ')}`);
        }
    });

    it('kennt genau eine Definition des Faktors', () => {
        const definitionen = dateien.filter(f =>
            new RegExp(`export const ${KONSTANTE}\\s*=`).test(readFileSync(f, 'utf8'))
        );

        expect(definitionen.map(toRelative)).toEqual(['lib/file-utils.ts']);
    });

    /**
     * Haelt den Waechter ehrlich: Findet er die Konstante nirgends mehr, wurde
     * sie umbenannt oder entfernt — und ab dann winkt er jede Zahl durch.
     */
    it('findet die Konstante an allen drei Renderstellen', () => {
        const nutzer = dateien
            .filter(f => new RegExp(`\\b${KONSTANTE}\\b`).test(readFileSync(f, 'utf8')))
            .map(toRelative)
            .sort();

        // Kein exakter Vergleich: Erwaehnungen in Kommentaren sind erwuenscht
        // und duerfen den Waechter nicht zum Ausschlagen bringen.
        expect(nutzer).toEqual(expect.arrayContaining([
            'hooks/useRedactionEngine.ts',
            'lib/ai/extraction-logic.ts',
            'lib/file-utils.ts'
        ]));
    });
});
