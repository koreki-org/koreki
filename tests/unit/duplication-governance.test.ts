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
 * VERFAHREN
 * ---------
 * Jede Datei wird von Kommentaren und Leerraum befreit; Zeilen unter 25
 * Zeichen fallen weg, weil `}` oder `return;` in jeder Datei stehen. Ueber den
 * Rest laufen Fenster von 6 Zeilen, die gehasht werden. Ein Hash in zwei
 * verschiedenen Dateien ist ein wortgleicher Block.
 *
 * RATSCHEN-PRINZIP (wie bei any-governance und file-size-governance)
 * - Ein neues Dateipaar mit Doppelung faellt durch.
 * - Ein bekanntes Paar darf nicht laenger werden.
 * - Wird es kuerzer, muss die Baseline mit.
 * - Verschwindet die Doppelung, muss der Eintrag raus.
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
    'components/settings/AiProfileSidebar.tsx <-> components/settings/ProfileModules.tsx': 9,
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
    'hooks/usePromptProfiles.ts <-> hooks/useSkillProfiles.ts': 7,
    'pages/agb.tsx <-> pages/privacy.tsx': 7,
    'pages/api/clean-and-analyze.ts <-> pages/api/extract-image.ts': 7,
    'pages/api/clean-and-map.ts <-> pages/api/extract-image.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/second-opinion.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/user/grading-memories/anonymize.ts': 7,
    'pages/api/extract-image.ts <-> pages/api/user/grading-memories/generate.ts': 7,
    'pages/impressum.tsx <-> pages/privacy.tsx': 7,
    'components/batch/BatchFileListItem.tsx <-> components/batch/BatchItemDoneView.tsx': 6,
    'components/guards/AuthGuard.tsx <-> pages/login.tsx': 6,
    'components/settings/MistralConfig.tsx <-> components/settings/OpenAICompatibleConfig.tsx': 6,
    'hooks/useAiProfiles.ts <-> hooks/usePromptProfiles.ts': 6,
    'hooks/useAiProfiles.ts <-> hooks/useSkillProfiles.ts': 6,
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
    ohneBloecke.split('\n').forEach((zeile, index) => {
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

/** Laengster zusammenhaengender Block je Dateipaar. */
const findeDoppelungen = (dateien: string[]): Map<string, { laenge: number; wo: string }> => {
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

    // Zusammenhaengende Fenster zu einem Block verschmelzen
    const ergebnis = new Map<string, { laenge: number; wo: string }>();
    treffer.forEach((fenster, schluessel) => {
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

        const start = fenster.get(bestStart)!;
        ergebnis.set(schluessel, {
            laenge: bestLaenge,
            wo: `${start.datei}:${start.startZeile}`
        });
    });

    return ergebnis;
};

describe('Duplication Governance', () => {
    const sourceFiles = getFilesRecursively(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    const gefunden = findeDoppelungen(sourceFiles);

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
});
