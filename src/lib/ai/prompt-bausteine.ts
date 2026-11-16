/**
 * Bausteine: Regeln, die in mehreren Prompts gelten, stehen genau einmal.
 * 🧱
 *
 * ANLASS (16.11.2026). Die Regel "Formeln in `$...$` einschliessen" stand nur im
 * Prompt der Musterloesung. Bilderkennung und Zuordnung der Schuelerarbeiten
 * verlangten LaTeX, aber keine Delimiter — ob eine Formel in der Pruefansicht
 * lesbar war oder als `\frac{U}{R_C}` dastand, entschied das Modell von Fall zu
 * Fall. Dieselbe Fehlerklasse wie bei den Profil-Familien: eine Regel, die in
 * einem Pfad gilt und im parallelen fehlt.
 *
 * Eine Vorlage schreibt `{{baustein:name}}`; `mitBausteinen` setzt den Inhalt
 * von `src/prompts/core/default/bausteine/name.md` ein. Welche Vorlagen welchen
 * Baustein tragen muessen, legt `tests/unit/prompt-baustein-governance.test.ts`
 * fest.
 *
 * Anders als `eintragungen.ts`: Jene Regeln werden je nach Text AN- oder
 * ABgehaengt. Ein Baustein steht immer da, an der Stelle, die die Vorlage
 * bestimmt.
 */
import formeln from '../../prompts/core/default/bausteine/formeln.md';
import tabellen from '../../prompts/core/default/bausteine/tabellen.md';
import { setzeEin } from '../prompt-placeholder';

export const BAUSTEINE: Readonly<Record<string, string>> = { formeln, tabellen };

const PLATZHALTER = /\{\{baustein:([a-z0-9-]+)\}\}/g;

/**
 * Setzt alle Bausteine einer Vorlage ein.
 *
 * Ein unbekannter Name wirft, statt still stehenzubleiben: Ein
 * `{{baustein:formln}}` im fertigen Prompt waere eine fehlende Regel, die
 * niemand bemerkt.
 */
export function mitBausteinen(vorlage: string): string {
    const namen = Array.from(vorlage.matchAll(PLATZHALTER), m => m[1]);
    return namen.reduce((ergebnis, name) => {
        const inhalt = BAUSTEINE[name];
        if (inhalt === undefined) throw new Error(`Unbekannter Prompt-Baustein: "${name}"`);
        // `setzeEin` ersetzt alle Vorkommen — ein doppelter Name findet danach nichts mehr.
        return setzeEin(ergebnis, `{{baustein:${name}}}`, inhalt.trim());
    }, vorlage);
}
