import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Kein Weg ersetzt die geladene Sitzung ohne Sperre oder Rueckfrage (Layer 1)
 * 🚪🛡️
 *
 * Schuelerdaten leben in Koreki absichtlich NUR im Arbeitsspeicher
 * (architectural-vision §2, "Fidelity Guard"). Daraus folgt etwas, das in
 * anderen Programmen keine Rolle spielt: Es gibt kein Rueckgaengig. Was eine
 * Zuweisung ueberschreibt, ist endgueltig weg — kein Papierkorb, kein
 * Zwischenstand, keine Datenbank.
 *
 * Am 09.11.2026 standen VIER Wege offen, die genau das taten:
 *
 *   1. „Ändern" an der Musterloesung — tauschte die Aufgabenstruktur aus,
 *      nachdem Arbeiten korrigiert waren. Die vergebenen Punkte zeigten danach
 *      auf Aufgaben, die es nicht mehr gab. Der Knopf hat als EINZIGER von
 *      fuenf Stellen in derselben Karte die Sperre `isLocked` nicht beachtet.
 *   2. Jeder weitere Schueler-Upload — ersetzte die ganze Liste statt
 *      anzuhaengen. Wer eine Arbeit nachreichte, verlor dreissig.
 *   3. `.koreki`-Import — lief wortlos durch. Ein versehentlich mit abgelegtes
 *      `.koreki` im Schuelerstapel loeschte die laufende Korrektur.
 *   4. „Demo laden" in der Kopfzeile — ungesichert, einen Finger neben den
 *      Export-Knoepfen.
 *
 * Alle vier sahen im Quelltext unauffaellig aus. Keiner war ein Fehler in einer
 * Bedingung; es FEHLTE jeweils eine. Genau diese Fehlerklasse findet kein Review
 * und kein Typsystem — nur eine Liste, die vollstaendig sein muss.
 *
 * WIE DIESER WAECHTER ARBEITET
 * ----------------------------
 * Er zaehlt die Schreibstellen auf `setTasksLayout` und `setBatchFiles` je Datei
 * und vergleicht sie mit der Tabelle unten. Funktionale Aktualisierungen
 * (`setBatchFiles(prev => ...)`) zaehlen nicht mit: Sie schreiben den Bestand
 * fort, sie ersetzen ihn nicht.
 *
 * - Eine Datei mit Schreibstellen, die NICHT in der Tabelle steht, bricht den
 *   Test. Das ist der eigentliche Zweck: Ein neuer Weg zur Aufgabenstruktur
 *   muss eingeordnet werden, bevor er existiert.
 * - Eine Datei mit MEHR Stellen als eingetragen bricht den Test ebenfalls —
 *   sonst koennte eine ungesicherte Zuweisung neben einer gesicherten
 *   mitfahren.
 * - Jede Datei, die ERSETZT, muss eines ihrer eingetragenen Tore im Quelltext
 *   fuehren.
 *
 * GRENZE DIESES WAECHTERS, ausdruecklich benannt
 * ---------------------------------------------
 * Er prueft je DATEI, nicht je Funktion. Enthaelt eine Datei zwei Wege und nur
 * einer traegt das Tor, sieht er das nicht. Deshalb steht in der Tabelle bei
 * jeder Datei, welche Funktion welches Tor traegt — die Spalte `wege` ist die
 * Stelle, an der ein Mensch das noch einmal lesen muss. Eine Pruefung je
 * Funktion braeuchte einen Parser; das waere mehr Maschinerie als Nutzen, und
 * die Zaehlung oben faengt den Fall, auf den es ankommt: einen NEUEN Weg.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Was eine Zuweisung an der Aufgabenstruktur oder am Arbeitsstapel ist.
 *
 * Die negative Vorschau schliesst die funktionale Form aus — `(prev: X) =>`,
 * `prev =>`, `prevTasks =>`. Sie bekommt den alten Wert und gibt einen neuen
 * zurueck; wer so schreibt, kann den Bestand nicht uebersehen.
 *
 * Das `\w*` im Namen ist noetig: Eine Wortgrenze nach `prev` liess
 * `setTasksLayout(prevTasks => ...)` durchfallen, denn zwischen `prev` und
 * `Tasks` liegt keine — zwei gesunde Stellen wurden als neuer Weg gemeldet.
 * Verlangt wird deshalb der Pfeil, nicht der genaue Name.
 */
const RE_ZUWEISUNG = /\bset(?:TasksLayout|BatchFiles)\s*\(\s*(?!\(|prev\w*\s*=>)/g;

interface Weg {
    /** Zahl der ersetzenden Schreibstellen. NUR SENKEN — s. Kopf. */
    stellen: number;
    /**
     * Zeichenfolgen, von denen MINDESTENS eine im Quelltext stehen muss.
     * `null` heisst: Diese Datei ersetzt nichts, `grund` sagt warum.
     */
    tore: string[] | null;
    /** Welche Funktion welches Tor traegt — bzw. warum keines noetig ist. */
    wege: string;
}

const WEGE: Record<string, Weg> = {
    'pages/app.tsx': {
        stellen: 3,
        tore: ['askConfirmation', 'korrekturLaeuft'],
        wege:
            '`handleStartNew` leert Stapel und Struktur und fragt vorher (askConfirmation). ' +
            '`korrekturLaeuft` geht als `isLocked` ins Upload-Gitter. ' +
            'ACHTUNG, von Hand geprueft: `onReExtractLayout` (Zeile ~322) ersetzt die Struktur ' +
            'und ist NUR in der Oberflaeche gesperrt (`disabled={extractingLayout || isLocked}`). ' +
            'Das ist vertretbar, weil die neue Struktur aus der GELADENEN Musterloesung ' +
            'abgeleitet wird — der Knopf heisst „Aktualisieren" und nennt seinen Credit-Preis. ' +
            'Wird daraus je ein zweiter Aufrufweg, gehoert das Tor in den Hook.'
    },
    'hooks/file-processor/useBatchActions.ts': {
        stellen: 4,
        tore: ['askConfirmation'],
        wege:
            '`handleKorekiImport` ersetzt die ganze Sitzung und fragt vorher. ' +
            '`handleStudentUpload` ersetzt NICHT — es haengt an (`fuegeArbeitenHinzu`), ' +
            'der Bestand steckt im uebergebenen Wert. ' +
            '`handleRelinkFiles` ersetzt NICHT — `verknuepfeDateien` gibt den ganzen Bestand ' +
            'zurueck und setzt nur fehlende Dateien ein.'
    },
    'hooks/useDemoScenario.ts': {
        stellen: 2,
        tore: ['askConfirmation'],
        wege: '`loadDemoData` ersetzt alles und fragt, sobald es etwas zu verlieren gibt.'
    },
    'hooks/useFileProcessor.ts': {
        stellen: 4,
        tore: null,
        wege:
            'Drei Stellen leiten vom Bestand ab (`handlePDFTypeSelect` zweimal, `executeSplit` — ' +
            'alle bauen aus `batchFiles` einen neuen Stand). Die zweite davon ist der ' +
            'Abbruch-Zweig in `handlePDFTypeSelect`: Er entfernt genau die Arbeiten, deren ' +
            'Typfrage noch offen ist (`pdfTypeQueue`), und laesst die bereits beantworteten ' +
            'stehen. Er braucht kein Tor, er IST eines — der Knopf heisst „Abbrechen", und ' +
            'abgebrochen wird der gerade laufende Upload, nicht die Sitzung. Verarbeitet ' +
            'wurde zu dem Zeitpunkt noch nichts. Die vierte, `handleModelUpload`, ersetzt ' +
            'die Struktur — ihr Tor steht aber im Aufrufer `useMusterloesungAnnahme` ' +
            '(Sperre UND Rueckfrage). Das ist Absicht: Dieser Hook ist der Motor, nicht die ' +
            'Tuer. Ein zweiter Aufrufer muesste durch dieselbe Tuer.'
    },
    'components/dashboard/DashboardModals.tsx': {
        stellen: 1,
        tore: null,
        wege: 'Schreibt die geladene Struktur fort (`updatedTasks`), ersetzt sie nicht.'
    },
    'hooks/skills/useCustomSkillCrud.ts': {
        stellen: 1,
        tore: null,
        wege: 'Haengt einen Skill an die geladene Struktur (`updatedTasks`).'
    }
};

/** Die Tuer zur Musterloesung. Sie MUSS beide Tore fuehren, nicht eines. */
const ANNAHME_DATEI = 'hooks/useMusterloesungAnnahme.ts';
const ANNAHME_TORE = ['gesperrt', 'askConfirmation'];

const dateienUnter = (dir: string): string[] =>
    readdirSync(dir).flatMap(eintrag => {
        const pfad = join(dir, eintrag);
        return lstatSync(pfad).isDirectory() ? dateienUnter(pfad) : [pfad];
    });

const relativ = (pfad: string) => relative(SRC_DIR, pfad).split(sep).join('/');

/** Kommentare raus, bevor gezaehlt wird — die Begruendungen hier zitieren Code. */
const ohneKommentare = (inhalt: string) =>
    inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Session Replacement Governance', () => {
    const quellen = dateienUnter(SRC_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    /** Datei -> Zahl der ersetzenden Schreibstellen (nur Dateien mit mindestens einer). */
    const gemessen = new Map<string, number>();
    for (const pfad of quellen) {
        const treffer = ohneKommentare(readFileSync(pfad, 'utf8')).match(RE_ZUWEISUNG);
        if (treffer && treffer.length > 0) gemessen.set(relativ(pfad), treffer.length);
    }

    it('kennt jeden Weg, der Aufgabenstruktur oder Arbeitsstapel ersetzt', () => {
        const unbekannt: string[] = [];
        const gewachsen: string[] = [];

        gemessen.forEach((stellen, datei) => {
            const weg = WEGE[datei];
            if (!weg) {
                unbekannt.push(`${datei}: ${stellen} Schreibstelle(n)`);
                return;
            }
            if (stellen > weg.stellen) {
                gewachsen.push(`${datei}: ${stellen} statt ${weg.stellen} Schreibstelle(n)`);
            }
        });

        if (unbekannt.length > 0 || gewachsen.length > 0) {
            throw new Error(
                'NEUER WEG ZUR AUFGABENSTRUKTUR — er muss in WEGE eingeordnet werden:\n' +
                [...unbekannt, ...gewachsen].map(z => `  - ${z}`).join('\n') +
                '\n\nFrage zur Einordnung: Kann diese Zuweisung geladene Arbeit vernichten?\n' +
                'JA  -> Sperre (wenn schon korrigiert wird) oder Rueckfrage (sonst) ergaenzen,\n' +
                '       Tor in WEGE eintragen. Vorbild: useMusterloesungAnnahme.\n' +
                'NEIN -> Mit `tore: null` und einer Begruendung in `wege` eintragen, die SAGT,\n' +
                '       woher der neue Wert kommt. „Ist schon in Ordnung" ist keine.\n\n' +
                'Schuelerdaten leben nur im Arbeitsspeicher. Es gibt kein Rueckgaengig.'
            );
        }
    });

    it('verlangt an jedem ersetzenden Weg ein Tor', () => {
        const ohneTor: string[] = [];

        Object.entries(WEGE).forEach(([datei, weg]) => {
            if (weg.tore === null) return;
            const inhalt = readFileSync(join(SRC_DIR, datei), 'utf8');
            if (!weg.tore.some(tor => inhalt.includes(tor))) {
                ohneTor.push(`${datei}: keines von [${weg.tore.join(', ')}] steht im Quelltext`);
            }
        });

        const annahme = readFileSync(join(SRC_DIR, ANNAHME_DATEI), 'utf8');
        for (const tor of ANNAHME_TORE) {
            if (!annahme.includes(tor)) {
                ohneTor.push(
                    `${ANNAHME_DATEI}: „${tor}" fehlt. Diese Tuer braucht BEIDE Tore — ` +
                    `die Sperre waehrend einer Korrektur UND die Rueckfrage davor.`
                );
            }
        }

        if (ohneTor.length > 0) {
            throw new Error('TOR FEHLT:\n  - ' + ohneTor.join('\n  - '));
        }
    });

    it('verlangt, dass geschlossene Wege die Tabelle verlassen', () => {
        const verwaist = Object.keys(WEGE).filter(datei => !gemessen.has(datei));
        if (verwaist.length > 0) {
            throw new Error(
                'WEGE nennt Dateien ohne Schreibstelle — Eintrag entfernen:\n  - ' +
                verwaist.join('\n  - ')
            );
        }
    });
});
