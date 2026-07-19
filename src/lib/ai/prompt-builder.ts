import { Task, GradingMemoryCase } from '../../types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { PromptLibraryEntry, splitSkillSnippet } from './prompt-library';
import { getAvailablePluginManifest } from '../grading/graph-generator';

/**
 * Helper to determine whether deterministic PANG engine point awarding should be disabled (default true for custom tasks).
 * Enforces strict PANG scoring for system VLSM/RAID skills, unless explicitly overridden in the graph metadata.
 */
export function shouldDisablePoints(taskType?: string, gradingGraph?: any): boolean {
    if (gradingGraph && typeof gradingGraph.disablePoints === 'boolean') {
        return gradingGraph.disablePoints;
    }
    
    if (
        taskType === 'vlsm' || 
        taskType === 'skill-calc-vlsm'
    ) {
        return false;
    }
    
    return true;
}

// Centralized Default Templates
import correctionSystemDefault from '../../prompts/core/default/correction/system.md';
import correctionUserDefault from '../../prompts/core/default/correction/user.md';
import studentSimulatorSystemDefault from '../../prompts/student-simulator/system.md';
import studentSimulatorUserDefault from '../../prompts/student-simulator/user.md';
import mathFallbackInstruction from '../../prompts/core/default/correction/math-engine/fallback-instruction.md';
import mathAutoInstruction from '../../prompts/core/default/correction/math-engine/auto-instruction.md';
import mathHybridInstruction from '../../prompts/core/default/correction/math-engine/hybrid-instruction.md';
import calcTraceTemplate from '../../prompts/core/default/correction/math-engine/calc-trace-template.md';
import mathHybridHeader from '../../prompts/core/default/correction/math-engine/hybrid-header.md';
import mathAutoHeader from '../../prompts/core/default/correction/math-engine/auto-header.md';

import analyzeCleanSystemDefault from '../../prompts/core/default/analyze-and-clean/system.md';
import analyzeCleanUserDefault from '../../prompts/core/default/analyze-and-clean/user.md';

import analyzeMapSystemDefault from '../../prompts/core/default/analyze-and-map/system.md';
import analyzeMapUserDefault from '../../prompts/core/default/analyze-and-map/user.md';

import visionSystemDefault from '../../prompts/core/default/vision/system.md';
import visionUserDefault from '../../prompts/core/default/vision/user.md';



import secondOpinionSystemDefault from '../../prompts/second-opinion/system.md';
import secondOpinionUserDefault from '../../prompts/second-opinion/user.md';
import variableExtractionSystem from '../../prompts/core/default/variable-extraction/system.md';
import variableExtractionUser from '../../prompts/core/default/variable-extraction/user.md';
import calcTraceExtractionSystem from '../../prompts/calc-trace/extraction.md';
import anonymizeSystemDefault from '../../prompts/core/default/anonymize/system.md';


// Specialized Gemma4 Templates
import gemma4CorrectionGuard from '../../prompts/core/specialized/gemma4/correction/guard.md';
import gemma4AnalyzeCleanGuard from '../../prompts/core/specialized/gemma4/analyze-and-clean/guard.md';
import gemma4AnalyzeMapGuard from '../../prompts/core/specialized/gemma4/analyze-and-map/guard.md';



export interface StructuredPrompt {
    system: string;
    user: string;
    options?: {
        temperature: number;
        topP: number;
    }
}

/**
 * Builds the correction prompt for pedagogical grading.
 * Separates strict mathematical/pedagogical rules (System) from the actual content (User).
 */
export function buildCorrectionPrompt(
    modelSolution: string, 
    studentText: string, 
    tasksLayout?: Task[] | null, 
    customPrompt?: string, 
    model?: string,
    gradingMemory?: GradingMemoryCase[] | null,
    activeSkillIds?: string[], // Symmetrisches Grading Skills Center
    customSkills?: Record<string, PromptLibraryEntry> // Custom user-defined skills mapping
): StructuredPrompt {
    let system = correctionSystemDefault;
    let user = correctionUserDefault;

    if (model?.toLowerCase().includes('gemma')) {
        system = system + "\n\n" + gemma4CorrectionGuard;
    }
    
    // MIGRATION: Ignore legacy huge default prompts if stuck in DB
    let cleanCustom = customPrompt?.trim();
    if (cleanCustom && cleanCustom.startsWith('Du bist ein erfahrener Lehrer')) {
        cleanCustom = ''; 
    }

    const expertText = cleanCustom ? `\n\nPÄDAGOGISCHE SPEZIALISIERUNG DES LEHRERS (ERGÄNZUNG):\n${cleanCustom}\n\n` : '';
    system = system.replace('{{expertInstructions}}', expertText);

    // Dynamic compilation and injection of active modular skills
    let skillsSection = '';
    if (activeSkillIds && activeSkillIds.length > 0) {
        skillsSection = '\n\n### AKTIVIERTE BEWERTUNGS-SKILLS (STRIKT BEFOLGEN):\n';
        activeSkillIds.forEach(id => {
            const skillEntry = SKILL_REGISTRY[id];
            if (skillEntry) {
                const { correctionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
                skillsSection += `\n--- [KORREKTUR-SKILL: ${skillEntry.metadata.name}] ---\n${correctionSnippet.trim()}\n`;
            }
        });
        skillsSection += '\n--------------------------------------------\n';
    }

    if (system.includes('{{activeSkills}}')) {
        system = system.replace('{{activeSkills}}', skillsSection);
    } else {
        // Fallback: If template does not explicitly contain placeholder, append to system instructions safely
        system += skillsSection;
    }

    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        const layoutText = tasksLayout.map(t => `- ${t.name} (Max: ${t.maxPoints} P)`).join('\n');
        system += `\n\nACHTUNG: Du MUSST dich strikt an diese Aufgabenliste halten.\n\nStruktur:\n${layoutText}`;
        // Dynamic Injection of mathematical-deterministic Graph Runner Vorevaluierung (PANG Architecture)
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
                t.gradingResult.stepResults.forEach((step: any) => {
                    const statusStr = step.status === 'correct' ? 'Korrekt' : 
                                    step.status === 'consecutive_correct' ? 'Folgefehler-Kompensiert (Korrekt gewertet)' : 
                                    'Fehlerhaft';
                    vorevaluierungBlock += `  * Schritt/Variable "${step.variableId}": Schülerwert: "${step.studentValue !== undefined && step.studentValue !== null ? step.studentValue : 'nicht angegeben'}", Erwartet: "${step.expectedValue}", Status: ${statusStr}. ${step.note}\n`;
                });

                if (disablePointsActive) {
                    vorevaluierungBlock += `\n` + mathHybridInstruction;
                } else {
                    vorevaluierungBlock += `\n` + mathAutoInstruction.replace('{{POINTS}}', String(t.gradingResult.totalPoints));
                }
            }
        });
        if (vorevaluierungBlock) {
            system += vorevaluierungBlock;
        }
            // Dynamic Injection of mathematical-deterministic CalcTrace Vorevaluierung
        let calcTraceVorevaluierungBlock = '';
        tasksLayout.forEach(t => {
            if (t.calcTraceResult) {
                const targetGoal: any = t.targetGoal || {};
                const criteria = targetGoal.criteria;

                if (criteria && Array.isArray(criteria) && criteria.length > 0) {
                    // Structured criteria path
                    let criteriaBlock = `\n### STRUKTURIERTE BEWERTUNGSKRITERIEN FÜR "${t.name}":\n`;
                    criteriaBlock += `Du MUSST die Punkte anhand der folgenden Liste vergeben. Bereits vorab durch die Sandbox aufgelöste Kriterien sind bindend und dürfen nicht verändert werden. Addiere die Punktwerte aller Kriterien exakt wie angegeben:\n\n`;
                    
                    criteria.forEach((crit: any) => {
                        const idx = (crit.targetIndex !== undefined && crit.targetIndex !== null) ? crit.targetIndex : 0;
                        const pt = t.calcTraceResult.perTargetResult?.find((r: any) => r.targetIndex === idx);
                        let statusText = '';
                        
                        if (crit.source === 'proofB') {
                             if (pt && pt.reached && !pt.hasCalculationError) {
                                 statusText = `✓ ERFÜLLT -> ZWINGEND GENAU ${crit.punktwert} PUNKTE GEBEN (Sandbox-bestätigt für Schritt: ${pt.associatedStepIds.join(', ')})`;
                             } else if (pt && pt.reached && pt.hasCalculationError) {
                                 const errSteps = pt.associatedStepIds.filter((id: string) => t.calcTraceResult.sandboxErrors.some((err: string) => err.includes(id)));
                                 statusText = `✗ NICHT ERFÜLLT -> ZWINGEND 0 PUNKTE GEBEN (Rechenfehler in Schritten: ${errSteps.join(', ')})`;
                             } else {
                                 statusText = `✗ NICHT ERFÜLLT -> ZWINGEND 0 PUNKTE GEBEN (Zielwert nicht erreicht/nicht notiert)`;
                             }
                         } else if (crit.source === 'proofA') {
                             if (pt && pt.reached && !pt.hasCalculationError) {
                                 statusText = `✓ ERFÜLLT -> ZWINGEND GENAU ${crit.punktwert} PUNKTE GEBEN (Sandbox-bestätigt: keine Rechenfehler im Rechenweg)`;
                             } else if (pt && pt.reached && pt.hasCalculationError) {
                                 const errSteps = pt.associatedStepIds.filter((id: string) => t.calcTraceResult.sandboxErrors.some((err: string) => err.includes(id)));
                                 statusText = `✗ NICHT ERFÜLLT -> ZWINGEND 0 PUNKTE GEBEN (Rechenfehler im Rechenweg in Schritten: ${errSteps.join(', ')})`;
                             } else {
                                 statusText = `✗ NICHT ERFÜLLT -> ZWINGEND 0 PUNKTE GEBEN (Rechenweg nicht vorhanden)`;
                             }
                         } else {
                              // LLM criterion or values/formula pre-resolution
                              if (crit.id === 'einsetzen' || crit.id.endsWith('_werte') || crit.id.endsWith('_einsetzen')) {
                                  if (pt && pt.hasCorrectValues) {
                                      statusText = `✓ ERFÜLLT -> ZWINGEND GENAU ${crit.punktwert} PUNKTE GEBEN (Sandbox-bestätigt: Werte korrekt eingesetzt in Schritt: ${pt.associatedStepIds.join(', ')})`;
                                  } else {
                                      statusText = `✗ NICHT ERFÜLLT -> ZWINGEND 0 PUNKTE GEBEN (Keine korrekte Werteeinsetzung für diesen Zielwert gefunden)`;
                                  }
                              } else if (crit.id === 'formel' || crit.id.endsWith('_formel')) {
                                  if (!pt || pt.associatedStepIds.length === 0) {
                                      statusText = `✗ NICHT ERFÜLLT (Keine Schritte für diesen Zielwert im Schülertext gefunden)`;
                                  } else {
                                      const stepsStr = ` anhand der Schritte: ${pt.associatedStepIds.join(', ')}`;
                                      const hint = ' - HINWEIS: Formeln sind als ERFÜLLT (1 Punkt) zu werten, wenn die mathematische Struktur stimmt, auch bei Auslassung der linken Seite (z. B. nur U/R) oder bei Nutzung von Basis-Variablen wie R statt Rges!';
                                      statusText = `[von dir zu beurteilen${stepsStr}${hint}]`;
                                  }
                              } else {
                                  if (!pt || pt.associatedStepIds.length === 0) {
                                      statusText = `✗ NICHT ERFÜLLT (Keine Schritte für diesen Zielwert im Schülertext gefunden)`;
                                  } else {
                                      const stepsStr = ` anhand der Schritte: ${pt.associatedStepIds.join(', ')}`;
                                      statusText = `[von dir zu beurteilen${stepsStr}]`;
                                  }
                              }
                         }
                        
                        criteriaBlock += `- Kriterium "${crit.id}" (${crit.label} - ${crit.punktwert} Punkte max): ${statusText}\n`;
                    });
                    
                    calcTraceVorevaluierungBlock += `\n` + criteriaBlock;
                } else {
                    // Legacy path fallback
                    const disablePointsActive = shouldDisablePoints(t.taskType, t.targetGoal);

                    let templateStr = calcTraceTemplate;
                    templateStr = templateStr.replace('{{TASK_NAME}}', t.name);
                    templateStr = templateStr.replace('{{MATH_FALLBACK_INSTRUCTION}}', disablePointsActive ? mathHybridHeader : `Für diese Aufgabe wurde eine exakte mathematische Vorevaluierung durchgeführt. Nutze diese Ergebnisse zwingend als absolute, fehlerfreie Wahrheit!\n\n${mathFallbackInstruction}`);

                    if (disablePointsActive) {
                        templateStr = templateStr.replace('{{ENGINE_STATUS_TEXT}}', `Die Rechenkette wurde ausgewertet. Nutze diese Information (ob Ziel erreicht oder nicht) zur Bestimmung der finalen Punkte gemäß deiner Musterlösung.`);
                    } else {
                        templateStr = templateStr.replace('{{ENGINE_STATUS_TEXT}}', `Endziel erreicht: ${t.calcTraceResult.isGoalReached ? 'JA' : 'NEIN'}.`);
                    }

                    templateStr = templateStr.replace('{{POINTS_TEXT}}', `[Muss durch LLM auf Basis der Sandbox-Ergebnisse ermittelt werden (max ${t.calcTraceResult.maxPoints} P)]`);
                    
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

                    templateStr = templateStr.replace('{{HYBRID_INSTRUCTION_BLOCK}}', mathHybridInstruction);
                    
                    calcTraceVorevaluierungBlock += `\n` + templateStr;
                }
            }
        });
        if (calcTraceVorevaluierungBlock) {
            system += calcTraceVorevaluierungBlock;
        }
    }

    user = user.replace('{{modelSolution}}', modelSolution);
 
    let examplesText = '';
    if (gradingMemory && Array.isArray(gradingMemory) && gradingMemory.length > 0) {
        console.log(`[PromptBuilder] Injecting ${gradingMemory.length} grading memory cases into correction prompt.`);
        examplesText = '\n\n### WICHTIGER PÄDAGOGISCHER ERFAHRUNGSSCHATZ (BENOTUNGS-REFERENZ):\n';
        examplesText += 'Diese Beispiele zeigen dir, wie der Lehrer in der Vergangenheit bestimmte Typen von Fehlern bewertet hat. Sie dienen als Orientierung für deinen Bewertungsmaßstab (z. B. wie kulant oder streng du bei bestimmten Abweichungen sein sollst) und für die Formulierung deines Feedbacks.\n\n';
        examplesText += 'RICHTLINIEN FÜR DIE ANWENDUNG:\n';
        examplesText += '- Nutze dieselben Kriterien und Abzugsprinzipien für ähnliche Fehler des Schülers.\n';
        examplesText += '- Übernimm die pädagogischen Kernpunkte und Hinweise für dein Feedback, wenn der Schüler den gleichen konzeptionellen Fehler gemacht hat. Passe die Formulierung jedoch an die konkrete Schreibweise und die Variablen des aktuellen Schülers an.\n';
        examplesText += '- Vermeide das blinde Kopieren von Werten (wie IP-Adressen oder Zahlen) aus anderen Aufgabenstellungen, wenn diese für die aktuelle Aufgabe nicht relevant sind.\n\n';
        
        gradingMemory.forEach((item, index) => {
            examplesText += `<example id="${index + 1}">\n`;
            if (item.taskName) {
                examplesText += `[Betrifft Aufgabe]\n"${item.taskName}"\n\n`;
            }
            examplesText += `[Schülerantwort]\n"${item.studentText}"\n\n`;
            examplesText += `[Erwartete Bewertung]\n`;
            examplesText += `- Vergebene Punkte: ${item.expectedCorrection.pointsObtained}`;
            if (item.expectedCorrection.maxPoints !== undefined && item.expectedCorrection.maxPoints !== null) {
                examplesText += ` von ${item.expectedCorrection.maxPoints}`;
            }
            examplesText += `\n`;
            examplesText += `- Begründung (correctionNotes): "${item.expectedCorrection.correctionNotes}"\n`;
            if (item.expectedCorrection.feedback) {
                examplesText += `- Feedback: "${item.expectedCorrection.feedback}"\n`;
            }
            examplesText += '</example>\n\n';
        });
    } else {
        console.log('[PromptBuilder] No active grading memory cases to inject (gradingMemory is empty or null).');
    }

    if (examplesText) {
        user = user.replace('SCHÜLERABGABE (ZU BEWERTEN):', `<grading_memory>\n${examplesText}</grading_memory>\n\n<task_to_evaluate>\n### JETZT AKTUELL ZU BEWERTENDE SCHÜLERABGABE (DIESE STRENG UND EIGENSTÄNDIG BEWERTEN):\n`);
        user += `\n</task_to_evaluate>`;
    } else {
        user = user.replace('SCHÜLERABGABE (ZU BEWERTEN):', `<task_to_evaluate>\n### JETZT AKTUELL ZU BEWERTENDE SCHÜLERABGABE:\n`);
        user += `\n</task_to_evaluate>`;
    }

    user = user.replace('{{studentText}}', studentText);

    return { 
        system, 
        user,
        options: { temperature: 0.2, topP: 1.0 } // Pedagogical Flexibility
    };
}

/**
 * Builds the prompt for model solution analysis (Cleaning & Structuring).
 * HMR Trigger: 2026-06-20T15:25:00
 */
export function buildCleanAndAnalyzePrompt(modelSolution: string, model?: string): StructuredPrompt {
    let system = analyzeCleanSystemDefault;
    let user = analyzeCleanUserDefault;

    if (model?.toLowerCase().includes('gemma')) {
        system = system + "\n\n" + gemma4AnalyzeCleanGuard;
    }

    const manifest = getAvailablePluginManifest();
    const activeDomains = Array.from(new Set(manifest.map(m => m.domain)));
    const activeDomainsText = activeDomains.map(d => `"${d}"`).join(', ');

    if (system.includes('{{ACTIVE_DOMAINS}}')) {
        system = system.replace('{{ACTIVE_DOMAINS}}', activeDomainsText);
    } else {
        // Safe append if specialized template lacks the placeholder
        system = system.replace('suggestGraph = false ist.', `suggestGraph = false ist.\nErlaubte Plugin-Domänen: [ ${activeDomainsText} ].`);
    }

    user = user.replace('{{modelSolution}}', modelSolution);
    
    return { 
        system, 
        user,
        options: { temperature: 0.0, topP: 1.0 } // Verbatim Integrity
    };
}

/**
 * Builds the prompt for cleaning raw student text (digital PDFs).
 */
export function buildCleanAndMapPrompt(studentText: string, tasksLayout?: Task[], model?: string): StructuredPrompt {
    let system = analyzeMapSystemDefault;
    let user = analyzeMapUserDefault;

    if (model?.toLowerCase().includes('gemma')) {
        system = system + "\n\n" + gemma4AnalyzeMapGuard;
    }

    const layoutString = tasksLayout 
        ? tasksLayout.map(t => `- ${t.name} (${t.maxPoints} P)`).join('\n')
        : '';
    
    user = user.replace('{{tasksLayout}}', layoutString);
    user = user.replace('{{studentText}}', studentText);

    return { 
        system, 
        user,
        options: { temperature: 0.0, topP: 0.1 } // Structural Integrity (mild fuzziness allowed for misaligned bullet-points)
    };
}

/**
 * Builds the generic or specialized vision prompt.
 */
export function buildVisionPrompt(model?: string): StructuredPrompt {
    return {
        system: visionSystemDefault,
        user: visionUserDefault,
        options: { temperature: 0.0, topP: 1.0 } // Absolute Strictness / Greedy Mode
    };
}

/**
 * Builds the prompt for the synthetic student simulator.
 */
export function buildStudentSimulatorPrompt(modelSolution: string, tasksLayout?: Task[], selectedTasks?: string[]): StructuredPrompt {
    let system = studentSimulatorSystemDefault;
    let user = studentSimulatorUserDefault;

    user = user.replace('{{modelSolution}}', modelSolution);

    const layoutString = tasksLayout && Array.isArray(tasksLayout)
        ? tasksLayout.map(t => `- ${t.name} (Max: ${t.maxPoints} P)`).join('\n')
        : 'Keine explizite Struktur vorhanden. Nimm Standardaufgaben an.';
    
    user = user.replace('{{tasksLayout}}', layoutString);

    if (selectedTasks && selectedTasks.length > 0) {
        const selectedList = selectedTasks.map((t, idx) => {
            const types = ['TYPO', 'MATH_STEP_MISSING', 'SEMANTIC_LENIENT'];
            const assignedType = types[idx % types.length];
            return `- Aufgabe: "${t}" -> Simuliere Schülertyp: "${assignedType}"`;
        }).join('\n');

        user += `\n\n### AUSGEWÄHLTE AUFGABEN FÜR DIE SIMULATION:\n${selectedList}\n\n`;
        user += `WICHTIG: Generiere genau ${selectedTasks.length} Schülerantwort(en). Für JEDE der oben aufgelisteten ausgewählten Aufgaben genau eine Schülerantwort im exakten Schülertyp. Halte dich exakt an diese Liste.`;
    }

    return {
        system,
        user,
        options: { temperature: 0.7, topP: 0.9 } // High creativity for diverse answers
    };
}

/**
 * Builds the prompt for stylistic anonymization of student answers.
 * Removes personal writing style, rhetorical quirks, and concrete anecdotes,
 * presenting the core argument in the indicative, without change in meaning.
 * It is structured to return a JSON object with the key "anonymizedText" to conform
 * to Koreki's JSON-only API constraints.
 */
export function buildAnonymizePrompt(studentText: string): StructuredPrompt {
    return {
        system: anonymizeSystemDefault,
        user: `Zu anonymisierende Schülerantwort:\n"""\n${studentText}\n"""\n\nAbstrahierte, anonymisierte Version im JSON-Format:`,
        options: { temperature: 0.1, topP: 1.0 }
    };
}

/**
 * Builds the prompt for the Pedagogical Double-Check (Zweitblick)
 * Act as a senior pedagogical referee resolving grading doubts.
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Builds the prompt for the KI-Zweitmeinung / Besprechung Chat
 */
export function buildSecondOpinionPrompt(
    taskName: string,
    taskInstructions?: string,
    sampleSolution?: string,
    maxPoints?: number,
    studentText?: string,
    currentPoints?: number,
    currentFeedback?: string,
    teacherDoubt?: string,
    chatHistory?: ChatMessage[]
): StructuredPrompt {
    const safeTaskInstructions = taskInstructions?.trim() || 'Keine Angabe';
    const safeSampleSolution = sampleSolution?.trim() || 'Keine Angabe';
    const safeStudentText = studentText?.trim() || 'Keine Angabe';
    const safeCurrentFeedback = currentFeedback?.trim() || 'Keine Angabe';
    const safeTeacherDoubt = teacherDoubt?.trim() || 'Keine Angabe';
    const safeMaxPoints = maxPoints ?? 0;
    const safeCurrentPoints = currentPoints ?? 0;

    let historyText = '';
    if (chatHistory && chatHistory.length > 0) {
        historyText = '\n### BISHERIGER CHAT-VERLAUF:\n' + chatHistory.map(msg => 
            msg.role === 'user' ? `Lehrkraft: "${msg.content}"` : `Koreki: "${msg.content}"`
        ).join('\n') + '\n';
    }

    const system = secondOpinionSystemDefault;

    // Interpolate variables into User Prompt Markdown
    const user = secondOpinionUserDefault
        .replace(/{{taskName}}/g, taskName)
        .replace(/{{taskInstructions}}/g, safeTaskInstructions)
        .replace(/{{sampleSolution}}/g, safeSampleSolution)
        .replace(/{{maxPoints}}/g, String(safeMaxPoints))
        .replace(/{{studentText}}/g, safeStudentText)
        .replace(/{{currentPoints}}/g, String(safeCurrentPoints))
        .replace(/{{currentFeedback}}/g, safeCurrentFeedback)
        .replace(/{{historyText}}/g, historyText)
        .replace(/{{teacherDoubt}}/g, safeTeacherDoubt);

    return {
        system,
        user,
        options: { temperature: 0.1, topP: 1.0 }
    };
}

/**
 * Builds the prompt for semantic, highly-precise variable extraction from student text.
 */
export function buildVariableExtractionPrompt(studentText: string, variables: any[], extractionInstructions?: string, taskName?: string): StructuredPrompt {
    let system = variableExtractionSystem;
    let user = variableExtractionUser;

    if (taskName) {
        system += `\n\n### KONTEXT DER AUFGABE:\nDie Aufgabe, die der Schüler beantwortet, heißt: "${taskName}".\nNutze diesen Kontext zwingend, um Mehrdeutigkeiten aufzulösen (z. B. ob ein Wert die Netto-Kapazität der Aufgabe oder die Kapazität einer einzelnen Platte ist).\n`;
    }

    if (extractionInstructions) {
        system += `\n\n### SPEZIFISCHE EXTRAKTIONSRICHTLINIEN FÜR DIESEN AUFGABENTYP (STRIKT BEFOLGEN):\n${extractionInstructions}\n`;
    }

    const variablesList = variables.map(v => 
        `- ID: "${v.id}" (Typ: "${v.type}", Standardwert/Erwartet: "${v.defaultValue !== undefined ? v.defaultValue : 'keine Vorgabe'}")`
    ).join('\n');

    user = user.replace('{{studentText}}', studentText);
    user = user.replace('{{variablesList}}', variablesList);

    return {
        system,
        user,
        options: { temperature: 0.0, topP: 0.1 }
    };
}

/**
 * Builds the prompt for semantic, highly-precise CalcTrace variable extraction.
 */
export function buildCalcTraceExtractionPrompt(
    studentText: string,
    variables?: { id: string; label: string; unit?: string }[],
    taskName?: string,
    systemPrompt?: string,
    correctionInstruction?: string
): StructuredPrompt {
    if (systemPrompt) {
        // V6 AST Extraction
        let system = systemPrompt;
        if (taskName) {
            system += `\n\n### KONTEXT DER AUFGABE:\nDie Aufgabe heißt: "${taskName}".`;
        }
        let user = `Schülerantwort:\n"""\n${studentText}\n"""\n\nAntworte als reines JSON.`;
        if (correctionInstruction) {
             user += `\n\nKORREKTUR-ANWEISUNG:\n${correctionInstruction}`;
        }
        return { system, user, options: { temperature: 0.0, topP: 0.1 } };
    }

    // Fallback to V5 Variable Extraction
    let system = calcTraceExtractionSystem;
    if (taskName) {
        system += `\n\n### KONTEXT DER AUFGABE:\nDie Aufgabe, die der Schüler beantwortet, heißt: "${taskName}".\nNutze diesen Kontext zwingend, um Mehrdeutigkeiten aufzulösen.\n`;
    }
    const variablesList = variables ? variables.map(v =>
        `- ID: "${v.id}" (Label: "${v.label}", Einheit: "${v.unit || 'keine Vorgabe'}")`
    ).join('\n') : '';

    const user = `Schülerantwort:\n"""\n${studentText}\n"""\n\nZu extrahierende Variablen:\n${variablesList}\n\nAntworte als reines JSON.`;
    return { system, user, options: { temperature: 0.0, topP: 0.1 } };
}

// HMR Trigger: 2026-06-20T15:21:00 (Forces prompt recompilation)




