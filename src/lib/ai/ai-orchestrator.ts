import { logger } from '@/lib/logger';
import { apiClient } from '../api-client';
import { Task, AppSettings, AITask, AIAnalysisResult } from '../../types';
import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { AIAnalysisResultSchema } from '../validation';
import { isLocalInstance, isDesktopTarget } from '@/lib/env-context';
import { GraphRunner } from '../grading/GraphRunner';
import { parseGeneratedGraph, validateGraphDeterminism, GRADING_GRAPH_SCHEMA } from '../grading/graph-generator';
import { formatPluginFeedback } from '../grading/feedback-formatter';
import { GradingGraph, StepResult, VariableDefinition } from '../grading/types';
import { TargetGoal, GradingCriterion } from '../grading/calc-trace-types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { splitSkillSnippet } from './prompt-library';
import { splitTextByTasks } from '../task-utils';
import { evaluateCalcTrace, formatCalcTraceForPrompt } from '../grading/CalcTrace';
import { extractStudentAST } from '../grading/calc-trace-extraction';
import { shouldDisablePoints } from './prompt-builder';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from './constants';

export { shouldDisablePoints };

/**
 * Maps the AI raw JSON results back to the Koreki Task structure and calculates totals.
 */
function parseCriteriaScoresFromNotes(notes: string): Record<string, number> {
    const scores: Record<string, number> = {};
    if (!notes) return scores;
    
    // Match patterns like:
    // - rges_formel: 1/1
    // - rges_formel: 1 / 1
    // - [rges_formel]: 1/1
    const regex = /(?:^|\n)\s*[-*]?\s*\[?([a-zA-Z0-9_-]+)\]?\s*:\s*([0-9.]+)\s*\/\s*([0-9.]+)/g;
    let match;
    while ((match = regex.exec(notes)) !== null) {
        const id = match[1].trim();
        const points = parseFloat(match[2]);
        scores[id] = points;
    }
    return scores;
}

export function parseCorrectionResult(analysis: AIAnalysisResult, tasksLayout?: Task[] | null, studentText?: string): AIAnalysisResult {
    const parsed = AIAnalysisResultSchema.safeParse(analysis);
    if (parsed.success) {
        analysis = parsed.data as AIAnalysisResult;
    }

    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        let totalObtained = 0;
        let totalMax = 0;

        tasksLayout.forEach((lt: Task) => totalMax += Number(lt.maxPoints || 0));

        let hasMappingError = false;
        let hasMarkerIssue = false;

        const mappedTasks = tasksLayout.map((layoutTask: Task) => {
            // Find the AI task if it exists for extra pedagogical feedback
            const aiTask = (analysis.tasks || []).find((t: AITask) => t.name === layoutTask.name);

            // --- DETECT DETERMINISTIC CALCTRACE-BASED TASKS & EVALUATE LOCALLY ---
            if (layoutTask.calcTraceResult) {
                let enginePoints: number;

                const targetGoal: Partial<TargetGoal> = layoutTask.targetGoal || {};
                const criteria = targetGoal.criteria;

                if (aiTask && criteria && Array.isArray(criteria) && criteria.length > 0) {
                    const notes = aiTask.correctionNotes || '';
                    const parsedScores = parseCriteriaScoresFromNotes(notes);

                    let computedSum = 0;
                    const finalCriteriaNotes: string[] = [];

                    criteria.forEach((crit: GradingCriterion) => {
                        const idx = (crit.targetIndex !== undefined && crit.targetIndex !== null) ? crit.targetIndex : 0;
                        const pt = layoutTask.calcTraceResult!.perTargetResult?.find((r) => r.targetIndex === idx);
                        
                        let pts = 0;
                        let justification = '';
                        
                        const isProof = crit.source === 'proofB' || crit.source === 'proofA';
                        const isWerteKriterium = crit.id.endsWith('_werte') || 
                                                 crit.id.includes('werte') || 
                                                 crit.label.toLowerCase().includes('einsetzen') || 
                                                 crit.label.toLowerCase().includes('eingesetzt') || 
                                                 crit.label.toLowerCase().includes('werte');
                        
                        if (isProof) {
                            if (pt && pt.reached && !pt.hasCalculationError) {
                                pts = crit.punktwert;
                                justification = 'Sandbox-bestätigt';
                            } else {
                                pts = 0;
                                justification = pt && pt.reached && pt.hasCalculationError 
                                    ? 'Rechenfehler im Rechenweg' 
                                    : 'Zielwert nicht erreicht/nicht notiert';
                            }
                        } else if (isWerteKriterium) {
                            if (pt && pt.hasCorrectValues) {
                                pts = crit.punktwert;
                                justification = 'Sandbox-bestätigt: Werte eingesetzt';
                            } else {
                                pts = 0;
                                justification = 'Einsetzung fehlerhaft oder fehlt';
                            }
                        } else {
                            // LLM-evaluated qualitative criteria (e.g. formulas): Use score from LLM notes
                            pts = parsedScores[crit.id] !== undefined ? parsedScores[crit.id] : 0;
                            // Clamp to max points of criterion
                            pts = Math.min(crit.punktwert, Math.max(0, pts));
                            justification = 'KI-Einschätzung';
                        }
                        
                        computedSum += pts;
                        finalCriteriaNotes.push(`- ${crit.id}: ${pts} / ${crit.punktwert} (${justification})`);
                    });
                    
                    enginePoints = computedSum;
                    
                    // Re-write correctionNotes cleanly to prevent rounding errors or incorrect sums
                    const cleanNotes = `[Kriterien-Bewertung]\n${finalCriteriaNotes.join('\n')}\n\nGesamtsumme: ${computedSum} Punkte`;
                    aiTask.correctionNotes = cleanNotes;
                } else {
                    enginePoints = aiTask && aiTask.pointsObtained !== undefined && aiTask.pointsObtained !== null
                        ? Number(aiTask.pointsObtained)
                        : 0;
                }

                totalObtained += enginePoints;

                const isAlreadyFormatted = aiTask && aiTask.feedback && (
                    aiTask.feedback.includes('[📐 CalcTrace Engine - Mathematischer Abgleich]') ||
                    aiTask.feedback.includes('DETERMINISTISCHER BEWEIS (SANDBOX)')
                );

                if (isAlreadyFormatted) {
                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: enginePoints,
                        feedback: aiTask.feedback,
                        confidence: 95,
                        content: aiTask.content || ''
                    };
                }

                const stepFeedback = formatCalcTraceForPrompt(layoutTask.calcTraceResult, (layoutTask.targetGoal || {}) as TargetGoal);
                const aiFeedbackText = aiTask ? (aiTask.feedback || aiTask.content || '') : '';
                
                let finalFeedback = `[📐 CalcTrace Engine - Mathematischer Abgleich]\n${stepFeedback}\n\n---\n\n`;
                finalFeedback += `[KI-Pädagogische Einschätzung]\n${aiFeedbackText || 'Die mathematische Prüfung wurde vollautomatisch durch die CalcTrace-Engine validiert.'}`;

                return {
                    name: layoutTask.name,
                    maxPoints: layoutTask.maxPoints,
                    pointsObtained: enginePoints,
                    feedback: finalFeedback,
                    correctionNotes: aiTask ? (aiTask.correctionNotes || '') : '',
                    confidence: 95,
                    content: aiTask ? (aiTask.content || '') : ''
                };
            }

            // --- DETECT DETERMINISTIC GRAPH-BASED TASKS & EVALUATE LOCALLY (PANG Architecture) ---
            if (layoutTask.gradingResult) {
                const disablePointsActive = shouldDisablePoints(layoutTask.taskType, layoutTask.gradingGraph);

                const isServerResponse = aiTask && (
                    aiTask.feedback?.includes('[⚙️ PANG Engine - Mathematischer Graph-Abgleich]') || 
                    aiTask.feedback?.includes('[⚙️ AGS Engine - Mathematischer VLSM Abgleich]')
                );

                let enginePoints: number;
                if (disablePointsActive) {
                    // LLM decides (Hybrid): Prefer LLM points if available, fallback to PANG.
                    enginePoints = aiTask && typeof aiTask.pointsObtained === 'number'
                        ? Number(aiTask.pointsObtained)
                        : Number(layoutTask.gradingResult.totalPoints ?? 0);
                } else {
                    // Rigid grading: PANG points are absolute.
                    enginePoints = isServerResponse 
                        ? Number(aiTask.pointsObtained ?? layoutTask.gradingResult.totalPoints ?? 0)
                        : Number(layoutTask.gradingResult.totalPoints ?? layoutTask.pointsObtained ?? 0);
                }

                totalObtained += enginePoints;

                // Format a beautiful step-by-step breakdown as feedback
                let stepFeedback = "";
                let shownStepsCount = 0;

                const pluginFeedback = formatPluginFeedback(layoutTask.taskType || "", layoutTask.gradingResult, layoutTask.gradingGraph);
                if (pluginFeedback) {
                    stepFeedback = pluginFeedback;
                    shownStepsCount = layoutTask.gradingResult.stepResults.length;
                } else {
                    const totalMaxPoints = layoutTask.gradingResult.stepResults.reduce((sum: number, s: StepResult) => sum + (s.maxPoints || 0), 0);

                    layoutTask.gradingResult.stepResults.forEach((step: StepResult, idx: number) => {
                        const originalVar = layoutTask.gradingGraph?.variables?.find((v: VariableDefinition) => v.id === step.variableId);
                        
                        // Only skip explicit setup variables to keep the UI clean, but ALWAYS show inputs and formulas
                        // even if they yield 0 points, so the user can verify the extraction process.
                        if (originalVar && originalVar.type === 'setup') return;
                        
                        shownStepsCount++;

                        const statusStr = step.status === 'correct' ? 'KORREKT' : 
                                        step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK (Kulanz-Punkte erhalten)' : 
                                        'FEHLERHAFT (Primärfehler)';
                        
                        if (shownStepsCount === 1) {
                            stepFeedback += `[⚙️ PANG Engine - Mathematischer Graph-Abgleich]\n`;
                        }
                        
                        stepFeedback += `• ${step.variableId}: Schülerwert: "${step.studentValue !== undefined && step.studentValue !== null ? step.studentValue : 'nicht angegeben'}" (Erwartet: "${step.expectedValue}") ➔ ${statusStr}\n`;
                        if (step.note) {
                            stepFeedback += `  Info: ${step.note}\n`;
                        }
                    });
                }
                
                // Idempotency check: If the feedback has already been formatted (e.g. on the server), return it as-is
                const isAlreadyFormatted = aiTask && aiTask.feedback && (
                    aiTask.feedback.includes('[⚙️ PANG Engine - Mathematischer Graph-Abgleich]') || 
                    aiTask.feedback.includes('[⚙️ AGS Engine - Mathematischer VLSM Abgleich]')
                );
                
                if (isAlreadyFormatted) {
                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: enginePoints,
                        feedback: aiTask.feedback,
                        confidence: 95,
                        content: aiTask.content || ''
                    };
                }

                const aiFeedbackText = aiTask ? (aiTask.feedback || aiTask.content || '') : '';
                
                let finalFeedback = "";
                if (shownStepsCount > 0) {
                    finalFeedback += `${stepFeedback}\n---\n\n`;
                }
                finalFeedback += `[KI-Pädagogische Einschätzung]\n${aiFeedbackText || 'Die mathematische Prüfung wurde vollautomatisch durch die AGS-Graph-Engine fehlerfrei validiert.'}`;

                return {
                    name: layoutTask.name,
                    maxPoints: layoutTask.maxPoints,
                    pointsObtained: enginePoints,
                    feedback: finalFeedback,
                    confidence: 95,
                    content: aiTask ? (aiTask.content || '') : ''
                };
            }

            const hasAttachedCalcTrace = !!layoutTask.calcTrace;
            const hasTargetGoal = !!layoutTask.targetGoal;
            const isCalcTraceTask = hasAttachedCalcTrace || hasTargetGoal || layoutTask.taskType === 'calc-trace';
            // Idempotency guard: if the server already ran CalcTrace and the feedback contains its
            // deterministic proof markers, the sandbox was NOT bypassed — even if calcTraceResult
            // is absent on the client-side tasksLayout (it's a server-only intermediate state).
            const calcTraceAlreadyFormatted = !!(aiTask?.feedback?.includes('[📐 CalcTrace Engine') ||
                aiTask?.feedback?.includes('DETERMINISTISCHER BEWEIS (SANDBOX)'));
            const isSandboxBypassed = isCalcTraceTask && !calcTraceAlreadyFormatted && (
                !layoutTask.calcTraceResult || 
                !layoutTask.calcTraceResult.ast || 
                layoutTask.calcTraceResult.ast.length === 0
            );

            if (aiTask) {
                const obtained = Number(aiTask.pointsObtained || 0);
                totalObtained += obtained;
                
                let confidence = Number(aiTask.confidence || 0);
                
                // --- MARKER PENALTY ---
                // If the cleaned text contains (?) markers, confidence MUST be < 90
                if (aiTask.content?.includes('(?)')) {
                    hasMarkerIssue = true;
                    if (confidence >= 90) confidence = 89;
                }

                let feedback = aiTask.feedback || '';
                if (isSandboxBypassed) {
                    feedback = `⚠️ HINWEIS: Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung — bitte manuell gegenprüfen!\n\n${feedback}`;
                }

                return {
                    name: layoutTask.name,
                    maxPoints: layoutTask.maxPoints,
                    pointsObtained: obtained,
                    feedback: feedback,
                    confidence: confidence,
                    content: aiTask.content || '',
                    sandboxBypassed: isSandboxBypassed ? true : undefined
                };
            } else {
                const nearMiss = (analysis.tasks || []).find((t: AITask) =>
                    t.name?.toLowerCase().trim() === layoutTask.name.toLowerCase().trim()
                );

                if (nearMiss) {
                    // SOFT ERROR: Case mismatch or whitespace issues -> Keep Confidence, but show warning
                    const obtained = Number(nearMiss.pointsObtained || 0);
                    totalObtained += obtained;

                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: obtained,
                        feedback: `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")\n\n${nearMiss.feedback || ''}`,
                        confidence: Number(nearMiss.confidence || 0),
                        content: nearMiss.content || ''
                    };
                } else {
                    // HARD ERROR: Task completely missing in AI response
                    hasMappingError = true;
                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: 0,
                        feedback: 'Vom System nicht erkannt oder von der KI übersprungen.',
                        confidence: 0,
                        content: ''
                    };
                }
            }
        });

        analysis.tasks = mappedTasks as AITask[];
        analysis.overallMatchPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        // --- INDUSTRIAL CONFIDENCE BRAKE ---
        // If the structure is broken (naming mismatch) or too many OCR problems, the entire document requires review.
        if (hasMappingError || hasMarkerIssue) {
            analysis.confidence = 0;
        } else {
            analysis.confidence = Number(analysis.confidence || 0);
        }
    } else if (analysis.tasks && Array.isArray(analysis.tasks)) {
        let totalObtained = 0;
        let totalMax = 0;
        analysis.tasks.forEach((task: AITask) => {
            totalObtained += Number(task.pointsObtained || 0);
            totalMax += Number(task.maxPoints || 0);
        });
        analysis.overallMatchPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    }

    return analysis;
}

/**
 * Parses mapping results (Clean & Map phase) to surface early mapping errors.
 */
export function parseMappingResult(result: any, tasksLayout?: Task[] | null): any {
    if (!tasksLayout || !Array.isArray(tasksLayout)) return result;

    const mappedTasks = tasksLayout.map((layoutTask: Task) => {
        const aiTask = (result.tasks || []).find((t: any) => t.name === layoutTask.name);
        if (aiTask) {
            return aiTask;
        } else {
            const nearMiss = (result.tasks || []).find((t: any) => 
                t.name?.toLowerCase().trim() === layoutTask.name.toLowerCase().trim()
            );

            return {
                name: layoutTask.name,
                content: nearMiss 
                    ? `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")]\n\n${nearMiss.content}`
                    : '[unbeantwortet]'
            };
        }
    });

    result.tasks = mappedTasks;
    return result;
}

/**
 * Robustly extracts student answers from free-text using a dedicated, fast LLM call (variable-extraction).
 * If the LLM extraction fails or returns incomplete values, it seamlessly merges/falls back to the legacy heuristics.
 */
export async function extractStudentAnswersWithLLM(
    studentText: string,
    graph: GradingGraph,
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings,
    taskType?: string,
    taskName?: string
): Promise<Record<string, any>> {
    // 1. Establish baseline (Deactivated legacy "Schicht A" regex-based heuristics per user & architectural requirement)
    if (!settings) {
        return {};
    }

    // Look up extraction instructions from the modular skill if taskType is specified
    let extractionInstructions: string | undefined;
    if (taskType) {
        let skillKey = taskType;
        if (skillKey === 'vlsm') {
            skillKey = 'skill-calc-vlsm';
        }
        
        const skillEntry = SKILL_REGISTRY[skillKey];
        if (skillEntry) {
            const { extractionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
            if (extractionSnippet) {
                extractionInstructions = extractionSnippet;
            }
        }
    }

    // [INDUSTRIAL DETERMINISTIC FALLBACK]
    // If taskType was missing, rely on the explicitly defined discipline in the GradingGraph.
    // This is mathematically safer than guessing by variable names (SOLID).
    if (!extractionInstructions && graph.discipline) {
        let skillKey = '';
        if (graph.discipline === 'networking') skillKey = 'skill-calc-vlsm';
        // Add more disciplines here as the system grows (e.g., 'raid' -> 'skill-calc-raid')
        
        if (skillKey) {
            const skillEntry = SKILL_REGISTRY[skillKey];
            if (skillEntry) {
                const { extractionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
                if (extractionSnippet) {
                    extractionInstructions = extractionSnippet;
                }
            }
        }
    }

    try {
        let extracted: Record<string, any> = {};
        // Strip defaultValues to eliminate any force-fitting bias towards the expected master key
        const strippedVariables = graph.variables.map(v => {
            const copy = { ...v };
            delete copy.defaultValue;
            return copy;
        });

        const payload = {
            studentText,
            variables: strippedVariables,
            extractionInstructions,
            taskName
        };

        // 2. Perform Isomorphic Provider Call
        if (appMode === 'PURE' || isDesktopTarget()) {
            // Client-Side (PURE or local Ollama)
            if (settings?.provider === 'ollama') {
                extracted = await executeOllamaRequest('variable-extraction', payload, settings);
            } else if (settings?.provider === 'openai-compatible') {
                const baseUrl = settings.openaiUrl || '';
                const apiKey = settings.openaiKey || '';
                extracted = await executeOpenAIRequest('variable-extraction', payload, baseUrl, apiKey, {
                    model: settings.openaiModel,
                    temperature: 0.0,
                    topP: 0.1,
                    maxTokens: 4000
                });
            } else {
                const mistralKey = settings?.mistralKey;
                if (!mistralKey) throw new Error("PURE_KEY_MISSING");
                extracted = await executeMistralRequest('variable-extraction', payload, mistralKey, {
                    model: settings?.model,
                    temperature: 0.0,
                    topP: 0.1,
                    maxTokens: 1000
                });
            }
        } else {
            // Server-Side (STANDARD mode execution) - directly invoke provider (isomorphic optimization)
            if (typeof window === 'undefined') {
                if (settings.provider === 'ollama') {
                    extracted = await executeOllamaRequest('variable-extraction', payload, settings);
                } else if (settings.provider === 'mistral') {
                    const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
                    if (!apiKey) throw new Error('Mistral API-Key fehlt.');
                    extracted = await executeMistralRequest(
                        'variable-extraction',
                        payload,
                        apiKey,
                        {
                            model: settings.model,
                            temperature: 0.0,
                            topP: 0.1,
                            maxTokens: 1000
                        }
                    );
                } else {
                    const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
                    const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
                    const model = settings.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
                    if (!apiKey) throw new Error('OpenAI/Mittwald API-Key fehlt.');



                    extracted = await executeOpenAIRequest(
                        'variable-extraction',
                        payload,
                        baseUrl,
                        apiKey,
                        {
                            model,
                            temperature: 0.0,
                            topP: 0.1,
                            maxTokens: 4000
                        }
                    );
                }
            } else {
                return {};
            }
        }



        // 3. Robust Filtering & Type-safe Normalization
        const merged: Record<string, any> = {};

        if (extracted && typeof extracted === 'object') {
            for (const variable of graph.variables) {
                const rawVal = extracted[variable.id];
                if (rawVal !== undefined && rawVal !== null) {
                    let cleanedVal = rawVal;
                    if (typeof rawVal === 'string') {
                        const trimmed = rawVal.trim();
                        const isNumber = /^-?\d+(\.\d+)?$/.test(trimmed);
                        if (isNumber) {
                            cleanedVal = parseFloat(trimmed);
                        } else {
                            cleanedVal = trimmed;
                        }
                    }
                    merged[variable.id] = cleanedVal;
                }
            }
        }



        return merged;
    } catch (err) {
        logger.error('LLM Variable Extraction failed:', err);

        return {};
    }
}

/**
 * Orchestrates AI requests (Correction, Layout, Vision), choosing between direct Mistral API (PURE) or Koreki Backend (STANDARD).
 */
export async function performAIRequest(
    action: 'correction' | 'clean-and-analyze' | 'vision' | 'clean-and-map' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction' | 'generate-calc-trace' | 'calc-trace-extraction',
    payload: any, // ARCH: any required because payload structure varies by action (Correction vs Layout)
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings,
    signal?: AbortSignal
): Promise<any> {
    // Client-side deterministic graph evaluation for PURE mode or local Ollama execution
    const isClientSideExecution = appMode === 'PURE' || isDesktopTarget();
    if (isClientSideExecution && action === 'correction' && payload.tasksLayout && Array.isArray(payload.tasksLayout)) {
        const activeSkillIds = settings?.activeSkillIds || [];
        const customSkills = settings?.customSkills || {};
        
        const studentText = payload.studentText || payload.text || "";
        const rawSplit = splitTextByTasks(studentText, payload.tasksLayout);

        for (let i = 0; i < payload.tasksLayout.length; i++) {
            const task = payload.tasksLayout[i];
            // A task is graph-based if it has a GradingGraph attached (the teacher explicitly generated one)
            // OR if its taskType matches a known graph-based skill pattern.
            const hasAttachedGraph = !!task.gradingGraph;
            const isGraphSkill = task.taskType && (
                task.taskType === 'vlsm' || 
                (activeSkillIds.includes(task.taskType) && (
                    task.taskType.startsWith('skill-calc-') || 
                    customSkills[task.taskType]?.isGraphBased
                ))
            );

            const hasAttachedCalcTrace = !!task.calcTrace; // Fallback
            const hasTargetGoal = !!task.targetGoal;
            const isCalcTraceSkill = task.taskType === 'calc-trace' || (task.taskType && (
                customSkills[task.taskType]?.isCalcTrace
            ));

            if (hasAttachedGraph) {
                try {
                    const studentTaskText = rawSplit[i] || "";
                    const taskSpecificText = (studentTaskText && studentTaskText.trim().length > 0) ? studentTaskText : studentText;
                    
                    
                    const studentValues = await extractStudentAnswersWithLLM(taskSpecificText, task.gradingGraph, appMode, settings, task.taskType, task.name);
                    
                    
                    const gradingResult = GraphRunner.grade(task.gradingGraph, studentValues);
                    task.gradingResult = gradingResult;

                    const disablePointsActive = shouldDisablePoints(task.taskType, task.gradingGraph);
                    if (!disablePointsActive) {
                        task.pointsObtained = gradingResult.totalPoints;
                        task.maxPoints = gradingResult.maxPoints;
                    }
                } catch (err: unknown) {
                    logger.error('Error in client-side GraphRunner execution', err);
                }
            } else if (hasTargetGoal || hasAttachedCalcTrace || isCalcTraceSkill) {
                try {
                    const studentTaskText = rawSplit[i] || "";
                    const taskSpecificText = (studentTaskText && studentTaskText.trim().length > 0) ? studentTaskText : studentText;
                    
                    const targetGoal = task.targetGoal || customSkills[task.taskType]?.targetGoal || { targetValue: 0, maxPoints: task.maxPoints || 0 };
                    
                    let astResult = await extractStudentAST(taskSpecificText, appMode, settings, task.name);
                    let calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                    
                    let retryCount = 0;
                    const maxRetries = 2;
                    const shouldRetryCalcTrace = () => 
                        !calcTraceResult?.isGoalReached && 
                        calcTraceResult?.ast && calcTraceResult.ast.length > 0 && 
                        calcTraceResult?.sandboxErrors && calcTraceResult.sandboxErrors.some(err => !err.startsWith('Rechenfehler'));

                    while (shouldRetryCalcTrace() && retryCount < maxRetries) {
                        const extractionErrors = calcTraceResult.sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));
                        logger.warn(`[Client] CalcTrace Sandbox validation failed (extraction errors). Retrying self-correction (${retryCount + 1}/${maxRetries}):`, extractionErrors);
                        
                        const correctionInstruction = `Die mathematische Sandbox hat Fehler in deinem extrahierten AST gefunden:\n${extractionErrors.join('\n')}\nBitte extrahiere den AST neu, beachte die Syntax für mathjs, und erfinde keine Rechenschritte, die der Schüler nicht gemacht hat.`;
                        astResult = await extractStudentAST(taskSpecificText, appMode, settings, task.name, astResult, correctionInstruction);
                        calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                        retryCount++;
                    }
                    
                    task.calcTraceResult = calcTraceResult;
                    task.targetGoal = targetGoal;
                    // Die Engine vergibt keine Punkte mehr, das macht das LLM.
                    task.maxPoints = targetGoal.maxPoints || task.maxPoints;
                } catch (err: unknown) {
                    logger.error('Error in client-side CalcTrace execution', err);
                }
            }
        }
    }

    // --- HYBRID ORCHESTRATION ---
    // PURE mode: LLM is called directly from the browser (no Koreki backend involved).
    //   → Applies to: PURE app mode, and Desktop/Tauri (which has no backend server).
    //   → All providers (Mistral, Qwen/OpenAI-compatible, Ollama) are called client-side.
    // STANDARD mode: all AI calls go through the Koreki backend (/api/ai-correct etc.).
    //   → Applies to: SaaS and Community (self-hosted) deployments.
    //   → Ollama in STANDARD mode is handled server-side by api/ai-correct.ts,
    //     which calls executeOllamaRequest using the OLLAMA_BASE_URL env variable.
    //     This is intentional: the server can reach the configured Ollama instance
    //     (e.g. a Docker container on the same host), not the user's local browser.
    if (isClientSideExecution) {
        const mistralKey = settings?.mistralKey;
        if (!mistralKey && settings?.provider === 'mistral') throw new Error("PURE_KEY_MISSING");

        let result: any;

        if (action === 'vision') {
            let combinedText = "";
            for (let i = 0; i < payload.buffers.length; i++) {
                const b64 = payload.buffers[i];
                // Throttling for vision requests (Industrial Grade)
                if (i > 0) await new Promise(r => setTimeout(r, 800));

                let ocrData;
                if (settings?.provider === 'ollama') {
                    ocrData = await executeOllamaRequest('vision', { ...payload, buffer: b64 }, settings);
                } else if (settings?.provider === 'openai-compatible') {
                    const baseUrl = settings.openaiUrl || '';
                    const apiKey = settings.openaiKey || '';
                    ocrData = await executeOpenAIRequest('vision', { ...payload, buffer: b64 }, baseUrl, apiKey, {
                        model: settings.openaiModel,
                        temperature: settings.visionTemperature,
                        topP: settings.visionTopP,
                        maxTokens: settings.visionMaxTokens,
                        presencePenalty: settings.visionPresencePenalty
                    });
                } else {
                    ocrData = await executeMistralRequest('vision', { ...payload, buffer: b64 }, mistralKey);
                }
                combinedText += (combinedText ? "\n\n" : "") + (ocrData.text || "");
            }
            result = { text: combinedText };
        } else {
            if (action === 'generate-graph') {
                let genResult: any;
                if (settings?.provider === 'ollama') {
                    genResult = await executeOllamaRequest('generate-graph', payload, settings, signal, { responseSchema: GRADING_GRAPH_SCHEMA });
                } else if (settings?.provider === 'openai-compatible') {
                    const baseUrl = settings.openaiUrl || '';
                    const apiKey = settings.openaiKey || '';
                    genResult = await executeOpenAIRequest('generate-graph', payload, baseUrl, apiKey, {
                        model: settings.openaiModel,
                        enableThinking: settings.enableThinking,
                        temperature: 0.2,
                        topP: 0.9,
                        maxTokens: 4000,
                        responseSchema: GRADING_GRAPH_SCHEMA
                    });
                } else {
                    genResult = await executeMistralRequest('generate-graph', payload, mistralKey, {
                        model: settings?.model,
                        enableThinking: settings?.enableThinking,
                        temperature: 0.2,
                        topP: 0.9,
                        maxTokens: 4000,
                        responseSchema: GRADING_GRAPH_SCHEMA
                    });
                }

                let graph = parseGeneratedGraph(typeof genResult === 'string' ? genResult : JSON.stringify(genResult));
                if (!graph) {
                    throw new Error('Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte versuche es erneut oder passe den Aufgabentext an.');
                }

                let graphValidation = validateGraphDeterminism(graph);
                let retryCount = 0;
                const maxRetries = 3;

                while (!graphValidation.isValid && retryCount < maxRetries) {
                    logger.warn(`[Client] PANG Dry-Run validation failed. Retrying self-correction (${retryCount + 1}/${maxRetries}):`, graphValidation.error);

                    const userInstruction = `AUTOMATISCHE MATHEMATISCHE VALIDIERUNG FEHLGESCHLAGEN:
Der von dir generierte Graph ist mathematisch nicht konsistent auswertbar.
Folgender Fehler trat bei der Test-Simulation auf:
"${graphValidation.error}"

Bitte korrigiere den Graphen. Stelle sicher, dass:
1. Alle Formel-Ausdrücke syntaktisch korrekt sind und die richtigen Variablen-Namen referenzieren.
2. Keine fiktiven JavaScript-Funktionen verwendet werden (nutze nur Algebra oder registrierte Plugins).
3. Jede Formel-Variable mit den Default-Eingabewerten mathematisch exakt das Ergebnis der Musterlösung liefert.
4. Alle Variablen in snake_case benannt sind.

Gib AUSSCHLIESSLICH das korrigierte JSON-Objekt im bekannten Schema aus.`;

                    try {
                        let correctionResult: any;
                        const correctionPayload = {
                            taskText: payload.taskText,
                            currentGraph: graph,
                            userInstruction,
                            discipline: payload.discipline
                        };

                        if (settings?.provider === 'ollama') {
                            correctionResult = await executeOllamaRequest('refine-graph', correctionPayload, settings, signal, { responseSchema: GRADING_GRAPH_SCHEMA });
                        } else if (settings?.provider === 'openai-compatible') {
                            const baseUrl = settings.openaiUrl || '';
                            const apiKey = settings.openaiKey || '';
                            correctionResult = await executeOpenAIRequest('refine-graph', correctionPayload, baseUrl, apiKey, {
                                model: settings.openaiModel,
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: 4000,
                                responseSchema: GRADING_GRAPH_SCHEMA
                            });
                        } else {
                            correctionResult = await executeMistralRequest('refine-graph', correctionPayload, mistralKey, {
                                model: settings?.model,
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: 4000,
                                responseSchema: GRADING_GRAPH_SCHEMA
                            });
                        }

                        const correctedGraph = parseGeneratedGraph(typeof correctionResult === 'string' ? correctionResult : JSON.stringify(correctionResult));
                        if (correctedGraph) {
                            graph = correctedGraph;
                            graphValidation = validateGraphDeterminism(graph);
                        } else {
                            break;
                        }
                    } catch (err) {
                        logger.error('[Client] Auto-correction request failed in loop', err);
                        break;
                    }
                    retryCount++;
                }

                (graph as any).validation = {
                    isValid: graphValidation.isValid,
                    error: graphValidation.error,
                    retriesUsed: retryCount,
                    dryRunChecked: true
                };

                return graph;
            } else if (action === 'refine-graph') {
                let refineResult: any;
                if (settings?.provider === 'ollama') {
                    refineResult = await executeOllamaRequest('refine-graph', payload, settings, signal, { responseSchema: GRADING_GRAPH_SCHEMA });
                } else if (settings?.provider === 'openai-compatible') {
                    const baseUrl = settings.openaiUrl || '';
                    const apiKey = settings.openaiKey || '';
                    refineResult = await executeOpenAIRequest('refine-graph', payload, baseUrl, apiKey, {
                        model: settings.openaiModel,
                        temperature: 0.0,
                        topP: 1.0,
                        maxTokens: 4000,
                        responseSchema: GRADING_GRAPH_SCHEMA
                    });
                } else {
                    refineResult = await executeMistralRequest('refine-graph', payload, mistralKey, {
                        model: settings?.model,
                        temperature: 0.0,
                        topP: 1.0,
                        maxTokens: 4000,
                        responseSchema: GRADING_GRAPH_SCHEMA
                    });
                }

                const rawStr = typeof refineResult === 'string' ? refineResult : JSON.stringify(refineResult);
                const graph = parseGeneratedGraph(rawStr, { skipSanitization: true });

                if (!graph) {
                    throw new Error('Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte passe deine Anweisung an oder versuche es erneut.');
                }

                const graphValidation = validateGraphDeterminism(graph);
                (graph as any).validation = {
                    isValid: graphValidation.isValid,
                    error: graphValidation.error,
                    dryRunChecked: true
                };

                let explanation = '';
                try {
                    const parsedResult = typeof refineResult === 'string' ? JSON.parse(refineResult) : refineResult;
                    explanation = parsedResult?.explanation || '';
                } catch (e) {}

                return {
                    graph,
                    explanation: explanation || `Graph erfolgreich verfeinert!\nEs wurden ${graph.variables.length} Variablen deklariert.`
                };
            }

            // General AI Actions (Correction, Analyze, Map)
            if (settings?.provider === 'ollama') {
                result = await executeOllamaRequest(action, payload, settings, signal);
            } else if (settings?.provider === 'openai-compatible') {
                const baseUrl = settings.openaiUrl || '';
                const apiKey = settings.openaiKey || '';
                result = await executeOpenAIRequest(action, payload, baseUrl, apiKey, {
                    model: settings.openaiModel,
                    enableThinking: settings.enableThinking,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                    presencePenalty: settings.presencePenalty,
                    customPrompt: settings?.correctionPrompt,
                    gradingMemory: payload.gradingMemory,
                    activeSkillIds: settings?.activeSkillIds,
                    customSkills: settings?.customSkills,
                    signal
                });
            } else {
                result = await executeMistralRequest(action, payload, mistralKey, {
                    customPrompt: settings?.correctionPrompt,
                    gradingMemory: payload.gradingMemory,
                    model: settings?.model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature,
                    topP: settings?.topP,
                    maxTokens: settings?.maxTokens,
                    activeSkillIds: settings?.activeSkillIds,
                    customSkills: settings?.customSkills,
                    signal
                });
            }

            if (action === 'correction') {
                result = parseCorrectionResult(result, payload.tasksLayout);
                if (payload.expertProfileName) {
                    result.expertProfile = payload.expertProfileName;
                }
            } else if (action === 'clean-and-map') {
                result = parseMappingResult(result, payload.tasksLayout);
            } else if (action === 'second-opinion') {
                result = {
                    response: result.response || result.text || (typeof result === 'string' ? result : JSON.stringify(result))
                };
            }
        }

        // Billing for PURE mode (Ping only, no data)
        // SKIPPED IN BYPASS MODE (Desktop/Community) or OLLAMA MODE
        if (!isLocalInstance() && settings?.provider !== 'ollama') {
            await apiClient.post('/api/billing/pure-deduct', {
                pageCount: payload.pageCount || (payload.buffers?.length) || 1,
                action: action
            });
        }

        return result;
    } else {
        const endpoint = action === 'correction' ? '/api/ai-correct' :
            action === 'clean-and-analyze' ? '/api/clean-and-analyze' :
                action === 'clean-and-map' ? '/api/clean-and-map' :
                    action === 'anonymize' ? '/api/user/grading-memories/anonymize' :
                        action === 'second-opinion' ? '/api/second-opinion' :
                            action === 'generate-graph' ? '/api/generate-graph' :
                                action === 'refine-graph' ? '/api/refine-graph' :
                                    action === 'generate-calc-trace' ? '/api/generate-calc-trace' :
                                        action === 'calc-trace-extraction' ? '/api/calc-trace-extraction' :
                                            '/api/extract-image';

        const res = await apiClient.post(endpoint, { 
            ...payload, 
            studentText: payload.studentText || payload.text, 
            settings, 
            isComplex: payload.isComplex ?? (action === 'vision') 
        }, { signal });
        let data: any;
        let rawText = '';
        if (typeof res.text === 'function') {
            rawText = await res.text();
        } else if (typeof res.json === 'function') {
            const jsonVal = await res.json();
            rawText = typeof jsonVal === 'string' ? jsonVal : JSON.stringify(jsonVal);
        }
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // Wenn die API kein JSON zurückgibt (z.B. Nginx 502 HTML Page oder Next.js Crash)
            data = { error: rawText || `HTTP Error ${res.status}` };
        }

        if (!res.ok) {
            logger.error("API ERROR RESPONSE:", data);
            const errorMessage = typeof data.error === 'string' 
                ? data.error 
                : (data.error?.message || data.message || `KI Anfrage fehlgeschlagen (HTTP ${res.status})`);
            throw new Error(errorMessage);
        }

        if (action === 'correction') {
            // The server (api/ai-correct.ts) already ran parseCorrectionResult before returning the
            // response — including CalcTrace evaluation, PANG graph scoring, and Zod validation.
            // Calling parseCorrectionResult again client-side is redundant, wastes CPU, and caused
            // false-positive "sandbox bypassed" warnings (calcTraceResult is a server-only state).
            if (payload.expertProfileName && !data.expertProfile) {
                data.expertProfile = payload.expertProfileName;
            }
            return data;
        } else if (action === 'clean-and-map') {
            return parseMappingResult(data, payload.tasksLayout);
        }

        return data;
    }
}
