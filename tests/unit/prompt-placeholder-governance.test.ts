import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';
import { setzeEin } from '../../src/lib/prompt-placeholder';

/**
 * Wächter: Prompt-Platzhalter werden wörtlich eingesetzt
 * 🔤🧯
 *
 * `String.replace` behandelt den ERSATZTEXT als Muster. `$&`, `` $` ``, `$'`
 * und `$$` haben dort Sonderbedeutung — auch dann, wenn das Suchmuster eine
 * schlichte Zeichenkette ist. Wer Schülertext, Musterlösung oder die
 * Anweisungen der Lehrkraft direkt als Ersatztext übergibt, gibt diesen
 * Inhalten Kontrolle über den Aufbau des Prompts.
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026: An einunddreißig Einsetzstellen in drei
 * Dateien stand die ungeschützte Form. Die Regel galt an keiner einzigen —
 * nicht, weil jemand sie gebrochen hätte, sondern weil niemand die
 * Geschwister nebeneinander gelegt hat. Genau die wiederkehrende Fehlerklasse
 * dieses Projekts.
 *
 * Deshalb dieser Wächter statt eines Kommentars: Die Reparatur selbst ist
 * einzeilig, das Problem ist ihre Vollständigkeit.
 *
 * Erlaubt ist ausschließlich `setzeEin` aus `src/lib/prompt-placeholder.ts`.
 */

const SRC_DIR = join(process.cwd(), 'src');

/** Die Datei, die die Ersetzung selbst implementiert. */
const IMPLEMENTIERUNG = 'lib/prompt-placeholder.ts';

/** `.replace('{{x}}', …)`, `.replace("{{x}}", …)` und `.replace(/{{x}}/g, …)` */
const UNGESCHUETZT = /\.replace\s*\(\s*(?:['"`]|\/)\s*\{\{/;

const dateienUnter = (dir: string): string[] => {
    let treffer: string[] = [];
    readdirSync(dir).forEach(eintrag => {
        const pfad = join(dir, eintrag);
        treffer = lstatSync(pfad).isDirectory()
            ? treffer.concat(dateienUnter(pfad))
            : treffer.concat(pfad);
    });
    return treffer;
};

const relativ = (pfad: string) => relative(SRC_DIR, pfad).split(sep).join('/');

describe('Prompt-Platzhalter-Governance', () => {
    it('setzt Platzhalter nirgends per String.replace ein', () => {
        const verstoesse: string[] = [];

        dateienUnter(SRC_DIR)
            .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
            .filter(f => relativ(f) !== IMPLEMENTIERUNG)
            .forEach(pfad => {
                readFileSync(pfad, 'utf8').split('\n').forEach((zeile, i) => {
                    if (UNGESCHUETZT.test(zeile)) {
                        verstoesse.push(`${relativ(pfad)}:${i + 1} — ${zeile.trim().slice(0, 90)}`);
                    }
                });
            });

        if (verstoesse.length > 0) {
            throw new Error(
                'PLATZHALTER-GOVERNANCE: Platzhalter per String.replace eingesetzt.\n'
                + 'Im Ersatztext haben $& $` $\' $$ Sonderbedeutung — Schülertext könnte damit\n'
                + 'den Aufbau des Prompts steuern. Stattdessen `setzeEin` aus\n'
                + '`src/lib/prompt-placeholder.ts` verwenden.\n  - '
                + verstoesse.join('\n  - ')
            );
        }
    });
});

describe('setzeEin', () => {
    /**
     * Die vier Zeichenfolgen, die `String.replace` im Ersatztext deutet. Sie
     * stehen hier einzeln, weil jede eine andere Art von Schaden anrichtet.
     */
    it.each([
        ['$$', 'LaTeX-Formelblock', 'Loesung: $$E = mc^2$$ fertig'],
        ['$&', 'Platzhalter erscheint wieder', 'Regex: s/foo/$&/g'],
        ['$`', 'alles davor wird kopiert', 'Shell: cmd $` ende'],
        ["$'", 'alles danach wird kopiert', "Shell: $' als Konstrukt"]
    ])('setzt %s woertlich ein (%s)', (_zeichen, _was, text) => {
        const ergebnis = setzeEin('VORHER {{x}} NACHHER', '{{x}}', text);

        expect(ergebnis).toBe(`VORHER ${text} NACHHER`);
    });

    /**
     * Der ernste Fall in Worten: In den Prompt-Vorlagen folgt auf die
     * Einsetzstelle das schließende `</task_to_evaluate>`. Mit `String.replace`
     * ließ ein Schüler, der `$'` schreibt, dieses Endetag mitten in seiner
     * eigenen Antwort erscheinen.
     */
    it('laesst Schuelertext kein Struktur-Markup erzeugen', () => {
        const vorlage = '<antwort>{{studentText}}</antwort>';
        const schuelertext = "Ich schrieb $' und dann weiter.";

        const ergebnis = setzeEin(vorlage, '{{studentText}}', schuelertext);
        const inhalt = ergebnis.slice('<antwort>'.length, -'</antwort>'.length);

        expect(inhalt).toBe(schuelertext);
        expect(inhalt).not.toContain('</antwort>');
        // Zum Vergleich: So sah es vorher aus.
        expect(vorlage.replace('{{studentText}}', schuelertext)).toContain('</antwort> und dann weiter.');
    });

    it('ersetzt ALLE Vorkommen, nicht nur das erste', () => {
        expect(setzeEin('{{x}} und {{x}}', '{{x}}', 'A')).toBe('A und A');
    });

    it('laesst eine Vorlage ohne den Platzhalter unveraendert', () => {
        expect(setzeEin('nichts zu tun', '{{x}}', 'A')).toBe('nichts zu tun');
    });
});
