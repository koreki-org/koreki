import { Task, AITask } from '../../types';
import { findeVeraenderteAufgabe } from './aufgabenname-zuordnung';
import { StepResult } from '../grading/types';
import { TargetGoal, GradingCriterion } from '../grading/calc-trace-types';
import { isEngineOwned, resolveEngineVerdict } from '../grading/criterion-source';
import { formatPluginFeedback } from '../grading/feedback-formatter';
import { formatCalcTraceForPrompt } from '../grading/CalcTrace';
import { shouldDisablePoints } from './prompt-builder';
import { alsModellzahl } from '../zahlen';

// Die Regel wohnt jetzt in `lib/zahlen` — sie wird auch beim Nachrechnen
// nach einer manuellen Punktekorrektur gebraucht. Hier weiterhin sichtbar,
// damit die Aufrufer nicht zwei Wege kennen muessen.
export { alsModellzahl };

/**
 * Eine Aufgabe der Musterloesung auf das KI-Ergebnis abbilden.
 * 🎯
 *
 * Vier Faelle, die sich gegenseitig ausschliessen — und die sich darin
 * unterscheiden, WER die Punkte vergibt:
 *
 * 1. `mapCalcTraceTask`  — die Sandbox hat gerechnet, das Modell begruendet.
 * 2. `mapGraphTask`      — die PANG-Engine hat gerechnet, das Modell begruendet.
 * 3. `mapModelTask`      — nur das Modell hat bewertet.
 * 4. `mapMissingTask`    — das Modell hat die Aufgabe gar nicht geliefert.
 *
 * Sie standen als eine 330-Zeilen-Closure in `parseCorrectionResult`, mit drei
 * ueber alle Zweige hinweg beschriebenen Zaehlern. Wer dort etwas aendern
 * wollte, musste zuerst herausfinden, in welchem der vier Faelle er sich
 * befindet. Jetzt steht das im Funktionsnamen.
 */

/**
 * Was ein Zweig zurueckmeldet.
 *
 * Die beiden Flaggen ersetzen die frueheren Closure-Variablen. Sie werden
 * bewusst hier gemeldet statt beim Aufrufer aus dem Ergebnis abgeleitet: die
 * Marker-Pruefung gilt nur fuer den reinen Modell-Zweig, und aus der fertigen
 * Aufgabe waere nicht mehr erkennbar, aus welchem Zweig sie stammt.
 */
export interface TaskMappingResult {
    task: AITask;
    /** Text enthaelt (?)-Marker aus der Texterkennung — Confidence muss unter 90 bleiben. */
    markerIssue?: boolean;
    /** Aufgabe fehlte in der KI-Antwort vollstaendig. */
    mappingError?: boolean;
}

/**
 * Liest Kriterien-Punkte aus dem Freitext der Korrekturnotizen.
 *
 * Rueckfallebene: Der strukturierte Kanal `criteriaScores` hat Vorrang, weil
 * aktive Skills den Notizen ein eigenes Format vorschreiben duerfen.
 */
export function parseCriteriaScoresFromNotes(notes: string): Record<string, number> {
    const scores: Record<string, number> = {};
    if (!notes) return scores;

    // Erkennt: "- rges_formel: 1/1", "rges_formel: 1 / 1", "[rges_formel]: 1/1"
    const regex = /(?:^|\n)\s*[-*]?\s*\[?([a-zA-Z0-9_-]+)\]?\s*:\s*([0-9.]+)\s*\/\s*([0-9.]+)/g;
    let match;
    while ((match = regex.exec(notes)) !== null) {
        const id = match[1].trim();
        scores[id] = parseFloat(match[2]);
    }
    return scores;
}

/**
 * Name und Punktzahl der Musterloesung in die Form bringen, die `AITask` zusichert.
 *
 * `Task` kommt aus der Eingabemaske: `maxPoints` ist dort `number | string`,
 * weil der Lehrer sie tippt, und `name` ist optional. `AITask` sagt beides
 * verbindlich zu. Bisher stand am Ende der Abbildung ein `as AITask[]` — die
 * Zusicherung war damit nur behauptet, nicht hergestellt: eine getippte "10"
 * blieb als Zeichenkette in einem Feld, das eine Zahl verspricht.
 *
 * `undefined` bleibt `undefined`, weil `AITask.maxPoints` optional ist — daraus
 * eine 0 zu machen hiesse, eine nicht vergebene Punktzahl als "null Punkte"
 * darzustellen.
 */
function kopfAusLayout(layoutTask: Task): Pick<AITask, 'name' | 'maxPoints'> {
    const max = layoutTask.maxPoints;
    return {
        name: layoutTask.name ?? '',
        // `alsModellzahl` mit `NaN` als Rueckfall, damit eine untippbare Eingabe
        // ("zehn") zu `undefined` wird statt zu `NaN`: `AITask.maxPoints` ist
        // optional, ein NaN dagegen wandert in die Gesamtpunktzahl der Arbeit.
        maxPoints: Number.isFinite(alsModellzahl(max, NaN)) ? alsModellzahl(max, NaN) : undefined
    };
}

const CALC_TRACE_MARKER = '[📐 CalcTrace Engine - Mathematischer Abgleich]';
const SANDBOX_PROOF_MARKER = 'DETERMINISTISCHER BEWEIS (SANDBOX)';
const PANG_MARKER = '[⚙️ PANG Engine - Mathematischer Graph-Abgleich]';
const AGS_MARKER = '[⚙️ AGS Engine - Mathematischer VLSM Abgleich]';

/** Hat der Server das Feedback bereits formatiert? Dann bleibt es, wie es ist. */
const istBereitsFormatiert = (aiTask: AITask | undefined, marker: string[]): boolean =>
    !!aiTask?.feedback && marker.some(m => aiTask.feedback!.includes(m));

/**
 * Aufgabe mit deterministischer Rechenkette (CalcTrace).
 *
 * Die Sandbox liefert die Punkte fuer alles Rechnerische; das Modell steuert
 * nur dort etwas bei, wo Ermessen gefragt ist. Sandbox-belegte Kriterien sind
 * bindend und bilden die Untergrenze.
 */
export function mapCalcTraceTask(layoutTask: Task, aiTask: AITask | undefined): TaskMappingResult {
    const calcTraceResult = layoutTask.calcTraceResult!;
    let enginePoints: number;

    const targetGoal: Partial<TargetGoal> = layoutTask.targetGoal || {};
    const criteria = targetGoal.criteria;

    if (aiTask && criteria && Array.isArray(criteria) && criteria.length > 0) {
        // Primaerquelle ist das strukturierte Feld. Die correctionNotes bleiben nur
        // Rueckfallebene: Sie sind Freitext, und aktive Skills schreiben ihnen ein
        // eigenes Format vor — als Datenkanal sind sie unzuverlaessig.
        const structuredScores: Record<string, number> = {};
        // Nur BRAUCHBARE Werte uebernehmen. Sonst ueberschreibt ein Unsinn aus dem
        // strukturierten Kanal die Punktzahl, die aus den Notizen bereits sauber
        // gelesen wurde (die Zusammenfuehrung unten laesst `structuredScores`
        // gewinnen) — die Rueckfallebene waere damit ausgerechnet dann zerstoert,
        // wenn sie gebraucht wird.
        (aiTask.criteriaScores || []).forEach(entry => {
            if (entry && typeof entry.id === 'string') {
                const punkte = alsModellzahl(entry.points, NaN);
                if (Number.isFinite(punkte)) structuredScores[entry.id.trim()] = punkte;
            }
        });

        const notes = aiTask.correctionNotes || '';
        const parsedScores = { ...parseCriteriaScoresFromNotes(notes), ...structuredScores };

        let computedSum = 0;
        const finalCriteriaNotes: string[] = [];
        // Sandbox-belegte Kriterien sind bindend und bilden die Untergrenze.
        let sandboxFloor = 0;
        // Kriterien, deren Punktzahl sich nicht aus den Notizen lesen liess.
        let unreadableCriteria = 0;

        criteria.forEach((crit: GradingCriterion) => {
            const idx = (crit.targetIndex !== undefined && crit.targetIndex !== null) ? crit.targetIndex : 0;

            let pts = 0;
            let justification = '';

            // Exakt dasselbe Urteil, das der Prompt als bereits entschieden angekuendigt
            // hat — beide Seiten lesen dieselbe Funktion.
            const verdict = isEngineOwned(crit.source)
                ? resolveEngineVerdict(crit.source, idx, calcTraceResult)
                : undefined;

            // Ein unentschiedenes Urteil ist KEIN Urteil: Die Sandbox konnte den Fall
            // nicht belegen und hat ihn im Prompt dem Modell vorgelegt (siehe
            // `EngineVerdict.unentschieden`). Hier zaehlt deshalb die Punktzahl des
            // Modells — sonst waere die Frage gestellt und die Antwort verworfen.
            if (verdict && !verdict.unentschieden) {
                pts = verdict.erfuellt ? crit.punktwert : 0;
                justification = verdict.begruendung;
                sandboxFloor += pts;
            } else {
                // Ermessensfrage: Hier zaehlt die Punktzahl des Modells.
                const parsed = parsedScores[crit.id];
                // `Number.isFinite` statt `!== undefined`: Schickt das Modell
                // etwas Nicht-Numerisches ("drei", ein leeres Feld), ergab
                // `Number(...)` ein NaN — und NaN ist nicht `undefined`. Der
                // Rueckfall unten griff deshalb NICHT, das NaN wanderte durch
                // die Summe, und die ganze Aufgabe endete mit `NaN` Punkten
                // (18.08.2026 nachgestellt). Ein unlesbarer Wert ist dasselbe
                // wie ein fehlender.
                if (!Number.isFinite(parsed)) {
                    // Notizen nicht im erwarteten Format (z. B. weil aktive Skills eine
                    // andere Schreibweise verlangen). Frueher hiess das stillschweigend
                    // 0 Punkte — die Einschaetzung des Modells ging dabei verloren.
                    unreadableCriteria++;
                    pts = 0;
                    justification = 'KI-Einschätzung nicht auswertbar';
                } else {
                    pts = Math.min(crit.punktwert, Math.max(0, parsed));
                    // Wo die Sandbox zurueckgetreten ist, soll das in den Notizen stehen:
                    // Sonst sieht die Lehrkraft eine reine KI-Einschaetzung und weiss nicht,
                    // dass ein Rechenbeweis vorlag, der bewusst nicht entschieden hat.
                    justification = verdict?.unentschieden
                        ? 'KI-Einschätzung (Sandbox unentschieden: möglicher Folgefehler)'
                        : 'KI-Einschätzung';
                }
            }

            computedSum += pts;
            finalCriteriaNotes.push(`- ${crit.id}: ${pts} / ${crit.punktwert} (${justification})`);
        });

        enginePoints = computedSum;

        // Rueckfall, wenn mindestens ein LLM-Kriterium unlesbar war: die Gesamtpunktzahl
        // des Modells heranziehen, statt dessen Urteil auf 0 zu setzen. Sandbox-belegte
        // Kriterien bleiben dabei Untergrenze, das Aufgabenmaximum Obergrenze.
        // `Number.isFinite` statt `typeof === 'number'`: auch ein NaN ist vom Typ
        // `number`. Ohne die schaerfere Pruefung erzeugte ausgerechnet der
        // Rueckfall wieder das NaN, das er verhindern soll.
        if (unreadableCriteria > 0 && Number.isFinite(aiTask.pointsObtained)) {
            // Kein Deckel, wenn die getippte Maximalpunktzahl keine Zahl ist —
            // eine unlesbare Lehrer-Eingabe darf die Punkte nicht auf 0 kappen.
            const maxPoints = alsModellzahl(layoutTask.maxPoints, Infinity);
            const modelTotal = Math.min(maxPoints, Math.max(0, alsModellzahl(aiTask.pointsObtained, 0)));
            enginePoints = Math.max(computedSum, Math.max(sandboxFloor, modelTotal));

            if (enginePoints !== computedSum) {
                finalCriteriaNotes.push(`- Hinweis: ${unreadableCriteria} Kriterium/Kriterien ohne lesbare Einzelwertung — Gesamtpunktzahl der KI (${modelTotal}) herangezogen.`);
            }
        }

        // Re-write correctionNotes cleanly to prevent rounding errors or incorrect sums
        aiTask.correctionNotes = `[Kriterien-Bewertung]\n${finalCriteriaNotes.join('\n')}\n\nGesamtsumme: ${enginePoints} Punkte`;
    } else {
        // Ohne Kriterien zaehlt die Gesamtpunktzahl des Modells — sofern sie eine
        // Zahl ist. Ein NaN hier faerbte die gesamte Arbeit ein: die Note
        // rechnet sich aus der Summe aller Aufgaben.
        enginePoints = alsModellzahl(aiTask?.pointsObtained, 0);
    }

    if (istBereitsFormatiert(aiTask, [CALC_TRACE_MARKER, SANDBOX_PROOF_MARKER])) {
        return {
            task: {
                ...kopfAusLayout(layoutTask),
                pointsObtained: enginePoints,
                feedback: aiTask!.feedback,
                correctionNotes: aiTask!.correctionNotes || '',
                confidence: 95,
                content: aiTask!.content || ''
            }
        };
    }

    const stepFeedback = formatCalcTraceForPrompt(calcTraceResult, (layoutTask.targetGoal || {}) as TargetGoal);
    const aiFeedbackText = aiTask ? (aiTask.feedback || aiTask.content || '') : '';

    let finalFeedback = `${CALC_TRACE_MARKER}\n${stepFeedback}\n\n---\n\n`;
    finalFeedback += `[KI-Pädagogische Einschätzung]\n${aiFeedbackText || 'Die mathematische Prüfung wurde vollautomatisch durch die CalcTrace-Engine validiert.'}`;

    return {
        task: {
            ...kopfAusLayout(layoutTask),
            pointsObtained: enginePoints,
            feedback: finalFeedback,
            correctionNotes: aiTask ? (aiTask.correctionNotes || '') : '',
            confidence: 95,
            content: aiTask ? (aiTask.content || '') : ''
        }
    };
}

/**
 * Aufgabe mit deterministischem Bewertungsgraphen (PANG).
 *
 * Ist die Punktvergabe im Graphen abgeschaltet, entscheidet das Modell und der
 * Graph dient nur als Rueckfall — sonst sind die Graph-Punkte absolut.
 */
export function mapGraphTask(layoutTask: Task, aiTask: AITask | undefined): TaskMappingResult {
    const gradingResult = layoutTask.gradingResult!;
    const disablePointsActive = shouldDisablePoints(layoutTask.taskType, layoutTask.gradingGraph);
    const isServerResponse = istBereitsFormatiert(aiTask, [PANG_MARKER, AGS_MARKER]);

    // Der Graph ist die Untergrenze jedes Rueckfalls: Was die Engine gerechnet
    // hat, steht fest — nur eine BRAUCHBARE Zahl des Modells darf sie ersetzen.
    const graphPunkte = alsModellzahl(gradingResult.totalPoints, 0);

    let enginePoints: number;
    if (disablePointsActive) {
        // LLM decides (Hybrid): Prefer LLM points if available, fallback to PANG.
        // Die `typeof`-Pruefung bleibt bewusst erhalten — eine Zeichenkette soll
        // wie bisher auf den Graphen zurueckfallen. Neu ist nur, dass ein NaN
        // dasselbe tut, statt als gueltige Punktzahl durchzugehen.
        enginePoints = typeof aiTask?.pointsObtained === 'number' && Number.isFinite(aiTask.pointsObtained)
            ? aiTask.pointsObtained
            : graphPunkte;
    } else {
        // Rigid grading: PANG points are absolute.
        enginePoints = isServerResponse
            ? alsModellzahl(aiTask!.pointsObtained, graphPunkte)
            : alsModellzahl(gradingResult.totalPoints, alsModellzahl(layoutTask.pointsObtained, 0));
    }

    // Format a beautiful step-by-step breakdown as feedback
    let stepFeedback = '';
    let shownStepsCount = 0;

    const pluginFeedback = formatPluginFeedback(layoutTask.taskType || '', gradingResult, layoutTask.gradingGraph);
    if (pluginFeedback) {
        stepFeedback = pluginFeedback;
        shownStepsCount = gradingResult.stepResults.length;
    } else {
        gradingResult.stepResults.forEach((step: StepResult) => {
            // Frueher stand hier ein Filter auf `type === 'setup'`, um
            // "Setup-Variablen" auszublenden. `VariableType` kennt nur 'input'
            // und 'formula' — die Bedingung konnte nie zutreffen und hat nie
            // etwas ausgeblendet. Entfernt, statt sie weiter mitzuschleppen:
            // Eingaben und Formeln sollen ohnehin ALLE sichtbar sein, auch mit
            // null Punkten, damit die Extraktion nachvollziehbar bleibt.
            shownStepsCount++;

            const statusStr = step.status === 'correct' ? 'KORREKT' :
                step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK (Kulanz-Punkte erhalten)' :
                    'FEHLERHAFT (Primärfehler)';

            if (shownStepsCount === 1) {
                stepFeedback += `${PANG_MARKER}\n`;
            }

            stepFeedback += `• ${step.variableId}: Schülerwert: "${step.studentValue !== undefined && step.studentValue !== null ? step.studentValue : 'nicht angegeben'}" (Erwartet: "${step.expectedValue}") ➔ ${statusStr}\n`;
            if (step.note) {
                stepFeedback += `  Info: ${step.note}\n`;
            }
        });
    }

    // Idempotency check: If the feedback has already been formatted (e.g. on the server), return it as-is
    if (isServerResponse) {
        return {
            task: {
                ...kopfAusLayout(layoutTask),
                pointsObtained: enginePoints,
                feedback: aiTask!.feedback,
                correctionNotes: aiTask!.correctionNotes || '',
                confidence: 95,
                content: aiTask!.content || ''
            }
        };
    }

    const aiFeedbackText = aiTask ? (aiTask.feedback || aiTask.content || '') : '';

    let finalFeedback = '';
    if (shownStepsCount > 0) {
        finalFeedback += `${stepFeedback}\n---\n\n`;
    }
    finalFeedback += `[KI-Pädagogische Einschätzung]\n${aiFeedbackText || 'Die mathematische Prüfung wurde vollautomatisch durch die AGS-Graph-Engine fehlerfrei validiert.'}`;

    return {
        task: {
            ...kopfAusLayout(layoutTask),
            pointsObtained: enginePoints,
            feedback: finalFeedback,
            correctionNotes: aiTask ? (aiTask.correctionNotes || '') : '',
            confidence: 95,
            content: aiTask ? (aiTask.content || '') : ''
        }
    };
}

/**
 * Aufgabe, die allein das Modell bewertet hat.
 *
 * Hier haengt der Warnhinweis dran, wenn eine Rechenaufgabe ohne die
 * mathematische Sandbox durchgelaufen ist — der Lehrer muss wissen, dass diese
 * Punkte ungeprueft sind.
 */
export function mapModelTask(layoutTask: Task, aiTask: AITask): TaskMappingResult {
    const hasAttachedCalcTrace = !!layoutTask.calcTrace;
    const hasTargetGoal = !!layoutTask.targetGoal;
    const isCalcTraceTask = hasAttachedCalcTrace || hasTargetGoal || layoutTask.taskType === 'calc-trace';
    // Idempotency guard: if the server already ran CalcTrace and the feedback contains its
    // deterministic proof markers, the sandbox was NOT bypassed — even if calcTraceResult
    // is absent on the client-side tasksLayout (it's a server-only intermediate state).
    const calcTraceAlreadyFormatted = !!(aiTask.feedback?.includes('[📐 CalcTrace Engine') ||
        aiTask.feedback?.includes(SANDBOX_PROOF_MARKER));
    const isSandboxBypassed = isCalcTraceTask && !calcTraceAlreadyFormatted;

    let confidence = alsModellzahl(aiTask.confidence, 0);

    // --- MARKER PENALTY ---
    // If the cleaned text contains (?) markers, confidence MUST be < 90
    const markerIssue = !!aiTask.content?.includes('(?)');
    if (markerIssue && confidence >= 90) confidence = 89;

    let feedback = aiTask.feedback || '';
    if (isSandboxBypassed) {
        feedback = `⚠️ HINWEIS: Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung — bitte manuell gegenprüfen!\n\n${feedback}`;
    }

    return {
        task: {
            ...kopfAusLayout(layoutTask),
            pointsObtained: alsModellzahl(aiTask.pointsObtained, 0),
            feedback,
            correctionNotes: aiTask.correctionNotes || '',
            confidence,
            content: aiTask.content || '',
            sandboxBypassed: isSandboxBypassed ? true : undefined
        },
        markerIssue
    };
}

/**
 * Aufgabe, die das Modell nicht unter diesem Namen geliefert hat.
 *
 * Unterschieden wird bewusst zwischen einem blossen Schreibfehler im Namen
 * (Gross-/Kleinschreibung, Leerzeichen) und einer wirklich fehlenden Aufgabe:
 * im ersten Fall ist die Bewertung brauchbar und nur der Name schief, im
 * zweiten fehlt sie ganz und das ganze Dokument braucht einen Blick.
 */
export function mapMissingTask(
    layoutTask: Task,
    aiTasks: AITask[],
    allesLayout: Task[] = [layoutTask]
): TaskMappingResult {
    const gerettet = findeVeraenderteAufgabe(layoutTask, aiTasks, allesLayout);

    if (gerettet) {
        const nearMiss = gerettet.treffer;
        const hinweis = gerettet.art === 'kern'
            ? `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")`
            : `[KI-FEHLER?] Name gekuerzt oder erweitert ("${nearMiss.name}" statt "${layoutTask.name}") — Zuordnung war eindeutig, bitte pruefen`;
        // SOFT ERROR: Die Bewertung ist brauchbar, nur der Name war schief.
        // Punkte und Vertrauenswert bleiben, der Hinweis macht es sichtbar.
        return {
            task: {
                ...kopfAusLayout(layoutTask),
                pointsObtained: alsModellzahl(nearMiss.pointsObtained, 0),
                feedback: `${hinweis}\n\n${nearMiss.feedback || ''}`,
                correctionNotes: nearMiss.correctionNotes || '',
                confidence: alsModellzahl(nearMiss.confidence, 0),
                content: nearMiss.content || ''
            }
        };
    }

    // HARD ERROR: Task completely missing in AI response
    return {
        task: {
            ...kopfAusLayout(layoutTask),
            pointsObtained: 0,
            feedback: 'Vom System nicht erkannt oder von der KI übersprungen.',
            // ARCH: Kein `correctionNotes`. Hier liegt keine KI-Aufgabe vor, aus der
            // Notizen stammen koennten — die Aufgabe fehlt in der Antwort vollstaendig.
            // Ein leerer String waere zwar korrekt, behauptete aber, es habe einen
            // Notizzettel gegeben. Die Abwesenheit ist hier die Wahrheit.
            confidence: 0,
            content: ''
        },
        mappingError: true
    };
}

/**
 * Waehlt den zustaendigen Zweig.
 *
 * Die Reihenfolge ist bedeutsam: Wo eine Engine gerechnet hat, gilt deren
 * Ergebnis — das Modell darf es nicht ueberschreiben.
 */
export function mapLayoutTask(
    layoutTask: Task,
    aiTasks: AITask[],
    /**
     * Alle Aufgaben der Musterloesung.
     *
     * Nur fuer die Rettung eines veraenderten Namens: Ohne den Blick auf die
     * uebrigen Aufgaben laesst sich nicht feststellen, ob ein Treffer eindeutig
     * ist. Ohne Angabe verhaelt sich die Funktion wie zuvor.
     */
    allesLayout: Task[] = [layoutTask]
): TaskMappingResult {
    const aiTask = aiTasks.find((t: AITask) => t.name === layoutTask.name);

    if (layoutTask.calcTraceResult) return mapCalcTraceTask(layoutTask, aiTask);
    if (layoutTask.gradingResult) return mapGraphTask(layoutTask, aiTask);
    if (aiTask) return mapModelTask(layoutTask, aiTask);
    return mapMissingTask(layoutTask, aiTasks, allesLayout);
}
