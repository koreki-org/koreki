import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Ratsche für Flächen, Farben und Abgrenzungsmittel
 * 🎨🛡️
 *
 * Anlass war ein Befund vom 07.09.2026: Seite und Karte rendern beide
 * `rgb(248,249,252)` — exakt dieselbe Farbe. Eine Karte hob sich durch nichts
 * ab ausser ihrem Rand, und der liegt bei 1,18:1 gegen den Hintergrund.
 *
 * Die Ursache war eine tote Klasse. In `tailwind.config.js` gab es unter `card`
 * nur `card-padding` — einen Abstand, keine Farbe. Die sechzehn Stellen mit
 * `bg-card` setzten damit GAR NICHTS und fielen still auf transparent zurück.
 * Kein Fehler, keine Warnung, kein Build-Abbruch: eine Klasse, die es nicht
 * gibt, tut in Tailwind einfach nichts.
 *
 * Daraus folgte die zweite Fehlerklasse. Wo Fläche UND Rand nichts trennen,
 * wird nicht klarer getrennt, sondern gestapelt: An einem einzigen Element
 * standen Rand UND Flächentönung UND Schatten UND Ring nebeneinander — vier
 * Wege, dieselbe Aussage zu machen, weil keiner davon allein sichtbar war.
 *
 * GEPRUEFT WIRD DESHALB:
 *   1. Jede `bg-*`-Klasse verweist auf eine Farbe, die es wirklich gibt.
 *   2. Farben kommen aus Tokens, nicht aus der Tailwind-Palette.
 *   3. Kein Element benutzt vier Abgrenzungsmittel gleichzeitig.
 *   4. Keine Hover-Flaeche, die auf dem Seitengrund unsichtbar ist.
 *
 * RATSCHEN-PRINZIP (Regeln 2 und 3):
 * - Neue Dateien halten die Regel.
 * - Die Altfälle sind eingefroren und dürfen nur schrumpfen.
 * - Wer eine repariert, nimmt sie aus der Liste.
 *
 * Regeln 1 und 4 haben bewusst KEINE Baseline. Eine Klasse, die nichts tut, ist
 * kein Geschmack und kein Kompromiss, sondern ein Defekt.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Altlasten mit hartcodierten Palettenfarben, eingefroren am 08.09.2026.
 * NUR ENTFERNEN, NIE ERGAENZEN.
 *
 * `grading-memory-characters.ts` bildet Schweregrade auf Abzeichen-Farben ab
 * (`bg-rose-50 text-rose-600`). Fachlich richtig ist dort `bg-destructive/10
 * text-destructive`; der Umbau ändert aber das Aussehen eines Bereichs, der
 * beim Fund nicht angesehen wurde. Deshalb eingefroren statt still geändert.
 */
const HARTE_FARBEN_BASELINE: string[] = [
    'lib/grading-memory-characters.ts',
    'components/guards/AuthGuard.tsx',
    'pages/login.tsx',
];

/**
 * Altlasten mit vier Abgrenzungsmitteln an einem Element, eingefroren am
 * 08.09.2026. NUR ENTFERNEN, NIE ERGAENZEN.
 *
 * Die Kopfleiste trägt `bg-card/70` + `border` + `shadow-xl` + `ring-1`. Sie
 * ist als schwebende Glas-Leiste gedacht, und Glasmorphismus ist für schwebende
 * Elemente ausdrücklich erlaubt (`koreki-design-system` §1) — vier Mittel
 * bleiben trotzdem drei zu viel. Eine der beiden Stellen hebt ausserdem alles
 * ab `md:` wieder auf (`md:border-0 md:shadow-none md:ring-0`), gilt also nur
 * mobil. Der Umbau der Navigation war nicht Teil des Auftrags.
 */
const VIER_MITTEL_BASELINE: string[] = [
    'components/layout/AppHeader.tsx',
];

/**
 * `bg-*`-Klassen, die keine Farbe meinen. Tailwind benutzt dasselbe Präfix für
 * Zuschnitt, Wiederholung, Position und Verläufe.
 */
const BG_OHNE_FARBE = /^(clip|origin|repeat|blend|gradient|opacity|size|image|position|none|cover|contain|auto|center|top|bottom|left|right|fixed|local|scroll)(-|$)/;

/** Farbwörter, die Tailwind immer kennt, unabhängig von der Konfiguration. */
const EINGEBAUTE_FARBEN = ['transparent', 'current', 'inherit', 'white', 'black'];

const PALETTE = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
    'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
    'purple', 'fuchsia', 'pink', 'rose',
].join('|');

const RE_HARTE_FARBE = new RegExp(
    `(?:^|\\s|:)(?:bg|text|border|ring|from|to|via|divide|shadow|fill|stroke)-(?:${PALETTE})-[0-9]{2,3}`
);

/**
 * Liest die erlaubten Farbnamen aus der Konfiguration statt sie zu doppeln.
 * Verschachtelte Einträge (`primary.DEFAULT`, `primary.foreground`) werden zu
 * `primary` und `primary-foreground` — genau den Klassen, die Tailwind erzeugt.
 */
function erlaubteFarben(): Set<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(join(process.cwd(), 'tailwind.config.js'));
    const farben = config?.theme?.extend?.colors ?? {};
    const namen = new Set<string>(EINGEBAUTE_FARBEN);
    for (const [name, wert] of Object.entries(farben)) {
        if (typeof wert === 'string') {
            namen.add(name);
            continue;
        }
        for (const unter of Object.keys(wert as Record<string, unknown>)) {
            namen.add(unter === 'DEFAULT' ? name : `${name}-${unter}`);
        }
    }
    // `bg-` bedient auch Verlaufsbilder. Ohne diese Namen schluege ein spaeter
    // ergaenzter Verlauf hier faelschlich als tote Klasse an.
    for (const name of Object.keys(config?.theme?.extend?.backgroundImage ?? {})) {
        namen.add(name);
    }
    return namen;
}

/**
 * Schneidet ab, was beim groben Zerlegen einer Zeile mitkommt: schliessende
 * Anfuehrungszeichen, Klammern, Kommas. Ohne das meldet der Waechter
 * `bg-muted')}` als tote Klasse — und wer drei solche Meldungen liest, schaltet
 * beim vierten Mal nicht mehr hin.
 */
function saeubern(roh: string): string {
    return roh.replace(/^[^A-Za-z0-9_-]+/, '').replace(/[^A-Za-z0-9_\-\]/.]+$/, '');
}

/**
 * Liest Zeichenketten aus einer Zeile. Eine Kette endet nur auf DEMSELBEN
 * Anführungszeichen, mit dem sie begann — schliesst man auf jedem beliebigen,
 * verschiebt ein Apostroph im Fliesstext die Paarung für den Rest der Datei.
 * Genau dieser Fehler liess am 07.09.2026 achtzehn Fundstellen durchrutschen.
 */
function ketten(zeile: string): string[] {
    const gefunden: string[] = [];
    let i = 0;
    while (i < zeile.length) {
        const zeichen = zeile[i];
        if (zeichen === '"' || zeichen === "'" || zeichen === '`') {
            let j = i + 1;
            while (j < zeile.length && zeile[j] !== zeichen) {
                if (zeile[j] === '\\') j++;
                j++;
            }
            if (j < zeile.length) gefunden.push(zeile.slice(i + 1, j));
            i = j + 1;
        } else {
            i++;
        }
    }
    return gefunden;
}

function dateien(verzeichnis: string, gesammelt: string[] = []): string[] {
    for (const eintrag of readdirSync(verzeichnis)) {
        const pfad = join(verzeichnis, eintrag);
        if (lstatSync(pfad).isDirectory()) dateien(pfad, gesammelt);
        else if (/\.tsx?$/.test(eintrag)) gesammelt.push(pfad);
    }
    return gesammelt;
}

const relativ = (pfad: string) => relative(SRC_DIR, pfad).split(sep).join('/');

/** Entfernt Zustands- und Breakpoint-Präfixe sowie den Deckkraft-Zusatz. */
function reineKlasse(klasse: string): string {
    const ohnePraefix = klasse.split(':').pop() ?? klasse;
    return ohnePraefix.split('/')[0];
}

describe('Flächen-Governance (koreki-design-system)', () => {
    const alleDateien = dateien(SRC_DIR);

    it('findet ueberhaupt Quelldateien', () => {
        expect(alleDateien.length).toBeGreaterThan(50);
    });

    it('laesst keine bg-Klasse zu, die auf gar keine Farbe zeigt', () => {
        const erlaubt = erlaubteFarben();
        const treffer: string[] = [];

        for (const datei of alleDateien) {
            const zeilen = readFileSync(datei, 'utf8').split(/\r?\n/);
            zeilen.forEach((zeile, index) => {
                for (const kette of ketten(zeile)) {
                    for (const teil of kette.split(/\s+/)) {
                        // Zusammengesetzte Klassennamen sind zur Bauzeit nicht
                        // lesbar — Tailwind sieht sie auch nicht und erzeugt fuer
                        // sie nichts. Das ist ein eigenes Problem, nicht dieses.
                        if (teil.includes('${') || teil.includes('{')) continue;
                        const roh = saeubern(teil);
                        if (!/(^|:)bg-/.test(roh)) continue;
                        const klasse = reineKlasse(roh);
                        const wert = klasse.replace(/^bg-/, '');
                        if (!wert || wert.startsWith('[')) continue;
                        if (BG_OHNE_FARBE.test(wert)) continue;
                        if (erlaubt.has(wert)) continue;
                        // Palettenfarben sind echte Farben — sie fallen unter Regel 2.
                        if (new RegExp(`^(?:${PALETTE})-[0-9]{2,3}$`).test(wert)) continue;
                        treffer.push(`${relativ(datei)}:${index + 1} — bg-${wert}`);
                    }
                }
            });
        }

        if (treffer.length > 0) {
            throw new Error(
                'TOTE FLAECHEN-KLASSE — diese bg-Klassen zeigen auf keine Farbe in\n' +
                'tailwind.config.js und setzen deshalb gar nichts:\n  - ' +
                treffer.join('\n  - ') +
                '\n\nEntweder die Farbe unter theme.extend.colors ergaenzen oder eine\n' +
                'vorhandene benutzen. Genau so war `bg-card` an 16 Stellen wirkungslos.'
            );
        }
    });

    it('laesst in NEUEN Dateien keine hartcodierten Palettenfarben zu', () => {
        const treffer = alleDateien
            .filter(datei => !HARTE_FARBEN_BASELINE.includes(relativ(datei)))
            .filter(datei =>
                readFileSync(datei, 'utf8')
                    .split(/\r?\n/)
                    .some(zeile => ketten(zeile).some(kette => RE_HARTE_FARBE.test(kette)))
            )
            .map(relativ);

        if (treffer.length > 0) {
            throw new Error(
                'HARTCODIERTE FARBE — diese Dateien nutzen die Tailwind-Palette statt\n' +
                'der HSL-Tokens aus globals.css:\n  - ' + treffer.join('\n  - ') +
                '\n\nStattdessen: bg-primary, text-muted-foreground, border-border …\n' +
                'Nur so wirkt eine Aenderung an den Tokens ueberall gleichzeitig.'
            );
        }
    });

    it('laesst in NEUEN Dateien keine vier Abgrenzungsmittel an einem Element zu', () => {
        const treffer: string[] = [];

        for (const datei of alleDateien) {
            if (VIER_MITTEL_BASELINE.includes(relativ(datei))) continue;
            const zeilen = readFileSync(datei, 'utf8').split(/\r?\n/);
            zeilen.forEach((zeile, index) => {
                for (const kette of ketten(zeile)) {
                    const rand = /(^|\s)border($|\s|-)/.test(kette);
                    const toenung = /(^|\s)bg-[a-z-]+\/[0-9]/.test(kette);
                    const schatten = /(^|\s)shadow-/.test(kette);
                    const ring = /(^|\s)ring(-[0-9]|$|\s)/.test(kette);
                    if (rand && toenung && schatten && ring) {
                        treffer.push(`${relativ(datei)}:${index + 1}`);
                    }
                }
            });
        }

        if (treffer.length > 0) {
            throw new Error(
                'VIER MITTEL AN EINEM ELEMENT — Rand UND Flaechentoenung UND Schatten\n' +
                'UND Ring stehen hier nebeneinander:\n  - ' + treffer.join('\n  - ') +
                '\n\nEin Mittel pro Aussage. Traegt die Flaeche die Abgrenzung, darf der\n' +
                'Rand leise bleiben; sagt der Rand den Zustand, braucht es keinen Ring.'
            );
        }
    });

    /**
     * Radien haben dasselbe Problem wie Flaechen: `rounded-1.5xl` gibt es weder in
     * Tailwind noch in der Konfiguration und tat deshalb nichts — die Schaltflaeche
     * war schlicht eckig. Und `rounded-3xl` ist im Style Guide namentlich verboten,
     * stand aber an 28 Stellen (08.09.2026).
     *
     * Ohne Baseline: Beides ist am selben Tag repariert worden.
     */
    it('laesst nur Radien zu, die es gibt und die der Style Guide erlaubt', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const config = require(join(process.cwd(), 'tailwind.config.js'));
        const erlaubt = new Set<string>([
            '', 'none', 'sm', 'md', 'lg', 'xl', '2xl', 'full',
            ...Object.keys(config?.theme?.extend?.borderRadius ?? {}),
        ]);
        // `rounded-3xl` und groesser sind bewusst NICHT dabei: Der Style Guide nennt
        // sie unter "Verbotene Tailwind-Klassen" ausdruecklich.
        const seiten = /^(t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee)$/;
        const treffer: string[] = [];

        for (const datei of alleDateien) {
            const zeilen = readFileSync(datei, 'utf8').split(/\r?\n/);
            zeilen.forEach((zeile, index) => {
                for (const kette of ketten(zeile)) {
                    for (const teil of kette.split(/\s+/)) {
                        if (teil.includes('${') || teil.includes('{')) continue;
                        const roh = saeubern(teil);
                        const klasse = reineKlasse(roh);
                        if (!/^rounded(-|$)/.test(klasse)) continue;
                        let wert = klasse.replace(/^rounded-?/, '');
                        // Richtungsvariante abtrennen: rounded-b-hero -> hero
                        const teile = wert.split('-');
                        if (teile.length > 1 && seiten.test(teile[0])) wert = teile.slice(1).join('-');
                        else if (teile.length === 1 && seiten.test(teile[0])) wert = '';
                        if (wert.startsWith('[')) {
                            // Der Style Guide erlaubt genau diese eine freie Form.
                            if (wert !== '[var(--radius)]') {
                                treffer.push(`${relativ(datei)}:${index + 1} — rounded-${wert}`);
                            }
                            continue;
                        }
                        if (!erlaubt.has(wert)) {
                            treffer.push(`${relativ(datei)}:${index + 1} — ${klasse}`);
                        }
                    }
                }
            });
        }

        if (treffer.length > 0) {
            throw new Error(
                'UNERLAUBTER RADIUS — diese Klassen gibt es nicht oder der Style Guide\n' +
                'verbietet sie:\n  - ' + treffer.join('\n  - ') +
                '\n\nErlaubt sind rounded-hero (16px, Modals und Sektionskarten),\n' +
                'rounded-xl (12px, verschachtelte Kinder), rounded-lg (8px, normale\n' +
                'Karten und Infoboxen) und rounded-md (Bedienelemente).'
            );
        }
    });

    it('laesst keine Hover-Flaeche zu, die auf dem Seitengrund unsichtbar ist', () => {
        /*
         * `bg-muted` und `bg-accent` liegen beide auf 220 14% 96%, der Seitengrund
         * auf 220 20% 95%. Als Hover-Flaeche eines Elements, das auf dem Seitengrund
         * steht, ergibt das EINEN Prozentpunkt — nicht sichtbar. In einer weissen
         * Karte traegt derselbe Ton (96% gegen 100%), und genau deshalb ist es nie
         * aufgefallen: Dieselbe Klasse funktioniert an der einen Stelle und ist an
         * der anderen tot.
         *
         * Der groesste Einzelfall stand am 09.09.2026 in `Button`: Die Variante
         * `outline` setzt sich selbst auf `bg-background` und hoverte auf
         * `bg-accent` — 95% auf 96%, an 88 Aufrufstellen.
         *
         * Eine feste Graustufe kann das nicht loesen, sie muesste sich zugleich von
         * Weiss und von Grau absetzen. Eine durchsichtige dunkle Lasur schon:
         * `hover:bg-foreground/5` dunkelt ab, was darunter liegt, und ergibt auf
         * jedem Grund rund fuenf Punkte.
         *
         * KEINE Baseline — wie bei Regel 1: Eine Flaeche, die man nicht sieht, ist
         * kein Geschmack und kein Kompromiss, sondern ein Defekt.
         *
         * `accent-1` bis `accent-4` sind ausgenommen. Das sind die Marketing-Akzente
         * mit eigener Farbe, nicht die graue Stufe — der Bindestrich ist der ganze
         * Unterschied, und eine Suche ohne diese Grenze hat am 09.09.2026 fuenf
         * gesunde Stellen als defekt gemeldet.
         */
        const RE_TOTER_HOVER = /(?:group-)?hover:bg-(?:muted|accent)(?:\/\d+)?(?![-\w])/g;
        const treffer: string[] = [];

        for (const datei of alleDateien) {
            const zeilen = readFileSync(datei, 'utf8').split('\n');
            zeilen.forEach((zeile, i) => {
                const roh = zeile.trimStart();
                // Die Begruendung im Quelltext zitiert die alte Klasse.
                if (roh.startsWith('*') || roh.startsWith('//') || roh.startsWith('/*')) return;
                for (const fund of zeile.match(RE_TOTER_HOVER) ?? []) {
                    treffer.push(`${relativ(datei)}:${i + 1} — ${fund}`);
                }
            });
        }

        if (treffer.length > 0) {
            throw new Error(
                'UNSICHTBARE HOVER-FLAECHE — diese Klassen liegen einen Prozentpunkt\n' +
                'ueber dem Seitengrund und tun dort nichts:\n  - ' + treffer.join('\n  - ') +
                '\n\nNutze `hover:bg-foreground/5` — eine durchsichtige Lasur wirkt auf\n' +
                'jedem Untergrund. Fuer farbige Zustaende bleibt `hover:bg-primary/10`.'
            );
        }
    });

    it('verlangt, dass reparierte Dateien die Baselines verlassen', () => {
        const veraltetHart = HARTE_FARBEN_BASELINE.filter(pfad => {
            const inhalt = readFileSync(join(SRC_DIR, pfad), 'utf8');
            return !inhalt.split(/\r?\n/).some(zeile =>
                ketten(zeile).some(kette => RE_HARTE_FARBE.test(kette)));
        });

        const veraltetVier = VIER_MITTEL_BASELINE.filter(pfad => {
            const zeilen = readFileSync(join(SRC_DIR, pfad), 'utf8').split(/\r?\n/);
            return !zeilen.some(zeile => ketten(zeile).some(kette =>
                /(^|\s)border($|\s|-)/.test(kette) &&
                /(^|\s)bg-[a-z-]+\/[0-9]/.test(kette) &&
                /(^|\s)shadow-/.test(kette) &&
                /(^|\s)ring(-[0-9]|$|\s)/.test(kette)));
        });

        const veraltet = [
            ...veraltetHart.map(p => `HARTE_FARBEN_BASELINE: ${p}`),
            ...veraltetVier.map(p => `VIER_MITTEL_BASELINE: ${p}`),
        ];

        if (veraltet.length > 0) {
            throw new Error(
                'BASELINE VERALTET — diese Eintraege sind repariert und gehoeren\n' +
                'aus der Liste entfernt: 🎉\n  - ' + veraltet.join('\n  - ')
            );
        }
    });
});
