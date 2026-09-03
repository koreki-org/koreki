/**
 * Waechter: Die Compliance-Landkarte zeigt auf Dateien, die es gibt.
 *
 * ANLASS (03.09.2026). Die Unterlagen zur KI-Verordnung lagen ueber vier Orte verteilt —
 * `internal/compliance/`, `docs/internal/`, `src/legal/`, `docs/technical/`. Niemand
 * konnte sagen, welche Anforderung wo beantwortet ist. Beim Zusammenfuehren zeigte sich
 * die Folge: FUENF `[OFFEN]`-Markierungen in der technischen Dokumentation nannten
 * Dinge als fehlend, die am selben Tag erledigt worden waren. Das Dokument hatte es
 * nicht mitbekommen, weil dieselbe Tatsache an drei Stellen ohne Verbindung stand.
 *
 * `compliance/README.md` ist die Antwort darauf: eine Tabelle, die jede Anforderung auf
 * ihre Fundstelle abbildet. Sie taugt aber nur, solange sie stimmt — eine Landkarte mit
 * toten Verweisen ist schlimmer als keine, weil man ihr glaubt.
 *
 * DIE REGEL. Jeder relative Verweis aus der Landkarte zeigt auf eine vorhandene Datei
 * oder ein vorhandenes Verzeichnis. Und jede Anforderung, fuer die es ein eigenes
 * Dokument gibt, kommt in der Tabelle vor.
 *
 * NICHT GEDECKT. Ob die Angabe im Feld "Stand" zutrifft. Das kann kein Test wissen —
 * dafuer gibt es die Durchsichten. Geprueft wird nur, dass die Landkarte niemanden ins
 * Leere schickt.
 *
 * UEBERSPRUNGEN, wenn `compliance/` fehlt: Das Verzeichnis ist derzeit nicht Teil des
 * oeffentlichen Repositorys (siehe .gitignore). Ein Klon ohne die Unterlagen soll nicht
 * rot werden — wer sie hat, wird geprueft.
 */
import * as fs from 'fs';
import * as path from 'path';

const WURZEL = process.cwd();
const VERZEICHNIS = path.join(WURZEL, 'compliance');
const LANDKARTE = path.join(VERZEICHNIS, 'README.md');

const vorhanden = fs.existsSync(LANDKARTE);
const beschreibe = vorhanden ? describe : describe.skip;

/** Alle relativen Markdown-Verweise aus der Landkarte. */
function verweise(): { ziel: string; zeile: number }[] {
    const zeilen = fs.readFileSync(LANDKARTE, 'utf-8').split('\n');
    const gefunden: { ziel: string; zeile: number }[] = [];
    zeilen.forEach((zeile, i) => {
        const muster = /\]\(([^)]+)\)/g;
        let treffer: RegExpExecArray | null;
        while ((treffer = muster.exec(zeile)) !== null) {
            const ziel = treffer[1];
            if (/^https?:/.test(ziel) || ziel.startsWith('#')) continue;
            gefunden.push({ ziel: ziel.split('#')[0], zeile: i + 1 });
        }
    });
    return gefunden;
}

beschreibe('Compliance-Landkarte', () => {
    it('verweist ausschliesslich auf vorhandene Dateien', () => {
        const tot = verweise().filter(v => !fs.existsSync(path.resolve(VERZEICHNIS, v.ziel)));

        if (tot.length > 0) {
            throw new Error(
                'Die Landkarte in compliance/README.md zeigt ins Leere:\n  - ' +
                tot.map(v => `Zeile ${v.zeile}: ${v.ziel}`).join('\n  - ') +
                '\nEntweder wurde eine Datei verschoben, ohne die Landkarte mitzuziehen, ' +
                'oder sie verweist auf etwas, das nie angelegt wurde.'
            );
        }
    });

    /**
     * Die Landkarte ist nur nuetzlich, wenn sie vollstaendig ist. Ein Dokument, das eine
     * Anforderung beantwortet, ohne dass die Tabelle es kennt, ist fuer einen Pruefer
     * nicht auffindbar — und genau das war der Zustand vor dem 03.09.2026.
     */
    it('kennt jedes Dokument des Verzeichnisses', () => {
        const text = fs.readFileSync(LANDKARTE, 'utf-8');
        const dokumente = fs.readdirSync(VERZEICHNIS)
            .filter(n => n.endsWith('.md') && n !== 'README.md');

        const unerwaehnt = dokumente.filter(n => !text.includes(n));

        if (unerwaehnt.length > 0) {
            throw new Error(
                'Diese Dokumente liegen in compliance/, kommen in der Landkarte aber nicht vor:\n  - ' +
                unerwaehnt.join('\n  - ') +
                '\nEntweder in die Tabelle aufnehmen oder loeschen. Ein Dokument, das niemand ' +
                'findet, ist kein Nachweis.'
            );
        }
    });

    /**
     * Die Nachweis-Verzeichnisse muessen ausfuehrbar bleiben, sonst sind es Behauptungen.
     *
     * Geprueft wird, dass die Landkarte fuer jedes Verzeichnis einen `npm run`-Aufruf
     * nennt, den es in `package.json` wirklich gibt. Wo der Laeufer liegt, ist dabei
     * gleichgueltig: Die Determinismus-Faelle sind eine Sammlung unter `nachweise/`,
     * ausgefuehrt werden sie von `tests/integration/`. Was zaehlt, ist dass jemand den
     * Nachweis starten kann — nicht, dass das Skript im selben Ordner wohnt.
     */
    it('nennt fuer jeden Nachweis einen lauffaehigen Aufruf', () => {
        const text = fs.readFileSync(LANDKARTE, 'utf-8');
        const nachweise = path.join(VERZEICHNIS, 'nachweise');
        if (!fs.existsSync(nachweise)) return;

        const skripte = JSON.parse(
            fs.readFileSync(path.join(WURZEL, 'package.json'), 'utf-8')
        ).scripts as Record<string, string>;

        /** Die Zeile der Landkarte, die dieses Verzeichnis nennt. */
        const zeileZu = (name: string): string =>
            text.split('\n').find(z => z.includes(`nachweise/${name}/`)) ?? '';

        const ohneAufruf = fs.readdirSync(nachweise, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .filter(e => {
                const zeile = zeileZu(e.name);
                const muster = /npm run ([\w:-]+)/g;
                const genannt: string[] = [];
                let treffer: RegExpExecArray | null;
                while ((treffer = muster.exec(zeile)) !== null) genannt.push(treffer[1]);
                return genannt.length === 0 || !genannt.some(n => n in skripte);
            })
            .map(e => e.name);

        if (ohneAufruf.length > 0) {
            throw new Error(
                'Fuer diese Nachweis-Verzeichnisse nennt die Landkarte keinen lauffaehigen ' +
                'npm-Aufruf:\n  - ' + ohneAufruf.join('\n  - ') +
                '\nEin Nachweis, den niemand starten kann, ist eine Behauptung.'
            );
        }
    });
});
