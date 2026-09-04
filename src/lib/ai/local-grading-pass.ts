import { logger } from '@/lib/logger';
import { Task, AppSettings, CustomSkillDefinition } from '../../types';
import { GraphRunner } from '../grading/GraphRunner';
import type { GradingGraph } from '../grading/types';
import { TargetGoal } from '../grading/calc-trace-types';
import { evaluateCalcTrace } from '../grading/CalcTrace';
import { extractStudentAST } from '../grading/calc-trace-extraction';
import { splitTextByTasks } from '../task-utils';
import { shouldDisablePoints } from './prompt-builder';
import { extractStudentAnswersWithLLM } from './variable-extraction';
import { toErrorMessage } from '../error-message';

/**
 * Die deterministischen Engines vor dem KI-Aufruf laufen lassen.
 * ⚙️📐
 *
 * Wo ein Bewertungsgraph oder eine Rechenkette hinterlegt ist, rechnet Koreki
 * selbst — nachvollziehbar und reproduzierbar. Das Modell begruendet danach nur
 * noch. Dieser Lauf haengt die Ergebnisse an die Aufgaben, bevor sie an die KI
 * gehen.
 *
 * WARUM DIESE DATEI EXISTIERT
 * ---------------------------
 * Dieser Vorlauf stand ZWEIMAL da: einmal im `ai-orchestrator` fuer den
 * Client-Weg (PURE und Desktop rufen den Anbieter direkt) und einmal in
 * `pages/api/ai-correct` fuer den Server-Weg (SaaS und Community). Die beiden
 * Kopien waren auseinandergelaufen — und zwar zu Lasten des Server-Wegs:
 *
 * 1. Der Client setzte `task.targetGoal` VOR der Extraktion, der Server gar
 *    nicht. Scheitert die Extraktion, bleibt `targetGoal` auf dem Server damit
 *    leer. In `mapModelTask` faellt die Aufgabe dann durch alle drei Pruefungen
 *    auf `isCalcTraceTask` — und der Warnhinweis "ohne Sandbox-Pruefung, bitte
 *    manuell gegenpruefen" erscheint NICHT. Der Lehrer bekommt reine
 *    KI-Punkte auf eine Rechenaufgabe, ohne es zu erfahren. Betrifft Ziele aus
 *    eigenen Skills, weil dort `task.calcTrace` und `taskType === 'calc-trace'`
 *    beide nicht greifen.
 * 2. Der Client glich `maxPoints` vor der Extraktion ab, der Server danach —
 *    scheiterte sie, unterblieb der Abgleich serverseitig ganz.
 *
 * Architectural Vision §11 fordert ausdruecklich identische Qualitaet zwischen
 * PURE und STANDARD. Zwei getrennt gepflegte Kopien koennen das nicht halten.
 *
 * Die Aufgaben werden bewusst AN ORT UND STELLE veraendert: beide Aufrufer
 * schicken danach dasselbe `tasksLayout` an die KI und lesen es spaeter in
 * `parseCorrectionResult` wieder aus.
 */

export interface LocalGradingPassParams {
    tasksLayout: Task[];
    studentText: string;
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined;
    settings: AppSettings;
    /** Nur fuer die Logmeldung — auf welchem Weg der Lauf stattfindet. */
    herkunft: 'Client' | 'Server';
}

/**
 * Wie oft die Selbst-Korrektur der AST-Extraktion nachbessern darf.
 *
 * Bei Ollama nur einmal: ein lokales Modell braucht fuer denselben Aufruf ein
 * Vielfaches der Zeit, und der zweite Versuch bringt erfahrungsgemaess wenig.
 * Diese Bremse stand bisher nur auf dem Server-Weg — obwohl sie auf dem
 * Desktop, wo Ollama am haeufigsten laeuft, noch mehr Sinn ergibt.
 */
const maxRetriesFuer = (settings: AppSettings): number =>
    settings?.provider === 'ollama' ? 1 : 2;

/**
 * Der Schuelertext, der zu EINER Aufgabe gehoert.
 *
 * GEFUNDEN AM 03.09.2026. `splitTextByTasks` bezeichnet sich selbst als
 * `@deprecated ... LEGACY FALLBACK ... degraded safety net` und verweist auf
 * `task.content`. Dieser Weg ist trotzdem der einzige, den die Engine hat — und
 * `task.content` ist hier NICHT die Antwort des Schuelers, sondern der Abschnitt der
 * MUSTERLOESUNG: `ModelSolutionCard.handleSectionChange` schreibt ihn dort hinein.
 * Ihn zu verwenden hiesse, jedem Schueler die Loesung als seine eigene Antwort
 * unterzuschieben. `useCorrectionRun` loescht das Feld deshalb ausdruecklich, bevor
 * es den Schuelertext aufteilt — diese Zeile ist ein Warnschild, kein Beiwerk.
 *
 * Die Namenssuche verlangt, dass der Schueler den VOLLEN Aufgabennamen notiert.
 * Heisst die Aufgabe "Aufgabe a)" und schreibt der Schueler "a)", findet sie nichts
 * und liefert eine leere Zeichenkette — woraufhin JEDE Aufgabe das GANZE Blatt
 * bekommt.
 *
 * Was das anrichtet: Der Rechenweg einer Aufgabe enthaelt dann die Schritte aller
 * anderen. Bei einer Physik-Aufgabe des Pruefsatzes fiel Proof A in Teilaufgabe b)
 * ueber einen Rechenfehler, den der Schueler in a) gemacht hatte — derselbe Fehler,
 * zweimal bestraft.
 *
 * Das ganze Blatt bleibt der letzte Rueckfall: auf gar keinem Text zu bewerten waere
 * schlimmer. Aber es wird gemeldet, statt still zu geschehen.
 */
const textFuerAufgabe = (
    task: Task,
    rawSplit: string[],
    index: number,
    gesamttext: string,
    herkunft: string
): string => {
    const teil = (rawSplit[index] || '').trim();
    if (teil.length > 0) return teil;

    logger.warn(
        `[${herkunft}] Kein eigener Textabschnitt fuer die Aufgabe gefunden — die Engine `
        + `rechnet auf dem GESAMTEN Schuelertext. Rechenschritte anderer Teilaufgaben `
        + `koennen dieser angelastet werden.`,
        { taskName: task.name }
    );
    return gesamttext;
};

/*
 * Der Graph-Zweig haengt ausschliesslich am tatsaechlich angehaengten Graphen.
 * Beide frueheren Kopien haben daneben ein `isGraphSkill` berechnet (taskType
 * 'vlsm', `skill-calc-*`, `isGraphBased`) und es in keiner der beiden
 * Bedingungen verwendet. Toter Code, bewusst NICHT wiederbelebt: ohne
 * angehaengten Graphen bekaeme `GraphRunner.grade` nichts zu rechnen.
 */

/** Ist die Aufgabe ueber eine Rechenkette zu pruefen? */
const istRechenkettenAufgabe = (task: Task, customSkills: Record<string, CustomSkillDefinition>): boolean =>
    !!task.targetGoal
    || !!task.calcTrace
    || task.taskType === 'calc-trace'
    || (!!task.taskType && !!customSkills[task.taskType]?.isCalcTrace);

async function bewerteMitGraph(task: Task, graph: GradingGraph, aufgabenText: string, p: LocalGradingPassParams): Promise<void> {
    const studentValues = await extractStudentAnswersWithLLM(
        aufgabenText, graph, p.appMode, p.settings, task.taskType, task.name
    );

    const gradingResult = GraphRunner.grade(graph, studentValues);
    task.gradingResult = gradingResult;

    if (!shouldDisablePoints(task.taskType, task.gradingGraph)) {
        task.pointsObtained = gradingResult.totalPoints;
        task.maxPoints = gradingResult.maxPoints;
    }
}

async function bewerteMitRechenkette(
    task: Task,
    aufgabenText: string,
    p: LocalGradingPassParams
): Promise<void> {
    const customSkills = p.settings?.customSkills || {};
    const targetGoal: TargetGoal = task.targetGoal
        || (task.taskType ? customSkills[task.taskType]?.targetGoal : undefined)
        || { targetValue: 0, maxPoints: Number(task.maxPoints || 0) };

    // Vor der Extraktion setzen: Scheitert sie, muss die Aufgabe trotzdem als
    // CalcTrace-Aufgabe erkennbar bleiben, sonst greift der Warnhinweis nicht
    // (betrifft Ziele, die aus einem eigenen Skill statt von der Aufgabe kommen).
    task.targetGoal = targetGoal;

    // Die in der Oberflaeche gesetzte Punktzahl der Aufgabe hat Vorrang. Sie stammt
    // von der Lehrkraft; die des TargetGoals ist bestenfalls daraus abgeleitet.
    const eigenePunkte = Number(task.maxPoints ?? 0);
    if (eigenePunkte > 0) {
        if (targetGoal.maxPoints && targetGoal.maxPoints !== eigenePunkte) {
            logger.warn(`[${p.herkunft}] TargetGoal nennt ${targetGoal.maxPoints} Punkte, die Aufgabe ${eigenePunkte}. Es gilt die Aufgabe.`, { taskName: task.name });
        }
    } else {
        task.maxPoints = targetGoal.maxPoints || task.maxPoints;
    }

    let astResult = await extractStudentAST(aufgabenText, p.appMode, p.settings, task.name);
    let calcTraceResult = evaluateCalcTrace(astResult, targetGoal);

    const maxRetries = maxRetriesFuer(p.settings);
    let retryCount = 0;

    // Nur Extraktionsfehler sind einen zweiten Versuch wert. Ein "Rechenfehler"
    // ist das korrekte Urteil ueber die Schuelerloesung, kein Fehler von uns.
    const nochmalVersuchen = () =>
        !calcTraceResult?.isGoalReached
        && calcTraceResult?.ast && calcTraceResult.ast.length > 0
        && calcTraceResult?.sandboxErrors
        && calcTraceResult.sandboxErrors.some(err => !err.startsWith('Rechenfehler'));

    while (nochmalVersuchen() && retryCount < maxRetries) {
        const extractionErrors = calcTraceResult.sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));
        logger.warn(`[${p.herkunft}] CalcTrace Sandbox validation failed (extraction errors). Retrying self-correction (${retryCount + 1}/${maxRetries}):`, extractionErrors);

        const correctionInstruction = `Die mathematische Sandbox hat Fehler in deinem extrahierten AST gefunden:\n${extractionErrors.join('\n')}\nBitte extrahiere den AST neu, beachte die Syntax für mathjs, und erfinde keine Rechenschritte, die der Schüler nicht gemacht hat.`;
        try {
            astResult = await extractStudentAST(aufgabenText, p.appMode, p.settings, task.name, astResult, correctionInstruction);
        } catch (retryErr) {
            // Der erste Durchlauf hat ein verwertbares Ergebnis geliefert. Ein
            // gescheiterter Nachbesserungsversuch darf es nicht verwerfen.
            logger.warn(`[${p.herkunft}] CalcTrace self-correction retry failed, keeping previous result.`, {
                taskName: task.name, error: toErrorMessage(retryErr)
            });
            break;
        }
        calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
        retryCount++;
    }

    // Die Engine vergibt keine Punkte mehr, das macht das LLM.
    task.calcTraceResult = calcTraceResult;
}

/**
 * Laesst Graph- und Rechenketten-Engine ueber die Aufgaben laufen.
 *
 * Aendert `tasksLayout` an Ort und Stelle. Fehler einer einzelnen Aufgabe
 * brechen den Lauf nicht ab: die betroffene Aufgabe faellt in den Warnhinweis
 * "bitte manuell gegenpruefen" statt auf null Punkte.
 */
export async function runLocalGradingEngines(p: LocalGradingPassParams): Promise<void> {
    const { tasksLayout, studentText, settings } = p;
    if (!tasksLayout || !Array.isArray(tasksLayout)) return;

    const customSkills = settings?.customSkills || {};
    const rawSplit = splitTextByTasks(studentText, tasksLayout);

    for (let i = 0; i < tasksLayout.length; i++) {
        const task = tasksLayout[i];
        const aufgabenText = textFuerAufgabe(task, rawSplit, i, studentText, p.herkunft);

        // Das Urteil der vorigen Arbeit loeschen, BEVOR gerechnet wird.
        //
        // GEFUNDEN BEIM ARCHITEKTUR-REVIEW, 02.09.2026. Beide Engine-Zweige
        // schreiben ihr Ergebnis erst am ENDE in die Aufgabe. Scheitert der
        // Lauf davor, faengt die Schleife den Fehler ab und protokolliert ihn —
        // aber das Feld behaelt seinen alten Inhalt.
        //
        // Das faellt nur auf dem Client-Weg auf, und dort schwer: `useCorrectionRun`
        // reicht fuer JEDE Arbeit des Stapels DIESELBE `tasksLayout`-Referenz
        // durch, und diese Funktion aendert sie an Ort und Stelle. Scheitert die
        // Extraktion bei der fuenften Schuelerin, bewertet `mapLayoutTask` sie
        // anschliessend mit dem Sandbox-Urteil des vierten Schuelers — nicht mit
        // einer Warnung, sondern mit fremden Punkten, die plausibel aussehen.
        // Auf dem Server-Weg ist der Layout-Baum je Anfrage frisch; dort trat es
        // nie auf. Wieder eine Regel, die auf einem Weg hielt und auf dem
        // anderen nicht.
        //
        // Der Kommentar am `catch` unten beschreibt bereits die richtige Absicht
        // ("faellt in den Warnhinweis statt auf null Punkte"). Sie galt nur,
        // wenn das Feld vorher leer war. Hier wird sie hergestellt.
        task.calcTraceResult = undefined;
        task.gradingResult = undefined;

        if (task.gradingGraph) {
            try {
                await bewerteMitGraph(task, task.gradingGraph, aufgabenText, p);
            } catch (err) {
                logger.error(`[${p.herkunft}] Error in GraphRunner execution`, {
                    taskName: task.name, error: toErrorMessage(err)
                });
            }
        } else if (istRechenkettenAufgabe(task, customSkills)) {
            try {
                await bewerteMitRechenkette(task, aufgabenText, p);
            } catch (err) {
                // Kein calcTraceResult -> die Aufgabe laeuft in den Warnhinweis "ohne
                // Sandbox-Pruefung, bitte manuell gegenpruefen" statt in 0 Punkte.
                logger.error(`[${p.herkunft}] CalcTrace execution failed — task falls back to manual review.`, {
                    taskName: task.name, error: toErrorMessage(err)
                });
            }
        }
    }
}
