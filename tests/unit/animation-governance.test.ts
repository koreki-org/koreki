import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Wächter für Animationen
 * 🎞️🛡️
 *
 * Anlass war ein Befund vom 23.10.2026. Der Ladebalken beim App-Start stand
 * still, weil `animate-loading-bar` nirgends definiert war. Beim Nachsehen
 * stellte sich heraus: 93 weitere Stellen benutzten Klassen aus
 * `tailwindcss-animate` (`animate-in fade-in zoom-in-95 …`), einem Zusatz, der
 * nie eingebunden war. Dieselbe Fehlerklasse wie `bg-card` am 07.09.2026 (siehe
 * `surface-governance.test.ts`): Tailwind ignoriert unbekannte Klassen lautlos.
 *
 * Zugleich blinkten 29 Stellen dauerhaft — pulsierende Funkel-Symbole,
 * Warn-Badges, sogar unsichere Wörter mitten im Schülertext. Das Design System
 * verbietet Dauer-Animationen an statischen Elementen seit jeher; ohne Wächter
 * hatte es nichts genützt.
 *
 * GEPRUEFT WIRD DESHALB:
 *   1. Jede `animate-*`-Klasse ist definiert — in Tailwind selbst oder in
 *      `src/styles/globals.css`.
 *   2. Keine Klassen aus `tailwindcss-animate` (`fade-in`, `zoom-in-95`,
 *      `slide-in-from-top-2` …). Für Ebenen über dem Inhalt gibt es
 *      `animate-overlay-in` und `animate-dialog-in`; Inhalt bewegt sich nicht.
 *   3. Dauer-Animationen (`pulse`, `ping`, `bounce`, …) nur an Elementen, die
 *      zeigen, dass gerade etwas läuft. Solche Elemente tragen das Attribut
 *      `data-laufanzeige` — in derselben Zeile, damit die Ausnahme dort steht,
 *      wo sie gilt, und nicht in einer Liste hier.
 *
 * `animate-spin` und `animate-loading-bar` fallen nicht unter Regel 3: Ein
 * Lade-Kreisel und ein Ladebalken sind ihrem Wesen nach Laufanzeigen.
 *
 * Keine Baseline. Eine Klasse, die nichts tut, ist ein Defekt, und alle
 * Dauer-Animationen waren beim Einführen dieses Wächters bereinigt.
 */

const SRC_DIR = join(process.cwd(), 'src');
const GLOBALS_CSS = join(SRC_DIR, 'styles', 'globals.css');

/** Was Tailwind ohne Konfiguration mitbringt. */
const TAILWIND_EINGEBAUT = ['spin', 'ping', 'pulse', 'bounce', 'none'];

/** Endlos laufend und deshalb nur an Laufanzeigen erlaubt. */
const DAUER = ['pulse', 'ping', 'bounce', 'float-glow', 'scan'];

const TAILWIND_ANIMATE = /(?<![\w:-])(fade|zoom|spin|slide)-(in|out)(-from-[a-z]+|-to-[a-z]+)?(-\d+)?(?![\w-])/g;
const ANIMATE_KLASSE = /(?<![\w-])animate-([a-z0-9-]+)(?![\w-])/g;

const getFilesRecursively = (dir: string): string[] =>
    readdirSync(dir).flatMap(entry => {
        const filePath = join(dir, entry);
        return lstatSync(filePath).isDirectory() ? getFilesRecursively(filePath) : [filePath];
    });

const toRelative = (filePath: string) => relative(SRC_DIR, filePath).split(sep).join('/');

/** Kommentare zählen nicht — dort darf über die Klassen gesprochen werden. */
const ohneKommentare = (code: string) =>
    code
        .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:"'`])\/\/.*$/gm, '$1');

const quelldateien = getFilesRecursively(SRC_DIR)
    .filter(f => /\.(ts|tsx)$/.test(f))
    .map(f => ({ pfad: toRelative(f), zeilen: ohneKommentare(readFileSync(f, 'utf8')).split(/\r?\n/) }));

const definiert = new Set([
    ...TAILWIND_EINGEBAUT,
    ...Array.from(readFileSync(GLOBALS_CSS, 'utf8').matchAll(/\.animate-([a-z0-9-]+)\s*\{/g), m => m[1]),
]);

describe('Animation Governance', () => {
    it('benutzt nur Animationen, die es gibt', () => {
        const tot: string[] = [];
        quelldateien.forEach(({ pfad, zeilen }) => zeilen.forEach((zeile, i) => {
            Array.from(zeile.matchAll(ANIMATE_KLASSE), m => m[1])
                .filter(name => !definiert.has(name))
                .forEach(name => tot.push(`${pfad}:${i + 1} animate-${name}`));
        }));
        expect(tot).toEqual([]);
    });

    it('benutzt keine Klassen aus tailwindcss-animate', () => {
        const fremd: string[] = [];
        quelldateien.forEach(({ pfad, zeilen }) => zeilen.forEach((zeile, i) => {
            Array.from(zeile.matchAll(TAILWIND_ANIMATE), m => m[0])
                .forEach(klasse => fremd.push(`${pfad}:${i + 1} ${klasse}`));
            if (/(?<![\w-])animate-in(?![\w-])/.test(zeile)) fremd.push(`${pfad}:${i + 1} animate-in`);
        }));
        expect(fremd).toEqual([]);
    });

    it('bewegt sich dauerhaft nur, wo gerade etwas läuft', () => {
        const dauerhaft: string[] = [];
        quelldateien.forEach(({ pfad, zeilen }) => zeilen.forEach((zeile, i) => {
            Array.from(zeile.matchAll(ANIMATE_KLASSE), m => m[1])
                .filter(name => DAUER.includes(name) && !zeile.includes('data-laufanzeige'))
                .forEach(name => dauerhaft.push(`${pfad}:${i + 1} animate-${name}`));
        }));
        expect(dauerhaft).toEqual([]);
    });
});
