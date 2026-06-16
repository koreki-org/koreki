import { logger } from '@/lib/logger';
import { apiClient } from '../api-client';
import { Task, AppSettings, AITask, AIAnalysisResult } from '../../types';
import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { isLocalInstance, isDesktopTarget } from '@/lib/env-context';
import { GraphRunner } from '../grading/GraphRunner';
import { parseGeneratedGraph, validateGraphDeterminism, GRADING_GRAPH_SCHEMA } from '../grading/graph-generator';
import { formatPluginFeedback } from '../grading/feedback-formatter';
import { GradingGraph } from '../grading/types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { splitSkillSnippet } from './prompt-library';
import { splitTextByTasks } from '../task-utils';

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

/**
 * Maps the AI raw JSON results back to the Koreki Task structure and calculates totals.
 */
export function parseCorrectionResult(analysis: AIAnalysisResult, tasksLayout?: Task[] | null, studentText?: string): AIAnalysisResult {
    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        let totalObtained = 0;
        let totalMax = 0;

        tasksLayout.forEach((lt: any) => totalMax += Number(lt.maxPoints || 0));

        let hasMappingError = false;
        let hasMarkerIssue = false;

        const mappedTasks = tasksLayout.map((layoutTask: any) => {
            // Find the AI task if it exists for extra pedagogical feedback
            const aiTask = (analysis.tasks || []).find((t: any) => t.name === layoutTask.name);

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
                    const totalMaxPoints = layoutTask.gradingResult.stepResults.reduce((sum: number, s: any) => sum + (s.maxPoints || 0), 0);
                    
                    layoutTask.gradingResult.stepResults.forEach((step: any, idx: number) => {
                        const originalVar = layoutTask.gradingGraph?.variables?.find((v: any) => v.id === step.variableId);
                        
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

                return {
                    name: layoutTask.name,
                    maxPoints: layoutTask.maxPoints,
                    pointsObtained: obtained,
                    feedback: aiTask.feedback || '',
                    confidence: confidence,
                    content: aiTask.content || ''
                };
            } else {
                const nearMiss = (analysis.tasks || []).find((t: any) => 
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

        analysis.tasks = mappedTasks;
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
        analysis.tasks.forEach((task: any) => {
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

    const mappedTasks = tasksLayout.map((layoutTask: any) => {
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
    let heuristicValues: Record<string, any> = {};

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
                    const { executeOllamaRequest } = require('./ollama-logic');
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
                    const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
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
    action: 'correction' | 'clean-and-analyze' | 'vision' | 'clean-and-map' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction',
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
                } catch (err: any) {
                    logger.error('Error in client-side GraphRunner execution', err);
                }
            }
        }
    }

    // --- HYBRID ORCHESTRATION ---
    // Rule: Ollama always runs client-side (PURE) even in STANDARD mode, 
    // because the backend cannot reach the user's local network.
    // Also, Desktop Mode (Tauri) has no backend server, so it always runs client-side.
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
                                    '/api/extract-image';

        const res = await apiClient.post(endpoint, { 
            ...payload, 
            studentText: payload.studentText || payload.text, 
            settings, 
            isComplex: payload.isComplex ?? (action === 'vision') 
        }, { signal });
        let data: any;
        const rawText = await res.text();
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
            const parsed = parseCorrectionResult(data, payload.tasksLayout);
            if (payload.expertProfileName) {
                parsed.expertProfile = payload.expertProfileName;
            }
            return parsed;
        } else if (action === 'clean-and-map') {
            return parseMappingResult(data, payload.tasksLayout);
        }

        return data;
    }
}
