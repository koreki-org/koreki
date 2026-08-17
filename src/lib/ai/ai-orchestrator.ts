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
import { GradingGraph, StepResult, VariableDefinition, GradingScalar } from '../grading/types';
import { TargetGoal, GradingCriterion } from '../grading/calc-trace-types';
import { isEngineOwned, resolveEngineVerdict } from '../grading/criterion-source';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { splitSkillSnippet } from './prompt-library';
import { splitTextByTasks } from '../task-utils';
import { evaluateCalcTrace, formatCalcTraceForPrompt } from '../grading/CalcTrace';
import { extractStudentAST } from '../grading/calc-trace-extraction';
import { shouldDisablePoints } from './prompt-builder';
import { requireOpenAiConnection } from './provider-connection';
import { mapLayoutTask } from './correction-mapping';
import { runLocalGradingEngines } from './local-grading-pass';

export { shouldDisablePoints };

/**
 * Bildet die KI-Antwort auf die Aufgabenstruktur der Musterloesung ab.
 *
 * Die Musterloesung gibt vor, welche Aufgaben es gibt — nicht die KI. Fuer jede
 * Aufgabe entscheidet `mapLayoutTask`, wer die Punkte vergibt (Sandbox, Graph
 * oder Modell); die vier Faelle stehen in `correction-mapping.ts`.
 */
export function parseCorrectionResult(analysis: AIAnalysisResult, tasksLayout?: Task[] | null): AIAnalysisResult {
    const parsed = AIAnalysisResultSchema.safeParse(analysis);
    if (parsed.success) {
        analysis = parsed.data as AIAnalysisResult;
    }

    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        const aiTasks = analysis.tasks || [];
        const ergebnisse = tasksLayout.map((layoutTask: Task) => mapLayoutTask(layoutTask, aiTasks));
        const mappedTasks = ergebnisse.map(e => e.task);

        const totalMax = tasksLayout.reduce((summe, lt) => summe + Number(lt.maxPoints || 0), 0);
        const totalObtained = mappedTasks.reduce((summe, t) => summe + Number(t.pointsObtained || 0), 0);

        analysis.tasks = mappedTasks;
        analysis.overallMatchPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        // --- INDUSTRIAL CONFIDENCE BRAKE ---
        // If the structure is broken (naming mismatch) or too many OCR problems, the entire document requires review.
        const hasMappingError = ergebnisse.some(e => e.mappingError);
        const hasMarkerIssue = ergebnisse.some(e => e.markerIssue);
        analysis.confidence = (hasMappingError || hasMarkerIssue) ? 0 : Number(analysis.confidence || 0);
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
 * Eine Aufgabe in der Zuordnungs-Phase (Clean & Map): nur Text, noch keine
 * Bewertung. Die entsteht erst in der Korrektur-Phase, deshalb nicht `AITask`.
 */
export interface MappedTask {
    name?: string;
    content?: string;
}

export interface MappingResult {
    tasks?: MappedTask[];
    [key: string]: unknown;
}

/**
 * Ordnet die Zuordnungs-Antwort der Aufgabenstruktur zu. Die Musterloesung gibt
 * die Aufgaben vor; was die KI unter einem anderen Namen geliefert hat, taucht
 * als Hinweis auf, statt still zu verschwinden.
 */
export function parseMappingResult<T extends MappingResult>(result: T, tasksLayout?: Task[] | null): T {
    if (!tasksLayout || !Array.isArray(tasksLayout)) return result;

    const aiTasks = result.tasks || [];

    result.tasks = tasksLayout.map((layoutTask: Task) => {
        const aiTask = aiTasks.find(t => t.name === layoutTask.name);
        if (aiTask) return aiTask;

        const layoutName = (layoutTask.name ?? '').toLowerCase().trim();
        const nearMiss = layoutName
            ? aiTasks.find(t => t.name?.toLowerCase().trim() === layoutName)
            : undefined;

        return {
            name: layoutTask.name,
            content: nearMiss
                ? `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")]\n\n${nearMiss.content}`
                : '[unbeantwortet]'
        };
    });

    return result;
}

/**
 * Orchestrates AI requests (Correction, Layout, Vision), choosing between direct Mistral API (PURE) or Koreki Backend (STANDARD).
 */
export async function performAIRequest(
    action: 'correction' | 'clean-and-analyze' | 'vision' | 'clean-and-map' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction' | 'generate-calc-trace',
    payload: any, // ARCH: any required because payload structure varies by action (Correction vs Layout)
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings,
    signal?: AbortSignal
): Promise<any> {
    // Wo Graph oder Rechenkette hinterlegt sind, rechnet Koreki selbst — vor dem
    // KI-Aufruf. Denselben Lauf macht der Server-Weg in pages/api/ai-correct.
    const isClientSideExecution = appMode === 'PURE' || isDesktopTarget();
    if (isClientSideExecution && action === 'correction' && payload.tasksLayout && Array.isArray(payload.tasksLayout)) {
        await runLocalGradingEngines({
            tasksLayout: payload.tasksLayout,
            studentText: payload.studentText || payload.text || '',
            appMode,
            settings,
            herkunft: 'Client'
        });
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

        // Die Pruefung darueber greift nur bei `provider === 'mistral'`. Mistral
        // ist unten aber der RUECKFALL und laeuft auch ohne gesetzten Provider —
        // dort ging bisher `Bearer undefined` raus, der Nutzer sah einen 401 des
        // Anbieters statt des klaren Konfigurationsfehlers.
        const requireMistralKey = (): string => {
            if (!mistralKey) throw new Error("PURE_KEY_MISSING");
            return mistralKey;
        };

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
                    ocrData = await executeMistralRequest('vision', { ...payload, buffer: b64 }, requireMistralKey());
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
                    genResult = await executeMistralRequest('generate-graph', payload, requireMistralKey(), {
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
                            correctionResult = await executeMistralRequest('refine-graph', correctionPayload, requireMistralKey(), {
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

                graph.validation = {
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
                    refineResult = await executeMistralRequest('refine-graph', payload, requireMistralKey(), {
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
                graph.validation = {
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
                result = await executeMistralRequest(action, payload, requireMistralKey(), {
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
