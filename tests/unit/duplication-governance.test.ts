import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';
import { createHash } from 'crypto';

/**
 * Waechter gegen kopierte Bloecke
 * 👯🛡️
 *
 * WARUM ES DIESEN TEST GIBT
 * -------------------------
 * In einer einzigen Sitzung haben ZWEI parallel gepflegte Kopien je einen
 * echten Fehler erzeugt:
 *
 * - Die JSON-Entnahme aus Modell-Antworten stand zweimal da. Nur eine Fassung
 *   kannte `<think>` — die Schreibweise von Qwen3. Jede lokale Korrektur mit
 *   eingeschaltetem Thinking brach ab.
 * - Der Vorlauf der Bewertungs-Engines stand zweimal da. Nur eine Fassung
 *   setzte `task.targetGoal` vor der Extraktion. Auf dem Server-Weg fehlte
 *   dadurch der Warnhinweis "ohne Sandbox-Pruefung" — der Lehrer bekam
 *   ungeprueft KI-Punkte auf eine Mathe-Aufgabe.
 *
 * Beide fielen erst auf, als jemand gezielt danach suchte. Genau das soll
 * dieser Test ersetzen: das Muster meldet sich ab jetzt von allein.
 *
 * NACHTRAG 18.08.2026 — der blinde Fleck der ersten Fassung
 * ---------------------------------------------------------
 * Sie verglich Dateien nur GEGENEINANDER. Zwei Kopien in derselben Datei sah
 * sie nicht, und daraus wurde der dritte Fehler dieser Art: in `ollama-logic`
 * standen Web- und Node-Zweig des Stream-Lesens untereinander, nachgebessert
 * wurde nur einer, und der serverseitige verlor an jeder Paketgrenze Text.
 *
 * Der Test prueft jetzt beides. Der Wortlaut der Regel ist derselbe geblieben —
 * "wortgleicher Block, der zweimal existiert" — nur die Frage, wo gesucht wird,
 * ist weiter geworden.
 *
 * VERFAHREN
 * ---------
 * Jede Datei wird von Kommentaren und Leerraum befreit; Zeilen unter 25
 * Zeichen fallen weg, weil `}` oder `return;` in jeder Datei stehen. Ueber den
 * Rest laufen Fenster von 6 Zeilen, die gehasht werden.
 * - Derselbe Hash in zwei verschiedenen Dateien: ein wortgleicher Block.
 * - Derselbe Hash zweimal in EINER Datei, mindestens FENSTER Zeilen
 *   auseinander: ebenso. Die Mindestentfernung schliesst Muster aus, die sich
 *   Zeile fuer Zeile wiederholen — eine lange, gleichfoermige Tabelle etwa.
 *
 * WAS ER NICHT FINDET
 * -------------------
 * Nur WORTGLEICHES. Eine Kopie, die beim Herausziehen umbenannt oder umgebaut
 * wurde, ist fuer ihn eine andere. Genau so blieb die Werkzeug-Pruefung in
 * `ollama-logic` als dritte Fassung stehen, waehrend `tool-validation.ts`
 * bereits existierte. Dagegen hilft dieser Test nicht — nur Hinsehen.
 *
 * RATSCHEN-PRINZIP (wie bei any-governance und file-size-governance)
 * - Eine neue Doppelung faellt durch, ob zwischen zwei Dateien oder in einer.
 * - Eine bekannte darf nicht laenger werden.
 * - Wird sie kuerzer, muss die Baseline mit.
 * - Verschwindet sie, muss der Eintrag raus.
 */

const SRC_DIR = join(process.cwd(), 'src');

/** Fensterlaenge in aussagekraeftigen Zeilen. */
const FENSTER = 6;

/**
 * Zeilen unter dieser Laenge zaehlen nicht mit.
 *
 * Ohne die Grenze meldet der Test jede Datei gegen jede: schliessende
 * Klammern, `});` und kurze `return`-Zeilen wiederholen sich ueberall und
 * sagen nichts ueber kopierte Logik.
 */
const MIN_ZEICHEN = 25;

/**
 * Bekannte Doppelungen, eingefroren am 17.08.2026.
 * Schluessel: beide Pfade, alphabetisch, mit " <-> " verbunden.
 * Wert: laengster wortgleicher Block in aussagekraeftigen Zeilen.
 * NUR SENKEN, NIE ANHEBEN.
 */
const DUPLICATION_BASELINE: Record<string, number> = {
    'pages/app/compliance/avv.tsx <-> pages/app/compliance/manual.tsx': 25,
    'pages/app/compliance/avv.tsx <-> pages/app/compliance/tom.tsx': 25,
    'pages/app/compliance/manual.tsx <-> pages/app/compliance/tom.tsx': 25,
    'pages/api/clean-and-analyze.ts <-> pages/api/clean-and-map.ts': 21,
    'pages/app/compliance/agb.tsx <-> pages/app/compliance/avv.tsx': 17,
    'pages/app/compliance/agb.tsx <-> pages/app/compliance/manual.tsx': 17,
    'pages/app/compliance/agb.tsx <-> pages/app/compliance/tom.tsx': 17,
    'pages/api/generate-calc-trace.ts <-> pages/api/generate-graph.ts': 13,
    'pages/api/generate-calc-trace.ts <-> pages/api/refine-graph.ts': 13,
    'pages/api/generate-graph.ts <-> pages/api/refine-graph.ts': 13,
    'lib/ai/mistral-provider.ts <-> lib/ai/openai-provider.ts': 12,
    'pages/api/second-opinion.ts <-> pages/api/user/grading-memories/anonymize.ts': 11,
    'pages/api/second-opinion.ts <-> pages/api/user/grading-memories/generate.ts': 11,
    'pages/api/user/grading-memories/anonymize.ts <-> pages/api/user/grading-memories/generate.ts': 11,
    'components/AiParamsModal.tsx <-> components/PromptSettingsModal.tsx': 10,
    'components/AiParamsModal.tsx <-> components/SkillsSettingsModal.tsx': 10,
    'components/PromptSettingsModal.tsx <-> components/SkillsSettingsModal.tsx': 10,
    'lib/ai/ai-orchestrator.ts <-> pages/api/generate-graph.ts': 10,
    'pages/agb.tsx <-> pages/impressum.tsx': 10,
    'pages/api/user/prompt-profiles.ts <-> pages/api/user/skill-profiles.ts': 10,
    'components/batch/BatchItemPendingView.tsx <-> components/batch/parts/BatchSolutionPanel.tsx': 9,
    'pages/api/clean-and-analyze.ts <-> pages/api/second-opinion.ts': 9,
    'pages/api/clean-and-analyze.ts <-> pages/api/user/grading-memories/anonymize.ts': 9,
    'pages/api/clean-and-analyze.ts <-> pages/api/user/grading-memories/generate.ts': 9,
    'pages/api/clean-and-map.ts <-> pages/api/second-opinion.ts': 9,
    'pages/api/clean-and-map.ts <-> pages/api/user/grading-memories/anonymize.ts': 9,
    'pages/api/clean-and-map.ts <-> pages/api/user/grading-memories/generate.ts': 9,
    'components/AiParamsModal.tsx <-> hooks/useAiProfiles.ts': 8,
    'pages/api/user/ai-profiles.ts <-> pages/api/user/prompt-profiles.ts': 8,
    'pages/api/user/ai-profiles.ts <-> pages/api/user/skill-profiles.ts': 8,
    'components/settings/ProfileModules.tsx <-> components/settings/SkillsSidebar.tsx': 6,
    'pages/agb.tsx <-> pages/privacy.tsx': 7,
    'pages/api/clean-and-analyze.ts <-> pages/api/extract-image.ts': 7,
    'pages/api/clean-and-map.ts <-> pages/api/extract-image.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/second-opinion.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/user/grading-memories/anonymize.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/user/grading-memories/generate.ts': 7,
    'pages/impressum.tsx <-> pages/privacy.tsx': 7,
    'components/batch/BatchFileListItem.tsx <-> components/batch/BatchItemDoneView.tsx': 6,
    'components/guards/AuthGuard.tsx <-> pages/login.tsx': 6,
    'lib/validation.ts <-> pages/api/generate-calc-trace.ts': 6,
    'lib/validation.ts <-> pages/api/generate-graph.ts': 6,
    'lib/validation.ts <-> pages/api/refine-graph.ts': 6,
    'pages/api/user/grading-memories.ts <-> pages/api/user/grading-memories/append.ts': 6,
    'pages/features/expertise.tsx <-> pages/features/intelligence.tsx': 6,
    'pages/features/expertise.tsx <-> pages/features/memory.tsx': 6,
    'pages/features/expertise.tsx <-> pages/features/skills.tsx': 6,
    'pages/features/intelligence.tsx <-> pages/features/memory.tsx': 6,
    'pages/features/intelligence.tsx <-> pages/features/skills.tsx': 6,
    'pages/features/memory.tsx <-> pages/features/skills.tsx': 6
};

/**
 * Bekannte Doppelungen INNERHALB einer Datei, eingefroren am 18.08.2026.
 * Schluessel: der Pfad. Wert: laengster Block, der zweimal in ihr steht.
 * NUR SENKEN, NIE ANHEBEN.
 *
 * Die vier groessten wurden beim Einbau dieser Pruefung aufgeloest, nicht
 * eingefroren — sie hatten alle dieselbe Folge, wenn jemand sie angefasst
 * haette:
 * - `lib/excel/export-content.ts` (14): dieselben sechs Feedback-Spalten fuer
 *   Einzel- und Sammelexport. Eine ergaenzte Spalte waere in genau einem der
 *   beiden Exporte gelandet.
 * - `pages/app.tsx` (10): die beiden .koreki-Exporte, unterschieden durch ein
 *   einziges `true`.
 * - `hooks/skills/useCustomSkillCrud.ts` (8): das Herausnehmen eines
 *   geloeschten Skills, einmal fuer den Zustand, einmal fuer die Desktop-Ablage.
 * - `hooks/file-processor/useOcrActions.ts` (7) und `types/index.ts` (7).
 *
 * Was hier steht, liegt an der Untergrenze von sechs Zeilen: Handler-Enden von
 * API-Routen und gleichfoermige Filter. Kein Handlungsbedarf, aber eingefroren.
 */
const SELF_DUPLICATION_BASELINE: Record<string, number> = {
    'components/settings/SkillsModules.tsx': 8,
    'pages/api/extract-image.ts': 7,
    'components/batch/parts/BatchTaskAnalysisCard.tsx': 6,
    'hooks/file-processor/useOcrActions.ts': 6,
    'hooks/useSkillGovernance.ts': 6,
    'pages/api/generate-calc-trace.ts': 6,
    'pages/api/generate-graph.ts': 6,
    'pages/api/user/ai-profiles.ts': 6,
    'pages/api/user/grading-memories.ts': 6,
    'pages/api/user/prompt-profiles.ts': 6,
    'pages/api/user/skill-profiles.ts': 6
};

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
 * Import-Zeilen zaehlen nicht als Doppelung.
 *
 * Zwei Dateien desselben Bereichs importieren zwangslaeufig dieselben Module —
 * das ist kein kopierter Code, sondern gleiche Zugehoerigkeit. Ohne diesen
 * Filter meldet der Test vor allem Import-Bloecke und geht im Rauschen unter;
 * genau dann setzt ihn jemand auf `skip`, und er ist schlechter als kein Test.
 */
const istImportZeile = (zeile: string): boolean =>
    /^(import|export)\b/.test(zeile) || /^\} from ['"]/.test(zeile);

/**
 * Entfernt Kommentare und Leerraum und wirft zu kurze Zeilen weg.
 *
 * Blockkommentare werden durch ebenso viele Zeilenumbrueche ersetzt, damit die
 * Zeilennummern in der Fehlermeldung stimmen.
 */
const aussagekraeftigeZeilen = (quelltext: string): { nummer: number; text: string }[] => {
    const ohneBloecke = quelltext.replace(/\/\*[\s\S]*?\*\//g, treffer =>
        '\n'.repeat((treffer.match(/\n/g) || []).length)
    );

    const ergebnis: { nummer: number; text: string }[] = [];
    ohneBloecke.split('\n').forEach((rohzeile, index) => {
        // 🏮 Das Wagenruecklauf-Zeichen MUSS vor dem Kommentar-Muster weg.
        //
        // `(^|[^:])//.*$` findet mit angehaengtem \r keinen Treffer: In
        // JavaScript passt `$` ohne `m`-Flag nur auf das absolute Stringende,
        // und `.` deckt Zeilenendezeichen nicht ab — `.*$` kommt dort also nie
        // an. Die Folge war eine Pruefung, die auf zwei Plattformen zweierlei
        // misst: Auf Windows-Checkouts (core.autocrlf=true, CRLF) zaehlte JEDER
        // Kommentar als Code, unter Linux (LF) nicht. Ein wortgleich kopierter
        // Erklaerungsblock schlug dadurch lokal als Doppelung an, in der CI
        // nicht — und umgekehrt blieb hier verborgen, was dort rot war.
        const zeile = rohzeile.replace(/\r$/, '');
        const ohneKommentar = zeile.replace(/(^|[^:])\/\/.*$/, '$1');
        const knapp = ohneKommentar.replace(/\s+/g, ' ').trim();
        if (knapp.length < MIN_ZEICHEN) return;
        if (istImportZeile(knapp)) return;
        ergebnis.push({ nummer: index + 1, text: knapp });
    });
    return ergebnis;
};

const hashe = (zeilen: string[]) =>
    createHash('md5').update(zeilen.join('\n')).digest('hex');

interface Fundstelle {
    datei: string;
    fensterIndex: number;
    startZeile: number;
}

/** Hash eines Fensters -> alle Stellen, an denen es vorkommt. */
const baueIndex = (dateien: string[]): Map<string, Fundstelle[]> => {
    const index = new Map<string, Fundstelle[]>();

    dateien.forEach(pfad => {
        const relativ = toRelative(pfad);
        const zeilen = aussagekraeftigeZeilen(readFileSync(pfad, 'utf8'));

        for (let k = 0; k + FENSTER <= zeilen.length; k++) {
            const h = hashe(zeilen.slice(k, k + FENSTER).map(z => z.text));
            const liste = index.get(h) || [];
            liste.push({ datei: relativ, fensterIndex: k, startZeile: zeilen[k].nummer });
            index.set(h, liste);
        }
    });

    return index;
};

/**
 * Verschmilzt aufeinanderfolgende Fenster zum laengsten Block.
 *
 * Zwei Fenster, die um 1 versetzt beide getroffen haben, beschreiben denselben
 * Block eine Zeile weiter — zusammen sind sie FENSTER + 1 Zeilen lang.
 */
const verschmelze = (fenster: Map<number, Fundstelle>): { laenge: number; start: Fundstelle } => {
    const indizes = Array.from(fenster.keys()).sort((a, b) => a - b);
    let laufStart = indizes[0];
    let vorher = indizes[0];
    let bestLaenge = 0;
    let bestStart = indizes[0];

    const abschliessen = () => {
        const laenge = vorher - laufStart + FENSTER;
        if (laenge > bestLaenge) {
            bestLaenge = laenge;
            bestStart = laufStart;
        }
    };

    indizes.slice(1).forEach(i => {
        if (i === vorher + 1) {
            vorher = i;
        } else {
            abschliessen();
            laufStart = i;
            vorher = i;
        }
    });
    abschliessen();

    return { laenge: bestLaenge, start: fenster.get(bestStart)! };
};

/** Laengster zusammenhaengender Block je Dateipaar. */
const findeDoppelungen = (index: Map<string, Fundstelle[]>): Map<string, { laenge: number; wo: string }> => {
    // Paar -> Menge der Fensterindizes in der ersten Datei des Paares
    const treffer = new Map<string, Map<number, Fundstelle>>();

    index.forEach(vorkommen => {
        const dateienImHash = new Set(vorkommen.map(v => v.datei));
        if (dateienImHash.size < 2) return;

        for (let a = 0; a < vorkommen.length; a++) {
            for (let b = a + 1; b < vorkommen.length; b++) {
                if (vorkommen[a].datei === vorkommen[b].datei) continue;

                const [erste, zweite] = [vorkommen[a], vorkommen[b]]
                    .sort((x, y) => x.datei.localeCompare(y.datei));
                const schluessel = `${erste.datei} <-> ${zweite.datei}`;

                const bisher = treffer.get(schluessel) || new Map<number, Fundstelle>();
                bisher.set(erste.fensterIndex, erste);
                treffer.set(schluessel, bisher);
            }
        }
    });

    const ergebnis = new Map<string, { laenge: number; wo: string }>();
    treffer.forEach((fenster, schluessel) => {
        const { laenge, start } = verschmelze(fenster);
        ergebnis.set(schluessel, { laenge, wo: `${start.datei}:${start.startZeile}` });
    });

    return ergebnis;
};

/**
 * Laengster Block, der INNERHALB einer Datei zweimal steht.
 *
 * Die beiden Vorkommen duerfen sich nicht ueberlappen: liegen sie weniger als
 * FENSTER Zeilen auseinander, ist das kein zweiter Block, sondern ein Muster,
 * das sich Zeile fuer Zeile wiederholt (eine lange Tabelle gleichfoermiger
 * Eintraege etwa). Das ist keine Kopie, die auseinanderlaufen kann.
 */
const findeSelbstDoppelungen = (
    index: Map<string, Fundstelle[]>
): Map<string, { laenge: number; wo: string; undWo: string }> => {
    // Datei -> Fensterindex der ERSTEN Fundstelle -> die zweite dazu
    const treffer = new Map<string, Map<number, Fundstelle>>();
    const partner = new Map<string, Fundstelle>();

    index.forEach(vorkommen => {
        if (vorkommen.length < 2) return;

        for (let a = 0; a < vorkommen.length; a++) {
            for (let b = a + 1; b < vorkommen.length; b++) {
                if (vorkommen[a].datei !== vorkommen[b].datei) continue;

                const [erste, zweite] = [vorkommen[a], vorkommen[b]]
                    .sort((x, y) => x.fensterIndex - y.fensterIndex);
                if (zweite.fensterIndex - erste.fensterIndex < FENSTER) continue;

                const datei = erste.datei;
                const bisher = treffer.get(datei) || new Map<number, Fundstelle>();
                bisher.set(erste.fensterIndex, erste);
                treffer.set(datei, bisher);
                partner.set(`${datei}#${erste.fensterIndex}`, zweite);
            }
        }
    });

    const ergebnis = new Map<string, { laenge: number; wo: string; undWo: string }>();
    treffer.forEach((fenster, datei) => {
        const { laenge, start } = verschmelze(fenster);
        const zweite = partner.get(`${datei}#${start.fensterIndex}`)!;
        ergebnis.set(datei, {
            laenge,
            wo: `${datei}:${start.startZeile}`,
            undWo: `${datei}:${zweite.startZeile}`
        });
    });

    return ergebnis;
};

describe('Duplication Governance', () => {
    const sourceFiles = getFilesRecursively(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    const index = baueIndex(sourceFiles);
    const gefunden = findeDoppelungen(index);
    const selbstGefunden = findeSelbstDoppelungen(index);

    it('laesst keine neue Doppelung zwischen zwei Dateien entstehen', () => {
        const verstoesse: string[] = [];

        gefunden.forEach(({ laenge, wo }, schluessel) => {
            const baseline = DUPLICATION_BASELINE[schluessel];

            if (baseline === undefined) {
                verstoesse.push(
                    `${schluessel}: ${laenge} wortgleiche Zeilen (ab ${wo}). ` +
                    `Gemeinsamen Teil herausziehen — oder bewusst in DUPLICATION_BASELINE ` +
                    `aufnehmen und im Review begruenden.`
                );
                return;
            }

            if (laenge > baseline) {
                verstoesse.push(
                    `${schluessel}: ${laenge} wortgleiche Zeilen (Baseline ${baseline}, ab ${wo}). ` +
                    `Bekannte Doppelungen duerfen nicht wachsen.`
                );
            }
        });

        if (verstoesse.length > 0) {
            throw new Error(`DUPLICATION GOVERNANCE:\n  - ${verstoesse.join('\n  - ')}`);
        }
    });

    /**
     * Haelt die Ratsche am Ziehen — sonst waere eine einmal aufgenommene
     * Doppelung ab da unbegrenzt konservierbar.
     */
    it('requires resolved duplications to leave the baseline', () => {
        const veraltet: string[] = [];

        Object.entries(DUPLICATION_BASELINE).forEach(([schluessel, baseline]) => {
            const jetzt = gefunden.get(schluessel);

            if (!jetzt) {
                veraltet.push(`${schluessel}: keine Doppelung mehr — aus DUPLICATION_BASELINE entfernen. 🎉`);
                return;
            }

            if (jetzt.laenge < baseline) {
                veraltet.push(
                    `${schluessel}: auf ${jetzt.laenge} Zeilen geschrumpft — Baseline von ${baseline} nachziehen.`
                );
            }
        });

        if (veraltet.length > 0) {
            throw new Error(`DUPLICATION BASELINE VERALTET:\n  - ${veraltet.join('\n  - ')}`);
        }
    });

    /**
     * Haelt den Waechter selbst ehrlich: findet er gar nichts mehr, ist
     * vermutlich die Normalisierung kaputt und der Test winkt ab da alles
     * durch. Die Compliance-Seiten sind bekannte Doppelungen und muessen
     * gefunden werden.
     */
    it('findet ueberhaupt Doppelungen (sonst ist die Normalisierung kaputt)', () => {
        expect(gefunden.size).toBeGreaterThan(0);
    });

    /**
     * DER BLINDE FLECK, GESCHLOSSEN AM 18.08.2026.
     *
     * Die Pruefung oben vergleicht Dateien GEGENEINANDER. Zwei Kopien in
     * derselben Datei sah sie nicht — und genau daraus wurde ein Fehler:
     *
     * In `ollama-logic.ts` standen der Web- und der Node-Zweig zum Auslesen des
     * Antwort-Streams untereinander, mit derselben Schleife zweimal
     * ausgeschrieben. Nachgebessert wurde nur einer. Der Node-Zweig — also der
     * serverseitige, Community wie SaaS — warf an jeder Paketgrenze weg, was
     * ueber sie hinausreichte. Im Bewertungstext fehlte damit potenziell mitten
     * im Satz ein Stueck, und weil das Ergebnis gueltiges JSON blieb, fiel es
     * nirgends auf.
     *
     * Zwei Kopien in einer Datei sind nicht harmloser als zwei ueber Dateien.
     * Sie sind schwerer zu sehen: beim Lesen wirkt der zweite Block wie eine
     * andere Stelle, weil der Kontext drumherum anders aussieht.
     *
     * Gegengeprueft: mit dem Dateistand VOR der Reparatur meldet dieser Test
     * `ollama-logic.ts:381` und `:406` — die beiden Schleifen. Mit genau SECHS
     * wortgleichen Zeilen, also haarscharf ueber der Nachweisgrenze. Waere
     * FENSTER eine Zeile groesser, waere der Fehler durchgerutscht. Wer hier
     * den Wert erhoeht, um Rauschen loszuwerden, verliert echte Funde.
     */
    it('laesst keine neue Doppelung innerhalb einer Datei entstehen', () => {
        const verstoesse: string[] = [];

        selbstGefunden.forEach(({ laenge, wo, undWo }, datei) => {
            const baseline = SELF_DUPLICATION_BASELINE[datei];

            if (baseline === undefined) {
                verstoesse.push(
                    `${datei}: ${laenge} wortgleiche Zeilen stehen ZWEIMAL in derselben Datei ` +
                    `(${wo} und ${undWo}). Gemeinsamen Teil herausziehen — oder bewusst in ` +
                    `SELF_DUPLICATION_BASELINE aufnehmen und im Review begruenden.`
                );
                return;
            }

            if (laenge > baseline) {
                verstoesse.push(
                    `${datei}: ${laenge} wortgleiche Zeilen (Baseline ${baseline}, ${wo} und ${undWo}). ` +
                    `Bekannte Doppelungen duerfen nicht wachsen.`
                );
            }
        });

        if (verstoesse.length > 0) {
            throw new Error(`SELF-DUPLICATION GOVERNANCE:\n  - ${verstoesse.join('\n  - ')}`);
        }
    });

    it('requires resolved self-duplications to leave the baseline', () => {
        const veraltet: string[] = [];

        Object.entries(SELF_DUPLICATION_BASELINE).forEach(([datei, baseline]) => {
            const jetzt = selbstGefunden.get(datei);

            if (!jetzt) {
                veraltet.push(`${datei}: keine Doppelung mehr — aus SELF_DUPLICATION_BASELINE entfernen. 🎉`);
                return;
            }

            if (jetzt.laenge < baseline) {
                veraltet.push(
                    `${datei}: auf ${jetzt.laenge} Zeilen geschrumpft — Baseline von ${baseline} nachziehen.`
                );
            }
        });

        if (veraltet.length > 0) {
            throw new Error(`SELF-DUPLICATION BASELINE VERALTET:\n  - ${veraltet.join('\n  - ')}`);
        }
    });

    it('findet ueberhaupt Doppelungen innerhalb von Dateien', () => {
        expect(selbstGefunden.size).toBeGreaterThan(0);
    });
});
