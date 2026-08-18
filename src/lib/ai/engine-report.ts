import type { Task } from '../../types';
import { isEngineOwned, resolveEngineVerdict } from '../grading/criterion-source';
import type { GradingCriterion, TargetGoal, PerTargetResult } from '../grading/calc-trace-types';
import type { StepResult } from '../grading/types';
import { shouldDisablePoints } from './prompt-builder';
import { setzeEin } from '../prompt-placeholder';
import mathFallbackInstruction from '../../prompts/core/default/correction/math-engine/fallback-instruction.md';
import mathAutoInstruction from '../../prompts/core/default/correction/math-engine/auto-instruction.md';
import mathHybridInstruction from '../../prompts/core/default/correction/math-engine/hybrid-instruction.md';
import calcTraceTemplate from '../../prompts/core/default/correction/math-engine/calc-trace-template.md';
import mathHybridHeader from '../../prompts/core/default/correction/math-engine/hybrid-header.md';
import mathAutoHeader from '../../prompts/core/default/correction/math-engine/auto-header.md';

/**
 * Was die Engines gerechnet haben — als Bericht für das Modell.
 * 📐➡️💬
 *
 * Wo ein Bewertungsgraph oder eine Rechenkette hinterlegt ist, hat Koreki die
 * Aufgabe bereits deterministisch ausgewertet. Das Ergebnis geht als Vorbefund
 * in den Prompt: das Modell soll begründen, nicht neu rechnen.
 *
 * ABGRENZUNG (prompt-engineering §7): Hier steht nur die AUFBAU-Logik. Die
 * Instruktionstexte selbst liegen in `src/prompts/core/default/correction/
 * math-engine/` und werden nur eingesetzt — kein Instruktionstext als
 * Template-Literal in der Engine.
 */

/**
 * Bericht der Graph-Engine (PANG) für alle Aufgaben mit Ergebnis.
 *
 * Bei abgeschalteter Punktvergabe bekommt das Modell den Status ohne Punkte
 * (es entscheidet selbst), sonst die verbindliche Punktzahl.
 */
export function buildGraphEngineReport(tasksLayout: Task[]): string {
    let vorevaluierungBlock = '';
    tasksLayout.forEach(t => {
        if (t.gradingResult) {
            const disablePointsActive = shouldDisablePoints(t.taskType, t.gradingGraph);

            vorevaluierungBlock += `\n\n### MATHEMATISCH-DETERMINISTISCHE VOREVALUIERUNG FÜR "${t.name}":\n`;
            vorevaluierungBlock += (disablePointsActive ? mathHybridHeader : mathAutoHeader) + `\n\n`;
            vorevaluierungBlock += mathFallbackInstruction + `\n\n`;
            
            if (disablePointsActive) {
                vorevaluierungBlock += `- STATUS DER ENGINE: Der Graph wurde erfolgreich ausgewertet. Nutze ausschließlich die folgenden Detail-Ergebnisse (Korrekt/Falsch/Folgefehler) zur Bestimmung der finalen Punkte gemäß deiner Musterlösung.\n`;
            } else {
                vorevaluierungBlock += `- ZU VERGEBENDE PUNKTE: ${t.gradingResult.totalPoints} von max ${t.gradingResult.maxPoints} Punkten.\n`;
            }

            vorevaluierungBlock += `- DETAIL-ERGEBNISSE DER EINZELNEN SCHRITTE:\n`;
            t.gradingResult.stepResults.forEach((step: StepResult) => {
                const statusStr = step.status === 'correct' ? 'Korrekt' : 
                                step.status === 'consecutive_correct' ? 'Folgefehler-Kompensiert (Korrekt gewertet)' : 
                                'Fehlerhaft';
                vorevaluierungBlock += `  * Schritt/Variable "${step.variableId}": Schülerwert: "${step.studentValue !== undefined && step.studentValue !== null ? step.studentValue : 'nicht angegeben'}", Erwartet: "${step.expectedValue}", Status: ${statusStr}. ${step.note}\n`;
            });

            if (disablePointsActive) {
                vorevaluierungBlock += `\n` + mathHybridInstruction;
            } else {
                vorevaluierungBlock += `\n` + setzeEin(mathAutoInstruction, '{{POINTS}}', String(t.gradingResult.totalPoints));
            }
        }
    });
    return vorevaluierungBlock;
}

/**
 * Bericht der Rechenketten-Engine (CalcTrace) für alle Aufgaben mit Ergebnis.
 *
 * Liegen strukturierte Kriterien vor, wird jedes einzeln aufgeführt — mit dem
 * Hinweis, welche die Sandbox bereits entschieden hat und welche das Modell
 * beurteilen muss.
 */
export function buildCalcTraceEngineReport(tasksLayout: Task[]): string {
    let calcTraceVorevaluierungBlock = '';
    tasksLayout.forEach(t => {
        if (t.calcTraceResult) {
            const calcTraceResult = t.calcTraceResult; // const: Verengung gilt sonst nicht im Callback
            const targetGoal: Partial<TargetGoal> = t.targetGoal || {};
            const criteria = targetGoal.criteria;

            if (criteria && Array.isArray(criteria) && criteria.length > 0) {
                // Structured criteria path
                let criteriaBlock = `\n### STRUKTURIERTE BEWERTUNGSKRITERIEN FÜR "${t.name}":\n`;
                criteriaBlock += `Du MUSST die Punkte anhand der folgenden Liste vergeben. Bereits vorab durch die Sandbox aufgelöste Kriterien sind bindend und dürfen nicht verändert werden. Addiere die Punktwerte aller Kriterien exakt wie angegeben. WICHTIG - Zielgrößen-Isolation: Bewerte jedes Kriterium AUSSCHLIESSLICH anhand der ihm zugeordneten Zielgröße. Ein Rechen-, Werte- oder Ergebnisfehler bei EINER Zielgröße darf die Bewertung der Kriterien ANDERER Zielgrößen derselben Aufgabe unter keinen Umständen beeinflussen:\n\n`;
                
                // Nur Kriterien, die tatsaechlich das Modell entscheidet. Alles andere ist
                // bereits entschieden und wird nur noch mitgeteilt — es waere sinnlos, dafuer
                // eine Punktzahl anzufordern, die anschliessend verworfen wird.
                const zuBeurteilendeIds: string[] = [];

                criteria.forEach((crit: GradingCriterion) => {
                    const idx = (crit.targetIndex !== undefined && crit.targetIndex !== null) ? crit.targetIndex : 0;
                    const pt = calcTraceResult.perTargetResult?.find((r: PerTargetResult) => r.targetIndex === idx);
                    let statusText = '';

                    if (isEngineOwned(crit.source)) {
                        const verdict = resolveEngineVerdict(crit.source, idx, calcTraceResult);
                        statusText = verdict.erfuellt
                            ? `✓ ERFÜLLT — ${crit.punktwert} Punkte, bereits von der Sandbox entschieden (${verdict.begruendung})`
                            : `✗ NICHT ERFÜLLT — 0 Punkte, bereits von der Sandbox entschieden (${verdict.begruendung})`;
                    } else {
                        zuBeurteilendeIds.push(crit.id);

                        if (!pt || pt.associatedStepIds.length === 0) {
                            statusText = `[von dir zu beurteilen — Achtung: Für diesen Zielwert wurden keine Schritte im Schülertext gefunden]`;
                        } else {
                            const stepsStr = ` anhand der Schritte: ${pt.associatedStepIds.join(', ')}`;
                            // Formulierungshilfe, keine Zustaendigkeitsregel: Das Modell entscheidet
                            // hier so oder so, es bekommt nur den fachlichen Massstab dazu.
                            const istFormelKriterium = crit.id === 'formel' || crit.id.endsWith('_formel');
                            const pointsLabel = `${crit.punktwert} Punkt${crit.punktwert === 1 ? '' : 'e'}`;
                            const hint = istFormelKriterium
                                ? ` - HINWEIS: Formeln sind als ERFÜLLT (${pointsLabel}) zu werten, wenn die mathematische Struktur stimmt, auch bei Auslassung der linken Seite (z. B. nur U/R) oder bei Nutzung von Basis-Variablen wie R statt Rges!`
                                : '';
                            statusText = `[von dir zu beurteilen${stepsStr}${hint}]`;
                        }
                    }

                    criteriaBlock += `- Kriterium "${crit.id}" (${crit.label} - ${crit.punktwert} Punkte max): ${statusText}\n`;
                });

                if (zuBeurteilendeIds.length > 0) {
                    criteriaBlock += `\nGib im Feld "criteriaScores" ausschliesslich Eintraege fuer die von DIR zu beurteilenden Kriterien zurueck: ${zuBeurteilendeIds.map(id => `"${id}"`).join(', ')}. Die uebrigen Kriterien sind bereits entschieden — bewerte sie nicht erneut. "pointsObtained" ist die Summe aller Kriterien (die bereits entschiedenen plus die von dir bewerteten).\n`;
                } else {
                    criteriaBlock += `\nAlle Kriterien dieser Aufgabe sind bereits von der Sandbox entschieden. Gib keine "criteriaScores" zurueck. "pointsObtained" ist die Summe der oben ausgewiesenen Punkte.\n`;
                }

                // Kriterien mit "von dir zu beurteilen" ueberlassen dem Modell die Entscheidung.
                // Ohne die Engine-Anweisung fehlt ihm dabei jede Definition — etwa, dass eine
                // nachvollziehbare Rechenkette einen "Rechenweg" erfuellt. Sie gehoert deshalb
                // in beide Pfade, nicht nur in den Legacy-Zweig.
                criteriaBlock += `\n` + mathHybridInstruction;

                calcTraceVorevaluierungBlock += `\n` + criteriaBlock;
            } else {
                // Legacy path fallback
                const disablePointsActive = shouldDisablePoints(t.taskType, t.targetGoal);

                let templateStr = calcTraceTemplate;
                templateStr = setzeEin(templateStr, '{{TASK_NAME}}', t.name ?? '');
                templateStr = setzeEin(templateStr, '{{MATH_FALLBACK_INSTRUCTION}}', disablePointsActive ? mathHybridHeader : `Für diese Aufgabe wurde eine exakte mathematische Vorevaluierung durchgeführt. Nutze diese Ergebnisse zwingend als absolute, fehlerfreie Wahrheit!\n\n${mathFallbackInstruction}`);

                if (disablePointsActive) {
                    templateStr = setzeEin(templateStr, '{{ENGINE_STATUS_TEXT}}', `Die Rechenkette wurde ausgewertet. Nutze diese Information (ob Ziel erreicht oder nicht) zur Bestimmung der finalen Punkte gemäß deiner Musterlösung.`);
                } else {
                    templateStr = setzeEin(templateStr, '{{ENGINE_STATUS_TEXT}}', `Endziel erreicht: ${t.calcTraceResult.isGoalReached ? 'JA' : 'NEIN'}.`);
                }

                templateStr = setzeEin(templateStr, '{{POINTS_TEXT}}', `[Muss durch LLM auf Basis der Sandbox-Ergebnisse ermittelt werden (max ${t.calcTraceResult.maxPoints} P)]`);
                
                let detailsStr = '';
                if (t.calcTraceResult.reachedTargets && t.calcTraceResult.reachedTargets.length > 0) {
                    if (t.calcTraceResult.sandboxErrors && t.calcTraceResult.sandboxErrors.length > 0) {
                        detailsStr += `  * NOTIERTE ZAHLENWERTE (ACHTUNG: FIKTIV DURCH RECHENFEHLER, KEINE PUNKTE GEBEN!): ${t.calcTraceResult.reachedTargets.join(', ')}\n`;
                    } else {
                        detailsStr += `  * ERREICHTE MEILENSTEINE: ${t.calcTraceResult.reachedTargets.join(', ')}\n`;
                    }
                }
                if (t.calcTraceResult.missedTargets && t.calcTraceResult.missedTargets.length > 0) {
                    detailsStr += `  * VERFEHLTE ODER ÜBERSPRUNGENE MEILENSTEINE: ${t.calcTraceResult.missedTargets.join(', ')}\n`;
                }
                if (t.calcTraceResult.sandboxErrors && t.calcTraceResult.sandboxErrors.length > 0) {
                    detailsStr += `  * Sandbox Fehler: ${t.calcTraceResult.sandboxErrors.join(', ')}\n`;
                }
                templateStr = templateStr.replace('</engine_status>', `${detailsStr}</engine_status>`);

                templateStr = setzeEin(templateStr, '{{HYBRID_INSTRUCTION_BLOCK}}', mathHybridInstruction);
                
                calcTraceVorevaluierungBlock += `\n` + templateStr;
            }
        }
    });
    return calcTraceVorevaluierungBlock;
}
