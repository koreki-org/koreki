import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Wächter über Rückfragen und Meldungen
 * 🗣️🔔🛡️
 *
 * WARUM ES DIESEN TEST GIBT
 * -------------------------
 * Koreki hat mit `ConfirmationModal` einen eigenen Dialog für Rückfragen und
 * mit `lib/notify` eigene Meldungen. Über Monate liefen beide trotzdem über den
 * Browser — zuletzt sogar die Konto-Löschung, also die folgenreichste Aktion
 * des Produkts. Der Browser-Kasten sieht aus wie eine Meldung des
 * Betriebssystems, trägt keine Warnfarbe und lässt sich weder gestalten noch
 * übersetzen: eine belanglose Nachfrage sieht darin genauso aus wie ein
 * endgültiger Verlust.
 *
 * Das ist keine Regel, die man einmal aufräumt. Sie driftet zurück, sobald
 * jemand schnell etwas fragen oder melden will — der Browser-Kasten ist immer
 * zur Hand und immer einen Federstrich billiger.
 *
 * ZWEI SCHREIBWEISEN
 * ------------------
 * `window.confirm(...)` und das blanke `confirm(...)` sind dasselbe. Die erste
 * Fassung dieses Wächters kannte nur die lange Form und bestand deshalb,
 * obwohl zehn Aufrufe der kurzen Form im Baum standen. Beide werden gezählt.
 *
 * KEINE RATSCHE MEHR
 * ------------------
 * Bis zum 25.08.2026 stand hier ein eingefrorener Altbestand: zehn
 * `confirm(`-Aufrufe in der Admin- und Instituts-Verwaltung und in drei
 * Einstellungs-Widgets, die nur schrumpfen durften. Sie sind abgetragen. Beide
 * Zahlen stehen jetzt auf null, und dabei soll es bleiben — eine Ratsche über
 * einem leeren Bestand wäre nur noch Gerüst.
 */

const SRC_DIR = join(process.cwd(), 'src');

const alleQuellen = (dir: string): string[] =>
    readdirSync(dir).flatMap(eintrag => {
        const pfad = join(dir, eintrag);
        return lstatSync(pfad).isDirectory() ? alleQuellen(pfad) : [pfad];
    });

/** Zählt Aufrufe eines Browser-Dialogs — die lange Form und die kurze. */
const zaehleAufrufe = (quelle: string, name: string): number => {
    const lang = new RegExp(String.raw`window\.${name}\s*\(`, 'g');
    const kurz = new RegExp(String.raw`(?<![.\w])${name}\s*\(`, 'g');

    return quelle.split('\n')
        // Der Kommentar, der die Entscheidung begründet, darf den Namen nennen —
        // sonst ließe sich die Regel nicht erklären.
        .filter(zeile => !/^\s*(\/\/|\*|\/\*)/.test(zeile))
        .reduce((summe, zeile) => summe
            + (zeile.match(lang)?.length ?? 0)
            + (zeile.match(kurz)?.length ?? 0), 0);
};

const zaehleJeDatei = (name: string) =>
    alleQuellen(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
        .map(pfad => ({
            datei: relative(SRC_DIR, pfad).split(sep).join('/'),
            anzahl: zaehleAufrufe(readFileSync(pfad, 'utf8'), name)
        }))
        .filter(e => e.anzahl > 0);

const ERSATZ: Record<string, string> = {
    confirm: '`askConfirmation` bzw. `confirmOverwrite` aus lib/confirm-dialog',
    alert: '`meldeErfolg` / `meldeHinweis` / `meldeFehler` aus lib/notify'
};

describe('Browser-Dialoge sind abgeschafft', () => {
    it.each(['confirm', 'alert'])('%s() kommt nirgends mehr vor', (name) => {
        const verstoesse = zaehleJeDatei(name);

        if (verstoesse.length > 0) {
            throw new Error(
                `${name}() statt des Projekt-Dialogs:\n  - `
                + verstoesse.map(e => `${e.datei} (${e.anzahl}x)`).join('\n  - ')
                + `\n\n  ${ERSATZ[name]} nutzen.`
            );
        }
    });

    /**
     * Ein Wirt, den niemand montiert, verschluckt jede Rückfrage und jede
     * Meldung — lautlos, was die unangenehmste Art des Verschwindens ist.
     */
    it('hält beide Wirte in _app montiert', () => {
        const app = readFileSync(join(SRC_DIR, 'pages', '_app.tsx'), 'utf8');

        expect(app).toContain('<ConfirmationHost />');
        expect(app).toContain('<ToastHost />');
    });

    /** Findet der Wächter keine Quellen mehr, winkt er ab da alles durch. */
    it('sieht überhaupt Quelldateien', () => {
        const quellen = alleQuellen(SRC_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
        expect(quellen.length).toBeGreaterThan(100);
    });
});
