import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Industrial Grade Size Governance (Layer 1)
 * 📏🛡️
 *
 * CLAUDE.md fordert Komponenten unter 300 Zeilen. Die Regel stand bisher nur
 * im Dokument — 24 Dateien haben sie gerissen, ohne dass es jemandem auffiel.
 * Genau dasselbe Muster wie beim Security-Audit: eine Regel ohne Waechter
 * driftet, eine Regel mit Waechter haelt.
 *
 * RATSCHEN-PRINZIP
 * ----------------
 * Ein naiver Test wuerde hier sofort 24-mal fehlschlagen, jemand setzt ihn auf
 * `skip`, und dann ist er schlechter als kein Test. Stattdessen frieren die
 * Baselines unten den IST-Zustand ein:
 *
 * - Neue Dateien muessen die Grenze einhalten.
 * - Bestandsdateien duerfen nicht weiter WACHSEN.
 * - Wer eine Bestandsdatei verkleinert, senkt ihren Baseline-Wert mit.
 * - Faellt eine Datei unter die Grenze, verlangt der Test das Entfernen aus
 *   der Baseline — die Liste kann damit nur schrumpfen, nie wachsen.
 *
 * Eine neue Datei in die Baseline aufzunehmen ist erlaubt, aber eine bewusste
 * Entscheidung: sie steht im Diff und braucht eine Begruendung im Review.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Grenzen nach Bereich.
 *
 * `lib/` liegt hoeher, weil ein kohaerentes Domaenenmodul legitim laenger sein
 * darf. Ein Auswerter, der kuenstlich in zwei Haelften gesaegt wird, ist danach
 * schlechter, nicht besser. Bei Komponenten und Hooks geht es dagegen um den
 * Zustandsfluss: darueber ist er nicht mehr ueberblickbar.
 *
 * Was den Unterschied macht, zeigt CalcTrace.ts: die Datei ist nicht halbiert
 * worden, sondern hat zwei geschlossene TEILGEBIETE abgegeben, die sie nur
 * benutzt hat (`grading/units`, `grading/numeric-tolerance`). Der Auswerter
 * selbst steht weiter am Stueck. Wer hier kuerzt, sucht solche Naehte — nicht
 * eine Stelle, an der die Zeilenzahl passt.
 */
const LIMITS: Record<string, number> = {
    lib: 500,
    // Wie `lib/`, und aus einem staerkeren Grund: eine Typ-Sammlung hat GAR
    // KEINEN Kontrollfluss. Die 300 gelten fuer Komponenten und Hooks, weil
    // darueber der Zustandsfluss unlesbar wird — bei Interfaces gibt es
    // nichts, dem man folgen muesste. Sie stand hier nur, weil `types/`
    // urspruenglich nicht bedacht war und in den Standardwert fiel.
    types: 500,
    components: 300,
    hooks: 300,
    pages: 300
};
const DEFAULT_LIMIT = 300;

/** Maximale Zahl an Hook-Aufrufen pro Komponente. */
const HOOK_LIMIT = 10;

/**
 * Altlasten, eingefroren am 10.08.2026. Werte sind Zeilenzahlen.
 * NUR SENKEN, NIE ANHEBEN.
 *
 * Ausnahme, bewusst und einmalig: vier Eintraege wurden beim Umstieg auf
 * strictNullChecks um je eine Zeile angehoben (GradingMemoryStartScreen,
 * DashboardModals, useProcessingPipeline, prompt-builder). Ursache ist in allen
 * vier Faellen NOTWENDIGER Code — eine const-Bindung, damit eine Typverengung
 * im Callback erhalten bleibt, bzw. eine Typangabe gegen `never`. Kommentare
 * wurden vorher entfernt, es war nichts mehr zu kuerzen.
 *
 * Zweite Ausnahme, 17.08.2026: sechs Eintraege um je EINE Zeile angehoben
 * (GradingGraphModal, BatchTaskAnalysisCard, SecondOpinionDrawer,
 * useProcessingPipeline, CalcTrace, app.tsx). Es ist in allen sechs Faellen
 * dieselbe Zeile — der Import aus `lib/error-message`, der 62 `catch (x: any)`
 * abgeloest hat. Eine Import-Zeile gegen ein abgeschaltetes `any` pro Block ist
 * ein guter Tausch; die betroffenen Dateien sind dadurch netto STRENGER
 * geprueft als vorher.
 */
const SIZE_BASELINE: Record<string, number> = {
    // 1459 -> 507: erst vier Reiter als eigene Panels, jetzt der Zustand in
    // vier Hooks unter hooks/grading-graph/. Hook-Aufrufe 25 -> 10, damit aus
    // HOOK_BASELINE verschwunden.
    'components/batch/GradingGraphModal.tsx': 507,
    // Die beiden groessten Reiter aus dem Modal, bewusst aufgenommen: sie sind
    // unveraendert umgezogen (reine Darstellung, kein Zustand untereinander).
    // Ein Zerlegen waere ein zweiter, eigener Schritt — den 1404-Zeiler zuerst
    // in vier benannte Reiter zu trennen ist der groessere Gewinn.
    'components/batch/parts/GraphEditorPanel.tsx': 456,
    'components/batch/parts/GraphAiPanel.tsx': 345,
    // 1205 -> 561: Skill-Persistenz nach lib/skills/skill-persistence.ts,
    // Autopilot nach hooks/useModelSolutionAutopilot.ts, Ableitungen nach
    // hooks/useModelSolutionDerivations.ts. Hook-Aufrufe 16 -> 10, damit aus
    // HOOK_BASELINE verschwunden.
    'components/upload/ModelSolutionCard.tsx': 562,
    // +1 fuer den Typ-Import, der ein `useState<any>` durch CustomSkillDefinition
    // ersetzt (noImplicitAny-Durchgang). Ein `any` weniger ist die Zeile wert.
    // +42 gegenueber 793: der Ansichtstyp SkillListenEintrag und die
    // ausgeschriebenen Signaturen haben ALLE 12 `any` dieser Datei abgeloest.
    // 1033 -> 525: der Skill-Editor liegt jetzt als SkillEditorPanel daneben,
    // sein Motor-Abschnitt als SkillEngineSection. Beide neuen Dateien halten
    // die 300er-Grenze ein — deshalb stehen sie nicht hier.
    'components/settings/SkillsModules.tsx': 527,
    'components/settings/AiProfileModules.tsx': 402,
    // 704 -> 411: die reinen Helfer nach lib/skills/skill-dedup, die
    // Skill-Verwaltung nach hooks/skills/useCustomSkillCrud, und die sechs
    // Desktop/SaaS-Verzweigungen nach lib/skills/skill-profile-store.
    // Weiterhin ueber der Grenze — der naechste Schnitt trennt Profil-Auswahl
    // von Editor-Zustand.
    'hooks/useSkillProfiles.ts': 410,
    // 598 -> 495: die vier Generierungs-Handler liegen als
    // useTaskEngineGeneration daneben.
    //
    // HIER BEWUSST STEHENGEBLIEBEN. Der Rest ist fast ausschliesslich
    // JSX-Verdrahtung: allein `UploadGrid` bekommt 45 Requisiten, `Header` 73
    // Zeilen. Diesen Block in eine weitere Datei zu schieben verlagert die
    // Verdrahtung nur und legt eine Durchreich-Ebene darueber, in der jede
    // Requisite ein zweites Mal deklariert werden muesste — das macht es
    // schlechter, nicht besser.
    //
    // Der echte Schnitt liegt bei den KINDERN: `UploadGrid` sollte die
    // Orchestrator-Objekte entgegennehmen statt 45 Einzelwerte. Das ist eine
    // Schnittstellen-Aenderung an einer grossen Komponente und gehoert in einen
    // eigenen Schritt.
    // 495 -> 488: die beiden .koreki-Exporte standen zweimal ausgeschrieben da,
    // unterschieden durch ein einziges `true`.
    'pages/app.tsx': 489,
    'components/batch/parts/BatchTaskAnalysisCard.tsx': 578,
    // +7: der Kommentar, warum beim Aktualisieren die bestehende Kennung
    // gewinnt. Ohne ihn wird die Zeile beim naechsten Aufraeumen entfernt.
    // 498 -> 468: Loeschen und Umbenennen gehen jetzt ueber den
    // gemeinsamen profile-store, nicht mehr ueber eigene Desktop/Server-Zweige.
    'hooks/useAiProfiles.ts': 469,
    // +5: initialTrace nimmt ausdruecklich beide Rechenketten-Formen entgegen —
    // der Rumpf unterschied sie schon, der Typ verschwieg es.
    'components/batch/CalcTraceModal.tsx': 430,
    // +13: der NutzerCache-Typ und die durchgezogenen Signaturen haben ALLE
    // 7 `any` dieser Datei abgeloest.
    // 436 -> 431: der optimistische Cache-Block stand dreimal wortgleich
    // darin (Expertise, Skill-Set, KI-Profil), knapp unter der
    // Nachweisgrenze des Duplikat-Waechters.
    'components/dashboard/DashboardModals.tsx': 432,
    // 420 -> 400: dieselbe Umstellung wie bei useAiProfiles.
    'hooks/usePromptProfiles.ts': 398, // s. useSkillProfiles — gleicher Wächter
    'components/batch/parts/SecondOpinionDrawer.tsx': 388,
    'components/settings/ProfileModules.tsx': 341,
    'pages/features.tsx': 347,
    // 342 -> 316: die Vorschau-Zeichnung ist nach lib/redaction-preview gezogen
    // (architectural-vision §6.1 — die Komponente steuert nur noch, WANN gezeichnet wird).
    'components/RedactionModal.tsx': 317,
    'components/layout/AppHeader.tsx': 335,
    // +24 gegenueber 306: Import-Knopf aus dem Inhaltsbereich in die
    // Seitenleiste gezogen und Ablagezone ergaenzt — beides zur Angleichung an
    // die drei Profil-Seitenleisten.
    'components/batch/GradingMemoryStartScreen.tsx': 330
};

/**
 * Komponenten mit zu vielen Hook-Aufrufen, eingefroren am 10.08.2026.
 * NUR SENKEN, NIE ANHEBEN.
 */
const HOOK_BASELINE: Record<string, number> = {
    'components/batch/parts/BatchTaskAnalysisCard.tsx': 13,
    'components/settings/OllamaConfig.tsx': 11
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
const limitFor = (relativePath: string) => LIMITS[relativePath.split('/')[0]] ?? DEFAULT_LIMIT;
const countLines = (content: string) => content.split(/\r?\n/).length;
/** Zaehlt Hook-Aufrufe: `useState(`, `useBatchStatus(`, ... — eigene Hooks eingeschlossen. */
/**
 * Der optionale Typparameter ist entscheidend. Bis 17.08.2026 stand hier nur
 * `use[A-Z]\\w*\\s*\\(` - damit war `useState<Foo>(` UNSICHTBAR, also die
 * Mehrzahl aller Aufrufe in TypeScript. 28 Komponenten wurden unterzaehlt,
 * GradingGraphModal mit 16 statt 25. Die Regel "hoechstens zehn Hooks" war
 * damit nie durchgesetzt; dass die HOOK_BASELINE danach WAECHST, ist kein
 * Rueckschritt, sondern der erste ehrliche Stand.
 *
 * Die innere Alternative erlaubt eine Ebene Verschachtelung, damit auch
 * `useState<Record<number, string>>(` erfasst wird.
 */
const countHooks = (content: string) =>
    (content.match(/\buse[A-Z]\w*\s*(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?\s*\(/g) || []).length;

describe('File Size Governance', () => {
    const sourceFiles = getFilesRecursively(SRC_DIR)
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    it('keeps every file within its size limit (existing offenders may only shrink)', () => {
        const violations: string[] = [];

        sourceFiles.forEach(filePath => {
            const relativePath = toRelative(filePath);
            const lines = countLines(readFileSync(filePath, 'utf8'));
            const baseline = SIZE_BASELINE[relativePath];
            const limit = limitFor(relativePath);

            if (baseline !== undefined) {
                if (lines > baseline) {
                    violations.push(
                        `${relativePath}: ${lines} Zeilen — Altlast wächst (Baseline ${baseline}). ` +
                        `Bestandsdateien dürfen nicht größer werden.`
                    );
                }
                return;
            }

            if (lines > limit) {
                violations.push(
                    `${relativePath}: ${lines} Zeilen — Grenze für '${relativePath.split('/')[0]}/' ist ${limit}. ` +
                    `Aufteilen, oder bewusst in SIZE_BASELINE aufnehmen und im Review begründen.`
                );
            }
        });

        if (violations.length > 0) {
            throw new Error(`SIZE GOVERNANCE:\n  - ${violations.join('\n  - ')}`);
        }
    });

    it('keeps component state manageable (max 10 hook calls)', () => {
        const violations: string[] = [];

        sourceFiles
            .filter(f => toRelative(f).startsWith('components/') && f.endsWith('.tsx'))
            .forEach(filePath => {
                const relativePath = toRelative(filePath);
                const hooks = countHooks(readFileSync(filePath, 'utf8'));
                const baseline = HOOK_BASELINE[relativePath];

                if (baseline !== undefined) {
                    if (hooks > baseline) {
                        violations.push(
                            `${relativePath}: ${hooks} Hook-Aufrufe — Altlast wächst (Baseline ${baseline}).`
                        );
                    }
                    return;
                }

                if (hooks > HOOK_LIMIT) {
                    violations.push(
                        `${relativePath}: ${hooks} Hook-Aufrufe — Grenze ist ${HOOK_LIMIT}. ` +
                        `Zustand in einen eigenen Hook auslagern (siehe hooks/file-processor/ als Vorbild).`
                    );
                }
            });

        if (violations.length > 0) {
            throw new Error(`HOOK GOVERNANCE:\n  - ${violations.join('\n  - ')}`);
        }
    });

    /**
     * Hält die Ratsche am Ziehen: sobald eine Altlast unter ihre Grenze fällt,
     * muss sie aus der Baseline verschwinden — sonst wäre sie ab da wieder
     * unbegrenzt wachsbar.
     */
    it('requires cleaned-up files to leave the baseline', () => {
        const stale: string[] = [];

        Object.entries(SIZE_BASELINE).forEach(([relativePath, baseline]) => {
            const filePath = join(SRC_DIR, relativePath);
            let lines: number;
            try {
                lines = countLines(readFileSync(filePath, 'utf8'));
            } catch {
                stale.push(`${relativePath}: existiert nicht mehr — aus SIZE_BASELINE entfernen.`);
                return;
            }

            if (lines <= limitFor(relativePath)) {
                stale.push(
                    `${relativePath}: nur noch ${lines} Zeilen und damit unter der Grenze — ` +
                    `aus SIZE_BASELINE entfernen. 🎉`
                );
            } else if (lines < baseline) {
                stale.push(
                    `${relativePath}: auf ${lines} Zeilen geschrumpft — Baseline von ${baseline} ` +
                    `auf ${lines} nachziehen, damit die Ratsche greift.`
                );
            }
        });

        Object.entries(HOOK_BASELINE).forEach(([relativePath, baseline]) => {
            const filePath = join(SRC_DIR, relativePath);
            try {
                const hooks = countHooks(readFileSync(filePath, 'utf8'));
                if (hooks <= HOOK_LIMIT) {
                    stale.push(`${relativePath}: nur noch ${hooks} Hooks — aus HOOK_BASELINE entfernen. 🎉`);
                } else if (hooks < baseline) {
                    stale.push(`${relativePath}: auf ${hooks} Hooks reduziert — Baseline nachziehen.`);
                }
            } catch {
                stale.push(`${relativePath}: existiert nicht mehr — aus HOOK_BASELINE entfernen.`);
            }
        });

        if (stale.length > 0) {
            throw new Error(`BASELINE VERALTET:\n  - ${stale.join('\n  - ')}`);
        }
    });
});
