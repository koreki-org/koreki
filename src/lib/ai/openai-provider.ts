import { fetchWithRetry } from './constants';
import { 
    buildCorrectionPrompt, 
    buildCleanAndAnalyzePrompt, 
    buildCleanAndMapPrompt, 
    buildVisionPrompt,
    buildStudentSimulatorPrompt,
    buildAnonymizePrompt,
    buildSecondOpinionPrompt,
    buildVariableExtractionPrompt,
    buildCalcTraceExtractionPrompt,
    StructuredPrompt 

} from './prompt-builder';
import { buildGraphGenerationPrompt, buildGraphRefinementPrompt, VALIDATE_GRAPH_TOOL, parseGeneratedGraph, validateGraphDeterminism } from '../grading/graph-generator';
import { buildCalcTraceGenerationPrompt, buildCalcTraceRefinementPrompt, parseGeneratedCalcTrace, validateCalcTraceDeterminism } from '../grading/calc-trace-generator';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction' | 'generate-calc-trace' | 'refine-calc-trace' | 'calc-trace-extraction';

export interface OpenAIRequestOptions {
    temperature?: number;
    topP?: number;
    presencePenalty?: number;
    maxTokens?: number;
    customPrompt?: string;
    model?: string;
    enableThinking?: boolean;
    gradingMemory?: any[] | null;
    activeSkillIds?: string[];
    customSkills?: Record<string, any>;
    responseSchema?: any;
    signal?: AbortSignal;
}

/**
 * Industrial OpenAI-Compatible Bridge
 * 🏮🏛️🛡️
 * 
 * Supports any provider using the /v1/chat/completions standard (Mittwald, DeepInfra, Together, etc.).
 * Specifically optimized for Qwen 3.6 with "Thinking Mode" support.
 */
export async function executeOpenAIRequest(
    action: AIAction,
    payload: any,
    baseUrl: string,
    apiKey: string,
    options: OpenAIRequestOptions = {}
): Promise<any> {
    const targetModel = options.model || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
    
    // 1. Prompt Building
    let promptObj: StructuredPrompt;
    let messages: any[] = [];

    if (action === 'vision') {
        promptObj = buildVisionPrompt(targetModel);
        messages = [
            { role: 'system', content: promptObj.system },
            {
                role: 'user',
                content: [
                    { type: 'text', text: promptObj.user },
                    {
                        type: 'image_url',
                        image_url: { url: `data:${payload.mimeType || 'image/jpeg'};base64,${payload.buffer}` }
                    }
                ]
            }
        ];
    } else {
        if (action === 'correction') {
            promptObj = buildCorrectionPrompt(payload.modelSolution, payload.studentText, payload.tasksLayout, options.customPrompt, targetModel, options.gradingMemory, options.activeSkillIds, options.customSkills);
        } else if (action === 'clean-and-analyze') {
            promptObj = buildCleanAndAnalyzePrompt(payload.modelSolution, targetModel);
        } else if (action === 'clean-and-map') {
            promptObj = buildCleanAndMapPrompt(payload.text || payload.studentText, payload.tasksLayout, targetModel);
        } else if (action === 'student-simulator') {
            promptObj = buildStudentSimulatorPrompt(payload.modelSolution, payload.tasksLayout, payload.selectedTasks);
        } else if (action === 'anonymize') {
            promptObj = buildAnonymizePrompt(payload.studentText);
        } else if (action === 'second-opinion') {
            promptObj = buildSecondOpinionPrompt(
                payload.taskName,
                payload.taskInstructions,
                payload.sampleSolution,
                payload.maxPoints,
                payload.studentText,
                payload.currentPoints,
                payload.currentFeedback,
                payload.teacherDoubt,
                payload.chatHistory
            );
        } else if (action === 'generate-graph') {
            promptObj = buildGraphGenerationPrompt(payload.taskText, payload.discipline, payload.userNotes);
        } else if (action === 'refine-graph') {
            promptObj = buildGraphRefinementPrompt(payload.taskText, payload.currentGraph, payload.userInstruction, payload.discipline);
        } else if (action === 'variable-extraction') {
            promptObj = buildVariableExtractionPrompt(payload.studentText, payload.variables, payload.extractionInstructions, payload.taskName);
        } else if (action === 'generate-calc-trace') {
            promptObj = buildCalcTraceGenerationPrompt(payload.taskText, payload.discipline, payload.userNotes);
        } else if (action === 'refine-calc-trace') {
            promptObj = buildCalcTraceRefinementPrompt(payload.taskText, payload.currentTrace, payload.userInstruction, payload.discipline);
        } else if (action === 'calc-trace-extraction') {
            promptObj = buildCalcTraceExtractionPrompt(payload.studentText, payload.expectedValues, payload.taskName, payload.systemPrompt, payload.correctionInstruction);
        } else {
            throw new Error(`Unsupported action: ${action}`);
        }
        
        messages = [
            { role: 'system', content: promptObj.system },
            { role: 'user', content: promptObj.user }
        ];
    }

    // 2. Parameter Hardening (Qwen 3.6 Recommendations)
    // Thinking mode is only useful for reasoning/pedagogical tasks (correction, second-opinion, graph generation/refinement)
    // For extraction/cleaning tasks (clean-and-map, clean-and-analyze, variable-extraction, vision, anonymize),
    // thinking mode is unnecessary, slower, and can lead to unwanted "corrections" or hallucinations.
    const reasoningActions: AIAction[] = ['correction', 'second-opinion'];
    const isThinking = options.enableThinking ?? (reasoningActions.includes(action) ? true : false);
    
    // System-level cleaning/mapping actions where we want to enforce prompt-defined temperature (0.0) 
    // to guarantee verbatim/structural integrity and prevent any user-configured correction temperature from inducing hallucinations.
    const isSystemAction = ['clean-and-map', 'clean-and-analyze'].includes(action);

    // Respect the prompt's defined temperature/topP if not overridden by explicit options
    let targetTemp = isSystemAction 
        ? (promptObj.options?.temperature ?? 0.0)
        : (options.temperature ?? promptObj.options?.temperature ?? (isThinking ? 1.0 : 0.2));
        
    if (action === 'correction' && options.temperature === undefined) {
        targetTemp = isThinking ? 0.6 : 0.2;
    }

    // Clamp minimum temperature to 0.2 for Qwen models on reasoning/correction tasks to prevent
    // degenerate loops or hangs. Extraction tasks (calc-trace-extraction, variable-extraction etc.)
    // must be allowed to run at 0.0 for deterministic, verbatim results.
    const isQwen = targetModel.toLowerCase().includes('qwen');
    const isReasoningAction = ['correction', 'second-opinion', 'generate-graph', 'refine-graph', 'generate-calc-trace'].includes(action);
    if (isQwen && isReasoningAction && targetTemp < 0.2) {
        targetTemp = 0.2;
    }

    const targetTopP = isSystemAction
        ? (promptObj.options?.topP ?? 0.1)
        : (options.topP ?? promptObj.options?.topP ?? (isThinking ? 0.95 : 0.8));
        
    // presence_penalty: Always respect user-configured value from AI profile.
    // Default 0.0 matches the UI default in useAiProfiles.ts. The old hardcoded 1.5 caused OCR
    // to skip repeated tokens (e.g. circled task numbers ②) and was never aligned with the UI.
    const presencePenalty = options.presencePenalty ?? 0.0;

    // 3. API Execution
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    
    // Industrial Heavyweight: 🐘
    // For massive exams/model solutions, we use the absolute maximum of the model (32k).
    // This supports documents up to ~25,000 words.
    const structuralActions: AIAction[] = ['correction', 'clean-and-analyze', 'clean-and-map'];
    const defaultLimit = structuralActions.includes(action) ? 32768 : 4000;
    const isJsonFormat = action !== 'vision' && action !== 'second-opinion';



    const requestedMaxTokens = options.maxTokens;
    const calculatedMaxTokens = isThinking 
        ? Math.max(requestedMaxTokens || 0, 16384) 
        : (requestedMaxTokens || defaultLimit);

    const body: any = {
        model: targetModel,
        messages,
        temperature: targetTemp,
        top_p: targetTopP,
        presence_penalty: presencePenalty,
        max_tokens: calculatedMaxTokens
    };
    
    // Extraction actions use json_object instead of json_schema:
    // Qwen/vLLM on Mittwald does not reliably support strict json_schema mode for simple
    // array-based extraction tasks (calc-trace-extraction, variable-extraction).
    // The prompt already enforces the structure — json_object + our repair parser is sufficient.
    const extractionActions: AIAction[] = ['calc-trace-extraction', 'variable-extraction', 'clean-and-map', 'clean-and-analyze'];
    const useJsonSchema = options.responseSchema && !extractionActions.includes(action);
    if (useJsonSchema) {
        const schemaName = action === 'generate-calc-trace' || action === 'refine-calc-trace' ? 'CalcTrace' : 'GradingGraph';
        body.response_format = {
            type: "json_schema",
            json_schema: {
                name: schemaName,
                strict: true,
                schema: options.responseSchema
            }
        };
    } else if (isJsonFormat) {
        body.response_format = { type: 'json_object' };
    }

    // Specific Qwen/OpenAI-compat Extra Params
    // [Industrial Alert] 🛡️
    // LiteLLM (Mittwald's proxy) crashes if we pass custom non-standard fields like chat_template_kwargs or enable_thinking,
    // because it falsely assumes this is an Anthropic/Custom-specific request and searches the wrong catalog.
    // We rely on the system prompt or native model behavior for reasoning instead.
    
    const isGraphAction = action === 'generate-graph' || action === 'refine-graph';
    if (isGraphAction) {
        body.tools = [VALIDATE_GRAPH_TOOL];
        body.tool_choice = "auto";
    }

    let responseContent: string | null = null;
    let responseUsage: any = undefined;
    let toolRetryCount = 0;
    const maxToolRetries = 3;

    while (toolRetryCount <= maxToolRetries) {
        let currentData: any;

        if (isDesktopTarget()) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const invokePromise = invoke<string>('execute_ai_proxy_command', {
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(body)
                });
                
                let res: string;
                if (options.signal) {
                    if (options.signal.aborted) {
                        throw new DOMException('The user aborted a request.', 'AbortError');
                    }
                    res = await Promise.race([
                        invokePromise,
                        new Promise<string>((_, reject) => {
                            options.signal!.addEventListener('abort', () => {
                                reject(new DOMException('The user aborted a request.', 'AbortError'));
                            });
                        })
                    ]);
                } else {
                    res = await invokePromise;
                }
                
                currentData = JSON.parse(res);
            } catch (e) {
                throw new Error(`Desktop Proxy Fehler: ${e}`);
            }
        } else {
            const response = await fetchWithRetry(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: options.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`KI-Provider Fehler (${response.status}): ${errorData.error?.message || response.statusText}`);
            }

            currentData = await response.json();
            console.log("[OPENAI-RESPONSE-DATA]", JSON.stringify(currentData));
        }

        const message = currentData.choices?.[0]?.message;
        responseUsage = currentData.usage;

        // Tool Calling Logic
        if (message?.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            if (toolCall.function.name === 'validate_graph') {
                const draftGraphJson = toolCall.function.arguments;
                const draftGraph = parseGeneratedGraph(draftGraphJson, { skipSanitization: true });
                let toolResultString = "";
                
                if (!draftGraph) {
                    toolResultString = "Invalid JSON structure or missing variables. Ensure you match the GRADING_GRAPH_SCHEMA exactly.";
                } else {
                    const validation = validateGraphDeterminism(draftGraph);
                    if (validation.isValid) {
                        // [Short-Circuit Optimization]
                        return draftGraph;
                    } else {
                        toolResultString = `Mathematical validation failed: ${validation.error}. Please fix this and try again or return the corrected graph.`;
                    }
                }
                
                messages.push(message);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: toolResultString
                });

                body.messages = messages; // Update the payload for the next request
                toolRetryCount++;
                continue;
            } else if (toolCall.function.name === 'validate_calc_trace') {
                const draftTraceJson = toolCall.function.arguments;
                const draftTrace = parseGeneratedCalcTrace(draftTraceJson);
                let toolResultString = "";

                if (!draftTrace) {
                    toolResultString = "Invalid JSON structure or missing fields. Ensure you match the CALC_TRACE_SCHEMA exactly.";
                } else {
                    const validation = validateCalcTraceDeterminism(draftTrace);
                    if (validation.isValid) {
                        return draftTrace;
                    } else {
                        toolResultString = `Mathematical validation failed: ${validation.error}. Please fix this and try again.`;
                    }
                }

                messages.push(message);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: toolResultString
                });

                body.messages = messages; // Update the payload for the next request
                toolRetryCount++;
                continue;
            }
        }

        // No tool calls or unknown tool, we have our final content
        responseContent = message?.content;
        break;
    }

    if (toolRetryCount > maxToolRetries) {
        throw new Error('Die KI konnte nach mehreren Versuchen keinen mathematisch validen Graphen generieren. Bitte passe den Aufgabentext an oder nutze ein leistungsstärkeres Modell.');
    }

    if (responseContent === null || responseContent === undefined) {
        throw new Error('Die KI hat eine leere Antwort (null) zurückgegeben. Dies kann passieren, wenn das Modell überlastet ist oder die Eingabe blockiert wurde.');
    }

    let content = responseContent;

    // 4. Robust JSON Parsing
    if (action !== 'vision' && action !== 'second-opinion') {
        const repairUnescapedBackslashes = (jsonStr: string): string => {
            return jsonStr.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        };

        // Helper function to strip thinking/reasoning blocks first
        const stripThinkingBlocks = (rawStr: string): string => {
            return rawStr
                .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
                .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '')
                .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
                .replace(/\[thought\][\s\S]*?(\[\/thought\]|$)/gi, '')
                .replace(/\[think\][\s\S]*?(\[\/think\]|$)/gi, '')
                .replace(/<channel>[\s\S]*?(<\/channel>|$)/gi, '')
                .replace(/<annotation>[\s\S]*?(<\/annotation>|$)/gi, '')
                .replace(/<chain_of_thought>[\s\S]*?(<\/chain_of_thought>|$)/gi, '')
                .trim();
        };

        const cleanContent = stripThinkingBlocks(content);

        // Try extracting JSON from markdown block ```json ... ``` first if present
        const extractJsonCandidate = (text: string): string => {
            const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (markdownMatch && markdownMatch[1]) {
                return markdownMatch[1].trim();
            }
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return objectMatch[0].trim();
            }
            const arrayMatch = text.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return arrayMatch[0].trim();
            }
            return text.trim();
        };

        const jsonCandidate = extractJsonCandidate(cleanContent);

        try {
            return {
                ...JSON.parse(repairUnescapedBackslashes(jsonCandidate)),
                usage: responseUsage
            };
        } catch (e) {
            // Secondary fallback: Try trailing comma cleanup and truncated JSON recovery
            try {
                const partiallyRepaired = jsonCandidate
                    .replace(/,\s*([\]\}])/g, '$1') // Removes trailing commas before ] or }
                    .trim();

                return {
                    ...JSON.parse(repairUnescapedBackslashes(partiallyRepaired)),
                    usage: responseUsage
                };
            } catch (e2) {
                try {
                    // Tertiary fallback: Repair unclosed string quotes, braces, and brackets for truncated LLM responses
                    const repairTruncatedJson = (str: string): string => {
                        let s = str.trim();
                        s = s.replace(/,\s*"[^"]*"?\s*:\s*"?[^"]*$/g, '');
                        s = s.replace(/,\s*$/g, '');
                        const quoteCount = (s.match(/"/g) || []).length;
                        if (quoteCount % 2 !== 0) s += '"';
                        
                        const stack: string[] = [];
                        let inString = false;
                        let isEscaped = false;

                        for (let i = 0; i < s.length; i++) {
                            const char = s[i];
                            if (char === '"' && !isEscaped) {
                                inString = !inString;
                            } else if (!inString) {
                                if (char === '{') stack.push('}');
                                else if (char === '[') stack.push(']');
                                else if (char === '}' || char === ']') {
                                    if (stack.length > 0 && stack[stack.length - 1] === char) {
                                        stack.pop();
                                    }
                                }
                            }
                            isEscaped = (char === '\\' && !isEscaped);
                        }

                        while (stack.length > 0) {
                            s += stack.pop();
                        }
                        return s;
                    };

                    const autoRepaired = repairTruncatedJson(jsonCandidate);
                    return {
                        ...JSON.parse(repairUnescapedBackslashes(autoRepaired)),
                        usage: responseUsage
                    };
                } catch (e3) {
                    console.error("JSON Parse Fatal Error. Raw Content:", content);
                    console.error("Cleaned Candidate:", jsonCandidate);
                    throw new Error("KI-Antwort konnte nicht als JSON verarbeitet werden. (Möglicherweise unvollständige Antwort oder Formatierungsfehler im Thinking-Block)");
                }
            }
        }
    }

    return { 
        text: content,
        usage: responseUsage 
    };
}
