import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Wächter über die vier Profil-Familien
 * 👨‍👩‍👧‍👦🛡️
 *
 * WARUM ES DIESEN TEST GIBT
 * -------------------------
 * Koreki hat vier Familien mit derselben Verwaltung: Expertise-Profile,
 * KI-Profile, Skill-Sets und Erfahrungsschätze. Sie werden angelegt, benannt,
 * überschrieben, exportiert und importiert — überall nach denselben Regeln.
 *
 * Die wiederkehrende Fehlerklasse dieses Projekts ist nicht, dass eine Regel
 * falsch ist. Sie ist, dass eine Regel in DREI Familien gilt und in der
 * vierten fehlt. Belegte Fälle:
 *
 * - 18.08.2026: Der Erfahrungsschatz-IMPORT fragte nicht vor dem Überschreiben,
 *   obwohl sein eigener Speicher-Weg und alle drei Profil-Familien es tun. Ein
 *   Import überschrieb den gleichnamigen Schatz still — der Name steht im KOPF
 *   der Datei, das Umbenennen der Datei ändert daran nichts. Wer nach dem
 *   Export noch am Original gearbeitet hatte, verlor diese Arbeit wortlos.
 * - Dieselbe Sitzung: `usePromptProfiles` und `grading-memory-persistence`
 *   schrieben den Namensvergleich von Hand aus. Die zweite Fassung verglich den
 *   GESPEICHERTEN Namen ungetrimmt und wich damit von `isSameName` ab.
 *
 * VERFAHREN
 * ---------
 * Für jede Familie wird geprüft, dass sie die GEMEINSAMEN Regeln benutzt statt
 * eigener. Der Test liest Quelltext — er beweist nicht, dass die Regel richtig
 * angewandt wird, aber er merkt, wenn eine Familie sie gar nicht kennt. Genau
 * das war jedes Mal der Fall.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Die vier Familien und wo ihre Verwaltung liegt.
 *
 * Der Erfahrungsschatz ist auf mehrere Dateien verteilt (Liste, Assistent,
 * Ablage) — deshalb je Familie eine Liste von Dateien, die zusammen betrachtet
 * werden.
 */
const FAMILIEN: Record<string, string[]> = {
    'Expertise-Profile': ['hooks/usePromptProfiles.ts'],
    'KI-Profile': ['hooks/useAiProfiles.ts'],
    'Skill-Sets': ['hooks/useSkillProfiles.ts'],
    'Erfahrungsschätze': [
        'hooks/useGradingMemoryModalState.ts',
        'hooks/grading-memory/useGradingMemoryLibrary.ts',
        'lib/grading-memory-persistence.ts'
    ]
};

/**
 * Regeln, die in JEDER Familie vorkommen müssen.
 *
 * Jede steht für einen Weg, auf dem schon einmal Arbeit verlorengegangen ist
 * oder verlorengehen könnte.
 */
const REGELN: { name: string; marker: string[]; warum: string }[] = [
    {
        name: 'Gemeinsamer Namensvergleich',
        marker: ['isSameName', 'findNameCollision'],
        warum: '`toLowerCase()` von Hand weicht ab, sobald jemand das Trimmen vergisst. '
            + 'Zwei Familien hatten diese Abweichung bereits.'
    },
    {
        name: 'Einheitliche Meldung bei belegtem Namen',
        marker: ['nameTakenMessage'],
        warum: 'Vier verschiedene Formulierungen für dieselbe Lage sind für die Lehrkraft '
            + 'vier verschiedene Fehler.'
    }
];

const lies = (dateien: string[]): string =>
    dateien.map(d => readFileSync(join(SRC_DIR, ...d.split('/')), 'utf8')).join('\n');

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

/**
 * Zerlegt eine Datei grob in Funktionen.
 *
 * Reicht fuer diesen Zweck: gesucht wird, ob innerhalb EINER Funktion zwei
 * Dinge zusammen vorkommen. Ein Parser waere genauer, aber die Grenzen
 * `const name = ` und `function name` auf der ersten Einrueckungsebene
 * treffen den Code dieses Projekts zuverlaessig.
 */
const inFunktionen = (quelltext: string): { name: string; rumpf: string }[] => {
    const zeilen = quelltext.split('\n');
    const grenze = /^\s{0,4}(?:export\s+)?(?:const|async function|function)\s+(\w+)/;

    // Erst alle Anfangszeilen sammeln, dann die Ruempfe dazwischen schneiden.
    // Das kommt ohne veraenderliche Zwischenablage aus.
    const anfaenge: { name: string; zeile: number }[] = [];
    zeilen.forEach((zeile, i) => {
        const treffer = zeile.match(grenze);
        if (treffer) anfaenge.push({ name: treffer[1], zeile: i });
    });

    return anfaenge.map(({ name, zeile }, i) => ({
        name,
        rumpf: zeilen.slice(zeile, anfaenge[i + 1]?.zeile ?? zeilen.length).join('\n')
    }));
};

/** Der Inhalt stammt aus einer eingelesenen Datei. */
const AUS_DATEI = ['parseMarkdown', 'file.text()', 'parsed.cases', 'parsed.name'];
/** Hier wird tatsaechlich abgelegt. */
const SCHREIBT = ['persistGradingMemory(', 'speichereSkillProfil(', '.speichere(', 'apiClient.post('];
/** Hier wird vorher gefragt. */
const FRAGT = ['overwriteQuestion', 'bestaetigeSchatzName', 'window.confirm'];

const enthaelt = (rumpf: string, marker: string[]) => marker.some(m => rumpf.includes(m));

describe('Profil-Familien-Symmetrie', () => {
    const quellen = Object.fromEntries(
        Object.entries(FAMILIEN).map(([familie, dateien]) => [familie, lies(dateien)])
    );

    /**
     * DIE REGEL, DIE DER GEMELDETE FEHLER VERLETZT HAT.
     *
     * Die drei Profil-Familien lesen eine Datei ein und fuellen damit nur den
     * EDITOR — gespeichert wird erst danach, ueber den Weg mit Rueckfrage. Der
     * Erfahrungsschatz-Import schrieb dagegen sofort in die Ablage und ging an
     * jeder Rueckfrage vorbei. Ein gleichnamiger Schatz wurde damit wortlos
     * ersetzt; wer nach dem Export noch am Original gearbeitet hatte, verlor
     * diese Arbeit.
     *
     * Wer also aus einer DATEI heraus SPEICHERT, muss FRAGEN. Wer nur den
     * Editor fuellt, braucht das nicht — deshalb faellt hier keine der drei
     * anderen Familien durch.
     */
    it('fragt, wo aus einer Datei heraus gespeichert wird', () => {
        const verstoesse: string[] = [];

        Object.entries(FAMILIEN).forEach(([familie, dateien]) => {
            dateien.forEach(datei => {
                const quelle = readFileSync(join(SRC_DIR, ...datei.split('/')), 'utf8');

                inFunktionen(quelle).forEach(({ name, rumpf }) => {
                    if (!enthaelt(rumpf, AUS_DATEI)) return;
                    if (!enthaelt(rumpf, SCHREIBT)) return;
                    if (enthaelt(rumpf, FRAGT)) return;

                    verstoesse.push(
                        `${familie} — ${datei}: \`${name}\` legt Eingelesenes ab, ohne vorher zu fragen.`
                    );
                });
            });
        });

        if (verstoesse.length > 0) {
            throw new Error(
                'Aus einer Datei heraus gespeichert, ohne Rueckfrage:\n  - '
                + verstoesse.join('\n  - ')
                + '\n\n  Ein gleichnamiger Eintrag wird dabei wortlos ersetzt.'
                + '\n  `bestaetigeSchatzName` bzw. `overwriteQuestion` nutzen.'
            );
        }
    });

    it.each(REGELN)('$name gilt in allen vier Familien', ({ marker, warum }) => {
        const fehlend = Object.entries(quellen)
            .filter(([, quelle]) => !marker.some(m => quelle.includes(m)))
            .map(([familie]) => familie);

        if (fehlend.length > 0) {
            throw new Error(
                `Diese Familien kennen die Regel nicht: ${fehlend.join(', ')}.\n`
                + `  Erwartet wird eines von: ${marker.join(' | ')}\n`
                + `  ${warum}`
            );
        }
    });

    /**
     * Der Namensvergleich gehört NUR nach `profile-naming.ts`.
     *
     * Ausgeschrieben sieht er harmlos aus — `a.toLowerCase() === b.toLowerCase()`.
     * Genau daran ist er schon auseinandergelaufen: eine Fassung trimmte beide
     * Seiten, eine nur eine. Der Unterschied fällt erst auf, wenn ein Name ein
     * Leerzeichen am Ende trägt, und dann überschreibt die Ablage kommentarlos
     * einen Eintrag, den die Rückfrage nicht gefunden hat.
     */
    it('vergleicht Profilnamen nirgends von Hand', () => {
        const verstoesse: string[] = [];

        getFilesRecursively(SRC_DIR)
            .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
            .forEach(pfad => {
                const relativ = toRelative(pfad);
                if (relativ === 'lib/services/profile-naming.ts') return;

                readFileSync(pfad, 'utf8').split('\n').forEach((zeile, i) => {
                    // Nur PROFIL-Namen. Der Abgleich von AUFGABEN-Namen zwischen
                    // Layout und Modell-Antwort ist ein anderes Thema mit eigenen
                    // Regeln — er darf hier nicht mitgefangen werden.
                    const istProfilName = /\b(profil\w*|memor\w*|schatz\w*|vorhandene|entries)\b/i.test(zeile);
                    const vergleichtVonHand = /\.name[^=]*\.toLowerCase\(\)\s*===/.test(zeile)
                        || /toLowerCase\(\)\s*===\s*[^;]*\.name\b/.test(zeile);

                    if (istProfilName && vergleichtVonHand) {
                        verstoesse.push(`${relativ}:${i + 1}  ${zeile.trim().slice(0, 90)}`);
                    }
                });
            });

        if (verstoesse.length > 0) {
            throw new Error(
                'Profilnamen von Hand verglichen — `isSameName` aus lib/services/profile-naming nutzen:\n  - '
                + verstoesse.join('\n  - ')
            );
        }
    });

    /**
     * Hält den Wächter selbst ehrlich: findet er die Marker in keiner Familie
     * mehr, ist vermutlich eine Datei umgezogen und der Test winkt ab da alles
     * durch.
     */
    it('findet die Familien-Dateien ueberhaupt', () => {
        Object.entries(quellen).forEach(([familie, quelle]) => {
            expect(quelle.length).toBeGreaterThan(500);
            expect(familie).toBeTruthy();
        });
    });
});

/**
 * Dieselbe Symmetrie auf der ROUTEN-Seite.
 * 🛣️
 *
 * Die Prüfungen oben lesen die Hooks — also die Client-Seite. Am 19.08.2026
 * zeigte sich beim Lesen von `pages/api`, dass dieselben vier Familien auch
 * dort auseinandergelaufen waren, und zwar in DREI Richtungen gleichzeitig:
 *
 *   - `skill-profiles` und `prompt-profiles` prüften im lokalen Zweig die
 *     DELETE-ID nicht. `deleteProfile(undefined)` filtert auf
 *     `x.id !== undefined`, löscht also NICHTS — und meldet `200 success`.
 *     Die Oberfläche entfernt den Eintrag, beim nächsten Laden ist er zurück.
 *   - Dieselben zwei hatten am Ende ihres lokalen Zweigs kein `405`. Eine
 *     andere HTTP-Methode fiel dadurch in den SaaS-Pfad — der auf die
 *     Datenbank zugreift, die es auf dem Desktop nicht gibt.
 *   - `ai-profiles` las beim PATCH `req.body` roh, während die drei anderen
 *     ein Schema benutzten.
 *
 * Keine dieser Lücken war ein falsch verstandener Sonderfall. Jede war eine
 * Regel, die drei Familien kannten und die vierte nicht — dieselbe Klasse wie
 * oben, nur eine Etage tiefer.
 */
const ROUTEN: Record<string, string> = {
    'Expertise-Profile': 'pages/api/user/prompt-profiles.ts',
    'KI-Profile': 'pages/api/user/ai-profiles.ts',
    'Skill-Sets': 'pages/api/user/skill-profiles.ts',
    'Erfahrungsschätze': 'pages/api/user/grading-memories.ts'
};

/**
 * Schneidet den lokalen Zweig heraus: von `isLocalInstance()` bis zum ersten
 * Datenbank-Zugriff. Letzterer ist der unverwechselbare Anfang des SaaS-Pfads
 * — auf einer lokalen Instanz darf er nie erreicht werden.
 *
 * Ein erster Anlauf schnitt bei `const { claims }` ab. Das steht aber AUCH
 * gleich zu Beginn des lokalen Zweigs, sodass der Ausschnitt fast leer blieb
 * und der Test bei drei Familien fehlschlug, obwohl der Code stimmte.
 */
const lokalerZweig = (quelltext: string): string => {
    const start = quelltext.indexOf('isLocalInstance()');
    if (start === -1) return '';
    const rest = quelltext.slice(start);
    const ende = rest.indexOf('prisma.user.findUnique');
    return ende === -1 ? rest : rest.slice(0, ende);
};

describe('Profil-Familien-Symmetrie: API-Routen', () => {
    const routenQuellen = Object.fromEntries(
        Object.entries(ROUTEN).map(([familie, datei]) => [
            familie,
            readFileSync(join(SRC_DIR, ...datei.split('/')), 'utf8')
        ])
    );

    /**
     * NUR den DELETE-Block betrachten, nicht den ganzen lokalen Zweig.
     *
     * Die erste Fassung dieses Tests prüfte den gesamten Zweig auf ein
     * `if (!validation.success)` — und fand es, weil der PATCH-Block darüber
     * eines enthält. Sie bestand damit auch gegen den fehlerhaften Stand. Die
     * Mutationsprobe hat das aufgedeckt; ohne sie wäre hier ein Wächter
     * eingezogen, der nichts bewacht.
     */
    it.each(Object.keys(ROUTEN))('%s prueft die DELETE-ID auch im lokalen Zweig', (familie) => {
        const zweig = lokalerZweig(routenQuellen[familie]);
        expect(zweig).toContain("req.method === 'DELETE'");

        const deleteBlock = zweig.slice(zweig.indexOf("req.method === 'DELETE'"));
        // Bis zum Aufruf des Dienstes: DAVOR muss die Pruefung stehen.
        const bisZumDienst = deleteBlock.slice(0, deleteBlock.indexOf('.deleteProfile('));

        expect(bisZumDienst).toMatch(/deleteSchema\.safeParse|if \(!profileId\)/);
    });

    it.each(Object.keys(ROUTEN))('%s beendet den lokalen Zweig mit 405', (familie) => {
        expect(lokalerZweig(routenQuellen[familie])).toContain('405');
    });

    it.each(Object.keys(ROUTEN))('%s validiert das Umbenennen per Schema', (familie) => {
        const quelle = routenQuellen[familie];
        const patchStellen = quelle.split("req.method === 'PATCH'").slice(1);

        expect(patchStellen.length).toBeGreaterThan(0);
        patchStellen.forEach(abschnitt => {
            // Nur den Anfang des Zweigs betrachten, nicht den Rest der Datei.
            expect(abschnitt.slice(0, 400)).toMatch(/renameSchema\.safeParse|validation\.data/);
        });
    });
});
