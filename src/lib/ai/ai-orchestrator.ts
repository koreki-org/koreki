import { apiClient } from '../api-client';
import { Task, AppSettings } from '../../types';
import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { isLocalInstance } from '@/lib/env-context';
import { GraphRunner } from '../grading/GraphRunner';
import { parseGeneratedGraph } from '../grading/graph-generator';
import { GradingGraph } from '../grading/types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { splitSkillSnippet } from './prompt-library';

/**
 * Maps the AI raw JSON results back to the Koreki Task structure and calculates totals.
 */
export function parseCorrectionResult(analysis: any, tasksLayout?: Task[] | null, studentText?: string): any {
    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        let totalObtained = 0;
        let totalMax = 0;

        tasksLayout.forEach((lt: any) => totalMax += Number(lt.maxPoints || 0));

        let hasMappingError = false;
        let hasMarkerIssue = false;

        const mappedTasks = tasksLayout.map((layoutTask: any) => {
            // --- DETECT DETERMINISTIC GRAPH-BASED TASKS & EVALUATE LOCALLY (PANG Architecture) ---
            if (layoutTask.gradingResult) {
                const enginePoints = Number(layoutTask.pointsObtained ?? layoutTask.gradingResult.totalPoints ?? 0);
                totalObtained += enginePoints;

                // Format a beautiful step-by-step breakdown as feedback
                let stepFeedback = "";
                let shownStepsCount = 0;

                layoutTask.gradingResult.stepResults.forEach((step: any) => {
                    // Skip auxiliary/setup variables with 0 max points to avoid cluttering the UI
                    if (step.maxPoints === 0) return;
                    shownStepsCount++;

                    const statusStr = step.status === 'correct' ? 'KORREKT' : 
                                    step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK (Kulanz-Punkte erhalten)' : 
                                    'FEHLERHAFT (Primärfehler)';
                    
                    if (shownStepsCount === 1) {
                        stepFeedback += `[⚙️ PANG Engine - Mathematischer Graph-Abgleich]\n`;
                    }
                    
                    stepFeedback += `• ${step.variableId}: Schülerwert: "${step.studentValue !== undefined ? step.studentValue : 'nicht angegeben'}" (Erwartet: "${step.expectedValue}") ➔ ${statusStr}\n`;
                    if (step.note) {
                        stepFeedback += `  Info: ${step.note}\n`;
                    }
                });

                // Find the AI task if it exists for extra pedagogical feedback
                const aiTask = (analysis.tasks || []).find((t: any) => t.name === layoutTask.name);
                
                // Idempotency check: If the feedback has already been formatted (e.g. on the server), return it as-is
                if (aiTask && aiTask.feedback && aiTask.feedback.includes('[⚙️ PANG Engine - Mathematischer Graph-Abgleich]')) {
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

            const aiTask = (analysis.tasks || []).find((t: any) => t.name === layoutTask.name);

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
    taskType?: string
): Promise<Record<string, any>> {
    // 1. Establish baseline using legacy heuristics (guarantees robustness)
    let heuristicValues: Record<string, any> = {};
    try {
        heuristicValues = GraphRunner.extractStudentAnswers(studentText, graph);
    } catch (e) {
        console.error('Error in legacy GraphRunner.extractStudentAnswers:', e);
    }

    if (!settings) {
        return heuristicValues;
    }

    // Look up extraction instructions from the modular skill if taskType is specified
    let extractionInstructions: string | undefined;
    if (taskType) {
        let skillKey = taskType;
        if (skillKey === 'vlsm') {
            skillKey = 'skill-calc-vlsm';
        } else if (skillKey === 'raid') {
            skillKey = 'skill-calc-raid';
        }
        
        const skillEntry = SKILL_REGISTRY[skillKey];
        if (skillEntry) {
            const { extractionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
            if (extractionSnippet) {
                extractionInstructions = extractionSnippet;
            }
        }
    }

    try {
        let extracted: Record<string, any> = {};
        const payload = {
            studentText,
            variables: graph.variables,
            extractionInstructions
        };

        // 2. Perform Isomorphic Provider Call
        if (appMode === 'PURE' || settings?.provider === 'ollama') {
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
                    maxTokens: 1000
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
                const useOpenAI = settings.provider === 'openai-compatible';
                if (!useOpenAI) {
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
                            maxTokens: 1000
                        }
                    );
                }
            } else {
                // Client-side STANDARD mode placeholder: the server handles all correction & variable extraction
                // in the /api/ai-correct endpoint, so we can securely return the heuristics here.
                return heuristicValues;
            }
        }

        // 3. Robust Filtering, Normalization & Merging
        const merged: Record<string, any> = { ...heuristicValues };

        if (extracted && typeof extracted === 'object') {
            for (const variable of graph.variables) {
                const rawVal = extracted[variable.id];
                if (rawVal !== undefined && rawVal !== null) {
                    let cleanedVal = rawVal;
                    // Type-safe normalizations
                    if (typeof rawVal === 'string') {
                        const trimmed = rawVal.trim();
                        // 1. Safe numeric conversion if it matches a clear number
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
        console.error('LLM Variable Extraction failed, using legacy heuristics:', err);
        return heuristicValues;
    }
}

/**
 * Orchestrates AI requests (Correction, Layout, Vision), choosing between direct Mistral API (PURE) or Koreki Backend (STANDARD).
 */
export async function performAIRequest(
    action: 'correction' | 'clean-and-analyze' | 'vision' | 'clean-and-map' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'variable-extraction',
    payload: any, // ARCH: any required because payload structure varies by action (Correction vs Layout)
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings
): Promise<any> {
    // Client-side deterministic graph evaluation for PURE mode
    if (action === 'correction' && payload.tasksLayout && Array.isArray(payload.tasksLayout)) {
        const activeSkillIds = settings?.activeSkillIds || [];
        const customSkills = settings?.customSkills || {};
        
        for (const task of payload.tasksLayout) {
            const isGraphTask = task.taskType && (
                task.taskType === 'vlsm' || 
                (activeSkillIds.includes(task.taskType) && (
                    task.taskType.startsWith('skill-calc-') || 
                    customSkills[task.taskType]?.isGraphBased
                ))
            );

            if (isGraphTask && task.gradingGraph) {
                try {
                    const studentText = payload.studentText || payload.text || "";
                    const studentValues = await extractStudentAnswersWithLLM(studentText, task.gradingGraph, appMode, settings, task.taskType);
                    const gradingResult = GraphRunner.grade(task.gradingGraph, studentValues);
                    task.gradingResult = gradingResult;
                    task.pointsObtained = gradingResult.totalPoints;
                    task.maxPoints = gradingResult.maxPoints;
                } catch (err: any) {
                    console.error('Error in client-side GraphRunner execution', err);
                }
            }
        }
    }

    // --- HYBRID ORCHESTRATION ---
    // Rule: Ollama always runs client-side (PURE) even in STANDARD mode, 
    // because the backend cannot reach the user's local network.
    if (appMode === 'PURE' || settings?.provider === 'ollama') {
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
            // General AI Actions (Correction, Analyze, Map)
            if (settings?.provider === 'ollama') {
                result = await executeOllamaRequest(action, payload, settings);
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
                    customSkills: settings?.customSkills
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
                    customSkills: settings?.customSkills
                });
            }

            if (action === 'correction') {
                result = parseCorrectionResult(result, payload.tasksLayout);
                if (payload.expertProfileName) {
                    result.expertProfile = payload.expertProfileName;
                }
            } else if (action === 'clean-and-map') {
                result = parseMappingResult(result, payload.tasksLayout);
            } else if (action === 'generate-graph') {
                result = parseGeneratedGraph(typeof result === 'string' ? result : JSON.stringify(result));
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
                                '/api/extract-image';

        const res = await apiClient.post(endpoint, { 
            ...payload, 
            studentText: payload.studentText || payload.text, 
            settings, 
            isComplex: payload.isComplex ?? (action === 'vision') 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'KI Anfrage fehlgeschlagen');

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
