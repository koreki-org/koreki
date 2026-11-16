import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';
import { BAUSTEINE, mitBausteinen } from '../../src/lib/ai/prompt-bausteine';
import { buildCleanAndAnalyzePrompt, buildCleanAndMapPrompt } from '../../src/lib/ai/prompt-builder';

/**
 * Wächter: Regeln, die in mehreren Prompts gelten, stehen genau einmal.
 * 🧱
 *
 * ANLASS (16.11.2026). Die Regel "Formeln in `$...$` einschließen" stand nur
 * im Prompt der Musterlösung. Die Zuordnung der Schülerarbeiten verlangte
 * LaTeX ohne Delimiter — ob `\frac{U}{R_C}` als Bruch oder als Rohtext in der
 * Prüfansicht stand, entschied das Modell von Arbeit zu Arbeit. Keine falsche
 * Regel, sondern eine fehlende: dieselbe Fehlerklasse wie bei den
 * Profil-Familien (`profile-family-symmetry.test.ts`).
 *
 * Geprüft wird:
 * 1. Jede Vorlage in PFLICHT trägt ihre Bausteine.
 * 2. Jede Vorlage mit einem Baustein-Platzhalter steht in PFLICHT — mit dem
 *    Aufbau, der sie zusammensetzt. Sonst stünde `{{baustein:…}}` wörtlich
 *    im Prompt, sobald jemand ihn in eine Vorlage schreibt, deren Aufbau
 *    `mitBausteinen` nicht aufruft.
 * 3. Der fertige Prompt enthält den Baustein und keinen Platzhalter mehr.
 * 4. Ordner und Verzeichnis der Bausteine stimmen überein.
 */

const PROMPTS_DIR = join(process.cwd(), 'src', 'prompts');
const BAUSTEIN_DIR = join(PROMPTS_DIR, 'core', 'default', 'bausteine');
const PLATZHALTER = /\{\{baustein:([a-z0-9-]+)\}\}/g;
/** Ohne `g`: `test` mit `g` merkt sich die Position zwischen Aufrufen. */
const HAT_PLATZHALTER = /\{\{baustein:[a-z0-9-]+\}\}/;

interface Pflicht {
    /** Pfad unter `src/prompts/`, mit `/`. */
    vorlage: string;
    bausteine: string[];
    /** Baut den System-Prompt, der aus dieser Vorlage entsteht. */
    baue: () => string;
}

/**
 * Vorlagen, deren Text in der Anzeige landet — und damit in `MathMarkdown`,
 * das Formeln nur zwischen `$` und Tabellen nur mit Ausrichtungszeile darstellt.
 *
 * Die Bilderkennung (`vision/system.md`) steht bewusst NICHT hier: Ihr Text
 * geht durch die Zuordnung, bevor er angezeigt wird, und der Prompt ist am
 * 30.10.2026 vermessen worden. Eine Änderung dort braucht eine neue Messung.
 */
const PFLICHT: Pflicht[] = [
    {
        vorlage: 'core/default/analyze-and-clean/system.md',
        bausteine: ['formeln', 'tabellen'],
        baue: () => buildCleanAndAnalyzePrompt('Musterlösung').system
    },
    {
        vorlage: 'core/default/analyze-and-map/system.md',
        bausteine: ['formeln', 'tabellen'],
        baue: () => buildCleanAndMapPrompt('Schülertext', []).system
    }
];

function alleMarkdownDateien(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const pfad = join(dir, name);
        if (lstatSync(pfad).isDirectory()) return alleMarkdownDateien(pfad);
        return name.endsWith('.md') ? [pfad] : [];
    });
}

const alsSchluessel = (pfad: string) => relative(PROMPTS_DIR, pfad).split(sep).join('/');

describe('Prompt-Bausteine', () => {
    it.each(PFLICHT.map(p => [p.vorlage, p] as const))('%s trägt ihre Bausteine', (_, pflicht) => {
        const text = readFileSync(join(PROMPTS_DIR, pflicht.vorlage), 'utf8');
        for (const name of pflicht.bausteine) {
            expect(text).toContain(`{{baustein:${name}}}`);
        }
    });

    it.each(PFLICHT.map(p => [p.vorlage, p] as const))('%s: fertiger Prompt enthält den Baustein, keinen Platzhalter', (_, pflicht) => {
        const system = pflicht.baue();
        expect(system).not.toMatch(HAT_PLATZHALTER);
        for (const name of pflicht.bausteine) {
            expect(system).toContain(BAUSTEINE[name].trim());
        }
    });

    it('jede Vorlage mit Baustein-Platzhalter ist in PFLICHT eingetragen', () => {
        const eingetragen = new Set(PFLICHT.map(p => p.vorlage));
        const mitPlatzhalter = alleMarkdownDateien(PROMPTS_DIR)
            .filter(pfad => !pfad.startsWith(BAUSTEIN_DIR))
            .filter(pfad => HAT_PLATZHALTER.test(readFileSync(pfad, 'utf8')))
            .map(alsSchluessel);

        expect(mitPlatzhalter.filter(v => !eingetragen.has(v))).toEqual([]);
    });

    it('jeder benutzte Baustein existiert', () => {
        const benutzt = alleMarkdownDateien(PROMPTS_DIR).flatMap(pfad =>
            Array.from(readFileSync(pfad, 'utf8').matchAll(PLATZHALTER), m => m[1]));

        expect(benutzt.filter(name => !(name in BAUSTEINE))).toEqual([]);
    });

    it('Ordner und Verzeichnis der Bausteine stimmen überein', () => {
        const dateien = readdirSync(BAUSTEIN_DIR).filter(n => n.endsWith('.md')).map(n => n.replace(/\.md$/, ''));
        expect(dateien.sort()).toEqual(Object.keys(BAUSTEINE).sort());
    });

    it('ein unbekannter Baustein wirft, statt stehenzubleiben', () => {
        expect(() => mitBausteinen('a {{baustein:gibtsnicht}} b')).toThrow('gibtsnicht');
    });

    /** Bausteine enthalten `$` — die Einsetzung darf sie nicht als Ersatzmuster lesen. */
    it('setzt die Delimiter des Formel-Bausteins wörtlich ein', () => {
        expect(mitBausteinen('{{baustein:formeln}}')).toContain('`$$...$$`');
    });
});
