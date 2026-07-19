import { logger } from '@/lib/logger';
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
import { AppSettings } from '../../types';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction' | 'generate-calc-trace' | 'refine-calc-trace' | 'calc-trace-extraction';

/**
 * Helper to normalize Ollama URLs ensuring they have a protocol prefix.
 */
export function normalizeOllamaUrl(url: string): string {
    let clean = url.trim();
    if (!clean) return 'http://localhost:11434';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
    }
    return clean;
}

async function sendDebugLog(data: {
    action: string;
    model: string;
    numCtx?: number;
    temp: number;
    topP: number;
    finalMaxTokens: number;
    systemPrompt?: string;
    userPrompt: string;
    response: any;
}) {
    try {
        await fetch('/api/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        // Silent catch
    }
}

/**
 * Specifically optimized for Gemma 4 E4B (multimodal).
 * In Desktop mode, this bypasses CORS by using a Rust-Backend Proxy.
 */
export async function executeOllamaRequest(
    action: AIAction,
    payload: any,
    settings: AppSettings,
    signal?: AbortSignal,
    options?: { responseSchema?: any }
): Promise<any> {
    if (!settings || !settings.ollamaUrl) {
        throw new Error('Ollama-Verbindung fehlgeschlagen: Keine Ollama-URL in den Einstellungen konfiguriert.');
    }
    if (!settings.ollamaModel) {
        throw new Error('Ollama-Verbindung fehlgeschlagen: Kein Ollama-Modell in den Einstellungen ausgewählt.');
    }
    const baseUrl = normalizeOllamaUrl(settings.ollamaUrl);
    let model = settings.ollamaModel.trim();

    // Dynamically resolve model name against available local models
    try {
        const { models } = await fetchOllamaModels(baseUrl);
        if (models && models.length > 0) {
            model = resolveOllamaModel(model, models);
        }
    } catch (e) {
        logger.warn("Failed to dynamically resolve Ollama model name:", e);
    }

    const isVision = action === 'vision';
    let targetMaxTokens = isVision
        ? (settings.visionMaxTokens ?? 16000)
        : (settings.maxTokens ?? 32768);

    // 1. Prompt Building
    let promptObj: StructuredPrompt;
    let images: string[] | undefined = undefined;

    if (action === 'vision') {
        promptObj = buildVisionPrompt(model);
        images = [payload.buffer]; // Base64 buffer
    } else if (action === 'correction') {
        promptObj = buildCorrectionPrompt(
            payload.modelSolution, 
            payload.studentText, 
            payload.tasksLayout, 
            settings.correctionPrompt, 
            model,
            payload.gradingMemory,
            settings.activeSkillIds,
            settings.customSkills
        );
    } else if (action === 'clean-and-analyze') {
        promptObj = buildCleanAndAnalyzePrompt(payload.modelSolution, model);
    } else if (action === 'clean-and-map') {
        promptObj = buildCleanAndMapPrompt(payload.text || payload.studentText, payload.tasksLayout, model);
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

    // 1.5. Dynamic Parameter & Context size Estimation (Industrial Standard)
    const modelLower = model.toLowerCase();
    const isSystemAction = ['clean-and-analyze', 'clean-and-map', 'variable-extraction', 'generate-graph', 'refine-graph', 'generate-calc-trace', 'calc-trace-extraction'].includes(action);

    const isReasoningModel = modelLower.includes('r1') || 
                              modelLower.includes('qwq') || 
                              modelLower.includes('reasoning');
    const shouldIncludeThink = settings.enableThinking === true || isReasoningModel;
    const thinkValue = (action === 'vision' || isSystemAction) ? false : (settings.enableThinking ?? false);

    if (isSystemAction) {
        targetMaxTokens = Math.min(targetMaxTokens, 8192);
    }

    const isGemmaOrMoE = (modelLower.includes('gemma') || modelLower.includes('26b') || modelLower.includes('a4b') || modelLower.includes('moe'))
        && !modelLower.includes('31b')
        && !modelLower.includes('32b')
        && !modelLower.includes('dense');
    const isQwen = modelLower.includes('qwen');

    let targetTemp: number;
    let targetTopP: number;

    if (isVision) {
        targetTemp = settings.visionTemperature ?? promptObj.options?.temperature ?? 0.0;
        targetTopP = settings.visionTopP ?? promptObj.options?.topP ?? 1.0;
    } else if (isSystemAction) {
        // Respect user temperature if configured, otherwise apply model-specific defaults:
        // gemma/moe -> 0.5, qwen -> 0.3, others -> 0.2
        const defaultTemp = isGemmaOrMoE ? 0.5 : (isQwen ? 0.3 : 0.2);
        const defaultTopP = 0.9;

        if (action === 'clean-and-map' || action === 'clean-and-analyze') {
            // clean-and-map and clean-and-analyze must use fixed default values and ignore profile settings completely
            targetTemp = defaultTemp;
            targetTopP = defaultTopP;
        } else {
            // For highly structured mathematical extraction and generation tasks, we force 0.0 temperature
            // for absolute determinism, unless user manually configured a specific temperature.
            const deterministicActions = ['calc-trace-extraction', 'generate-calc-trace', 'variable-extraction'];
            const isDeterministicAction = deterministicActions.includes(action);
            targetTemp = settings.temperature ?? (isDeterministicAction ? 0.0 : defaultTemp);
            targetTopP = settings.topP ?? defaultTopP;
        }
    } else {
        // Respect user intelligence settings for correction and second-opinion
        const defaultTemp = isGemmaOrMoE ? 0.5 : (isQwen ? 0.3 : 0.1);
        targetTemp = settings.temperature ?? promptObj.options?.temperature ?? defaultTemp;
        targetTopP = settings.topP ?? promptObj.options?.topP ?? 1.0;
    }

    // Enforce minimum temperature to prevent local GPU loops
    if (isVision) {
        if (targetTemp < 0.4) {
            targetTemp = 0.4;
        }
    } else {
        if (isQwen) {
            // Qwen models are extremely prone to infinite repetition loops in Ollama at very low temperatures (<= 0.1) in free-text mode.
            // For system actions or structured JSON mode, we allow temperature to go down to 0.0 for maximum determinism.
            const hasStructuredFormat = !!(options?.responseSchema) || isSystemAction || action !== 'second-opinion';
            if (!hasStructuredFormat && targetTemp < 0.2) {
                targetTemp = 0.2;
            }
        } else if (targetTemp === 0) {
            targetTemp = 0.1;
        }

        // Clamp minimum temperature specifically for Gemma / MoE models to prevent loops in JSON mode
        if (isGemmaOrMoE && targetTemp < 0.5) {
            targetTemp = 0.5;
        }
    }

    // Dynamic Context size Estimation
    const promptCharCount = promptObj.user.length + (promptObj.system?.length || 0);
    // Lower divisor to 2.8 to prevent underestimating tokens (especially for German text / formulas)
    const estimatedTextTokens = Math.ceil(promptCharCount / 2.8);
    const imageCount = images?.length || 0;
    const imageTokens = imageCount * 8000; // Vision Hardening: 8000 tokens per image

    let numCtx: number | undefined = settings.ollamaNumCtx;
    if (!numCtx || numCtx === 0) {
        const customLimit = isVision ? (settings.visionMaxTokens ?? 0) : (settings.maxTokens ?? 0);
        // If the model is a reasoning model (or thinking is enabled), allocate a large 12k buffer
        // to prevent context overflows during long internal thinking generations.
        const needsMoreBuffer = shouldIncludeThink || isReasoningModel;
        const responseBuffer = Math.max(needsMoreBuffer ? 12000 : 4000, customLimit);
        let totalEstimated = estimatedTextTokens + imageTokens + responseBuffer;

        // Force a minimum context of 16k for complex mathematical extraction actions
        if (action === 'calc-trace-extraction' || action === 'generate-calc-trace') {
            totalEstimated = Math.max(totalEstimated, 16384);
        }

        if (totalEstimated <= 8192) {
            numCtx = 8192;
        } else if (totalEstimated <= 16384) {
            numCtx = 16384;
        } else {
            numCtx = 32768;
        }
    }

    // Cloud-variants often don't support num_ctx or crash on value mismatch
    if (modelLower.includes('-cloud')) {
        numCtx = undefined;
    }

    const finalMaxTokens = numCtx 
        ? Math.min(targetMaxTokens, Math.max(1000, numCtx - estimatedTextTokens - imageTokens)) 
        : targetMaxTokens;

    // 2. Execution Path Separation
    if (isDesktopTarget()) {
        try {
            // BRAKE: Dynamic import to prevent SaaS build issues
            const { invoke } = await import('@tauri-apps/api/core');
            // [Industrial Validation] If Mistral works but Qwen fails with connection error,
            // we must unify the request structure. Enabled JSON format for all.
            const targetFormat = (action === 'vision' || action === 'second-opinion') 
                ? undefined 
                : (options?.responseSchema ? options.responseSchema : 'json');

            const invokePromise = invoke<string>('execute_ollama_command', {
                url: baseUrl,
                model,
                prompt: promptObj.user,
                requestId: String(payload.requestId || 'default'),
                stream: false, 
                images,
                system: promptObj.system,
                format: targetFormat,
                numCtx: numCtx, 
                temperature: targetTemp,
                topP: targetTopP,
                numPredict: finalMaxTokens,
                think: thinkValue
            });

            let content: string;
            if (signal) {
                if (signal.aborted) {
                    throw new DOMException('The user aborted a request.', 'AbortError');
                }
                content = await Promise.race([
                    invokePromise,
                    new Promise<string>((_, reject) => {
                        signal.addEventListener('abort', () => {
                            reject(new DOMException('The user aborted a request.', 'AbortError'));
                        });
                    })
                ]);
            } else {
                content = await invokePromise;
            }


            sendDebugLog({
                action,
                model,
                numCtx,
                temp: targetTemp,
                topP: targetTopP,
                finalMaxTokens,
                systemPrompt: promptObj.system,
                userPrompt: promptObj.user,
                response: content
            });

            return processOllamaResponse(content, action, model);

        } catch (error) {
            logger.error("Ollama Backend Proxy Error:", error);
            throw new Error(`Ollama Verbindung fehlgeschlagen: ${error}`);
        }
    }    // --- Native Ollama API Fetch ---
    const messages: any[] = [];
    if (promptObj.system) {
        messages.push({ role: 'system', content: promptObj.system });
    }
    if (isVision) {
        messages.push({
            role: 'user',
            content: promptObj.user,
            images: [payload.buffer]
        });
    } else {
        messages.push({
            role: 'user',
            content: promptObj.user
        });
    }

    const isGraphAction = action === 'generate-graph' || action === 'refine-graph';
    let tools: any[] | undefined = undefined;
    if (isGraphAction) {
        tools = [
            {
                type: 'function',
                function: VALIDATE_GRAPH_TOOL.function
            }
        ];
    }
    
    let fullContent = '';
    let toolRetryCount = 0;
    const maxToolRetries = 3;

    while (toolRetryCount <= maxToolRetries) {
        // We disable streaming if we are using tools to safely capture the full tool_calls object.
        const isStreaming = !isGraphAction;

        // If tools are active, we CANNOT enforce a strict responseSchema! 
        // A tool call structure {"name": "...", "arguments": {...}} would violate the graph schema, 
        // causing Ollama's backend to reject the generation and return an empty string.
        // Furthermore, passing complex JSON Schemas to Ollama can cause 110s timeouts.
        // We rely on standard 'json' formatting and the system prompt.
        const formatParam = (action === 'vision' || action === 'second-opinion' || tools) 
            ? undefined 
            : 'json';

        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                model,
                messages,
                stream: isStreaming,
                tools,
                format: formatParam,
                think: thinkValue,
                options: { 
                    num_ctx: numCtx,
                    temperature: targetTemp,
                    top_p: targetTopP,
                    num_predict: finalMaxTokens,
                    repeat_penalty: isVision ? 1.2 : 1.15,
                    presence_penalty: settings.presencePenalty ?? 0.0
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Ollama Error: ${response.status}${errText ? ` - ${errText}` : ''}`);
        }

        fullContent = '';
        let toolCalls: any[] = [];

        if (isStreaming) {
            if (response.body) {
                if (typeof (response.body as any).getReader === 'function') {
                    const reader = (response.body as any).getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (const line of lines) {
                            const cleanLine = line.trim();
                            if (!cleanLine) continue;
                            try {
                                const parsed = JSON.parse(cleanLine);
                                if (parsed.message?.content) {
                                    fullContent += parsed.message.content;
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    }
                    if (buffer.trim()) {
                        try {
                            const parsed = JSON.parse(buffer.trim());
                            if (parsed.message?.content) {
                                fullContent += parsed.message.content;
                            }
                        } catch (e) {}
                    }
                } else {
                    for await (const chunk of response.body as any) {
                        const chunkStr = chunk.toString();
                        const lines = chunkStr.split('\n');
                        for (const line of lines) {
                            const cleanLine = line.trim();
                            if (!cleanLine) continue;
                            try {
                                const parsed = JSON.parse(cleanLine);
                                if (parsed.message?.content) {
                                    fullContent += parsed.message.content;
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
        } else {
            const data = await response.json();
            fullContent = data.message?.content || '';
            toolCalls = data.message?.tool_calls || [];
        }

        // Handle tool calls
        if (toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            if (toolCall.function.name === 'validate_graph') {
                const args = toolCall.function.arguments;
                const draftGraphJson = typeof args === 'string' ? args : JSON.stringify(args);
                const draftGraph = parseGeneratedGraph(draftGraphJson, { skipSanitization: true });
                let toolResultString = "";
                
                if (!draftGraph) {
                    toolResultString = "Invalid JSON structure or missing variables. Ensure you match the GRADING_GRAPH_SCHEMA exactly.";
                } else {
                    const validation = validateGraphDeterminism(draftGraph);
                    if (validation.isValid) {
                        // [Short-Circuit Optimization]
                        // Qwen/Mistral often return empty strings after a successful tool call instead of repeating the JSON.
                        // We intercept the valid draftGraph here and return it immediately.
                        return draftGraph;
                    } else {
                        toolResultString = `Mathematical validation failed: ${validation.error}. Please fix this and try again or return the corrected graph.`;
                    }
                }
                
                messages.push({
                    role: "assistant",
                    content: fullContent,
                    tool_calls: toolCalls
                });
                messages.push({
                    role: "tool",
                    name: toolCall.function.name,
                    content: toolResultString
                });

                toolRetryCount++;
                continue;
            } else if (toolCall.function.name === 'validate_calc_trace') {
                const args = toolCall.function.arguments;
                const draftTraceJson = typeof args === 'string' ? args : JSON.stringify(args);
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

                messages.push({
                    role: "assistant",
                    content: fullContent,
                    tool_calls: toolCalls
                });
                messages.push({
                    role: "tool",
                    name: toolCall.function.name,
                    content: toolResultString
                });

                toolRetryCount++;
                continue;
            }
        }

        // If no tool calls, exit loop
        break;
    }


    sendDebugLog({
        action,
        model,
        numCtx,
        temp: targetTemp,
        topP: targetTopP,
        finalMaxTokens,
        systemPrompt: promptObj.system,
        userPrompt: promptObj.user,
        response: fullContent
    });

    return processOllamaResponse(fullContent, action, model);

}

function validateOllamaResponse(parsed: any, action: AIAction): any {
    if ((action === 'clean-and-analyze' || action === 'clean-and-map') && parsed) {
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
            throw new Error(`Ungültige KI-Struktur: Das "tasks"-Array fehlt oder ist unvollständig.`);
        }
        for (let i = 0; i < parsed.tasks.length; i++) {
            const task = parsed.tasks[i];
            if (!task || typeof task !== 'object') {
                throw new Error(`Ungültige KI-Struktur: Aufgabe an Index ${i} ist kein gültiges Objekt.`);
            }
            if (!task.name || String(task.name).trim() === '') {
                throw new Error(`Ungültige KI-Struktur: Aufgabe an Index ${i} besitzt keinen gültigen Namen (Punkte: ${task.maxPoints ?? 'unbekannt'}).`);
            }
        }
    }
    return parsed;
}

function processOllamaResponse(content: string | null | undefined, action: AIAction, modelName: string) {
    if (content === null || content === undefined) {
        throw new Error(`Ollama hat eine leere Antwort geliefert. \nGrund: Der Backend-Proxy hat keine Daten vom Modell empfangen.`);
    }
    if (action === 'vision' || action === 'second-opinion') return { text: content };
    let cleaned = content.trim();
    
    // Industrial Diagnostics: Handle empty responses caused by silent backend failures
    if (!cleaned) {
        throw new Error(`Ollama hat eine leere Antwort geliefert. \nGrund: Der Backend-Proxy hat keine Daten vom Modell empfangen. \n\nCheckliste:\n1. Ist das Modell "${modelName}" auf dem Server geladen?\n2. Ist der Server ausgebremst (GPU-VRAM voll)?\n3. Ist die Musterlösung evtl. zu groß für das Kontextfenster?`);
    }

    // [Industrial Hardening] 🛡️
    // 1. Remove Markdown markers if model wrapped JSON in code blocks (common in non-forced modes)
    let rawJson = cleaned;
    if (rawJson.includes('```json')) {
        const parts = rawJson.split('```json');
        if (parts.length > 1) rawJson = parts[1].split('```')[0].trim();
    } else if (rawJson.includes('```')) {
        const parts = rawJson.split('```');
        if (parts.length > 1) rawJson = parts[1].split('```')[0].trim();
    }

    // 2. Greedy Extraction (First { or [ to Last } or ])
    const standardJson = (() => {
        const firstCurly = rawJson.indexOf('{');
        const firstSquare = rawJson.indexOf('[');
        const isArray = (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly));
        
        if (isArray) {
            const match = rawJson.match(/\[[\s\S]*\]/);
            return match ? match[0] : rawJson;
        } else {
            const match = rawJson.match(/\{[\s\S]*\}/);
            return match ? match[0] : rawJson;
        }
    })();

    const escapeInnerQuotes = (jsonStr: string): string => {
        let result = '';
        let inString = false;
        let i = 0;
        while (i < jsonStr.length) {
            const char = jsonStr[i];
            if (char === '"') {
                let isEscaped = false;
                let backslashes = 0;
                let j = i - 1;
                while (j >= 0 && jsonStr[j] === '\\') {
                    backslashes++;
                    j--;
                }
                if (backslashes % 2 === 1) {
                    isEscaped = true;
                }

                // Look ahead to check if the quote is structural
                let nextNonWhitespace = '';
                let k = i + 1;
                while (k < jsonStr.length) {
                    const c = jsonStr[k];
                    if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
                        nextNonWhitespace = c;
                        break;
                    }
                    k++;
                }

                let isStructural = nextNonWhitespace === ',' || 
                                     nextNonWhitespace === '}' || 
                                     nextNonWhitespace === ']' || 
                                     nextNonWhitespace === ':';

                let nextKeyMatched = false;
                if (nextNonWhitespace === '"') {
                    let nextQuoteIdx = -1;
                    let m = k + 1;
                    while (m < jsonStr.length) {
                        if (jsonStr[m] === '"' && jsonStr[m - 1] !== '\\') {
                            nextQuoteIdx = m;
                            break;
                        }
                        m++;
                    }
                    if (nextQuoteIdx !== -1) {
                        let afterNextQuote = '';
                        let n = nextQuoteIdx + 1;
                        while (n < jsonStr.length) {
                            const c = jsonStr[n];
                            if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
                                afterNextQuote = c;
                                break;
                            }
                            n++;
                        }
                        if (afterNextQuote === ':') {
                            isStructural = true;
                            nextKeyMatched = true;
                        }
                    }
                }

                if (isStructural) {
                    if (isEscaped) {
                        if (result.endsWith('\\')) {
                            result = result.slice(0, -1);
                        }
                    }
                    inString = false;
                    result += char;
                    if (nextKeyMatched) {
                        result += ',';
                    }
                } else if (isEscaped) {
                    result += char;
                } else if (!inString) {
                    inString = true;
                    result += char;
                } else {
                    result += '\\"';
                }
            } else {
                result += char;
            }
            i++;
        }
        return result;
    };

    const repairJsonString = (jsonStr: string): string => {
        // 1. Escape literal unescaped double quotes inside strings
        let repaired = escapeInnerQuotes(jsonStr);
        // 2. Repair unescaped backslashes (like in LaTeX or paths)
        repaired = repaired.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        // 3. Escape literal newlines and carriage returns inside double-quoted string values
        repaired = repaired.replace(/"((?:[^"\\]|\\[\s\S])*)"/g, (match, p1) => {
            return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
        });
        return repaired;
    };

    try {
        return validateOllamaResponse(JSON.parse(repairJsonString(standardJson)), action);
    } catch (e) {
        if (e instanceof Error && e.message.startsWith('Ungültige KI-Struktur')) {
            throw e;
        }
        // Fallback for Thinking/Reasoning blocks or corrupted prefixes
        try {
            const cleanContent = rawJson
                .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '') 
                .replace(/<thought>[\s\S]*/gi, '')
                .replace(/<\/thought>[\s\S]*/gi, '')
                .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
                .replace(/<reasoning>[\s\S]*/gi, '')
                .replace(/<\/reasoning>[\s\S]*/gi, '')
                .replace(/^[\s\S]*?(?=\{|\[)/, '') 
                .replace(/(?<=\}|\])[^\]\}]*$/, '') 
                .trim();

            const firstCurly = cleanContent.indexOf('{');
            const firstSquare = cleanContent.indexOf('[');
            const isArray = (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly));

            const hardenedMatch = (() => {
                if (isArray) {
                    return cleanContent.match(/\[[\s\S]*\]/);
                } else {
                    return cleanContent.match(/\{[\s\S]*\}/);
                }
            })();
            const hardenedJson = hardenedMatch ? hardenedMatch[0] : cleanContent;
            
            // Industrial Recovery: Check for trailing commas in arrays/objects (common LLM failure)
            const partiallyRepaired = hardenedJson
                .replace(/,\s*([\]\}])/g, '$1') // Removes trailing commas before ] or }
                .trim();

            return validateOllamaResponse(JSON.parse(repairJsonString(partiallyRepaired)), action);
        } catch (e2) {
            if (e2 instanceof Error && e2.message.startsWith('Ungültige KI-Struktur')) {
                throw e2;
            }
            // Fatal Error Diagnostics
            const start = cleaned.slice(0, 100); // Increased visibility
            const end = cleaned.slice(-100);
            const errorMsg = e2 instanceof Error ? e2.message : String(e2);
            
            try {
                const fs = require('fs');
                const path = require('path');
                const scratchDir = 'C:\\Users\\AndreasHeid\\.gemini\\antigravity\\brain\\40d31989-9543-4b81-aec1-dc6882e7aeb9\\scratch';
                if (!fs.existsSync(scratchDir)) {
                    fs.mkdirSync(scratchDir, { recursive: true });
                }
                fs.writeFileSync(path.join(scratchDir, 'raw_ollama_error.json'), cleaned, 'utf-8');
            } catch (err) {}
            
            throw new Error(`Ollama JSON-Parse fehlgeschlagen (${errorMsg}). \n\nAnfang: [${start}]\n\nEnde: [${end}]\n\nLänge: ${cleaned.length}`);
        }
    }
}

/**
 * Industrial Ping for Ollama Discovery
 */
export async function pingOllama(baseUrl: string): Promise<{ success: boolean; isSelfSigned: boolean; version: string }> {
    const url = normalizeOllamaUrl(baseUrl);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ success: boolean; is_self_signed: boolean; version: string }>('ping_ollama_command', { url });
            return { success: res.success, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            return { success: false, isSelfSigned: false, version: '' };
        }
    }

    let timeoutId: any;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
            try {
                controller.abort();
            } catch (err) {
                // Ignore errors inside setTimeout during abort
            }
        }, 3000);
        const res = await fetch(`${url}/api/tags`, { method: 'GET', signal: controller.signal });
        return { success: res.ok, isSelfSigned: false, version: '' };
    } catch (e) {
        return { success: false, isSelfSigned: false, version: '' };
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
/**
 * Fetches available models from Ollama.
 * In Desktop mode, this uses the Rust Proxy to bypass CORS.
 * In Community/SaaS mode, it attempts a direct fetch.
 */
export async function fetchOllamaModels(baseUrl: string): Promise<{ models: string[]; isSelfSigned: boolean; version: string }> {
    const url = normalizeOllamaUrl(baseUrl);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ models: string[]; is_self_signed: boolean; version: string }>('get_ollama_models_command', { url });
            return { models: res.models, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            logger.error("Desktop Model Fetch Error:", e);
            return { models: [], isSelfSigned: false, version: '' };
        }
    }

    let timeoutId: any;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
            try {
                controller.abort();
            } catch (err) {
                // Ignore errors inside setTimeout during abort
            }
        }, 3000);
        const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
        if (!res.ok) return { models: [], isSelfSigned: false, version: '' };
        const data = await res.json();
        const models = Array.isArray(data?.models) ? data.models.map((m: any) => m.name) : [];
        return { models, isSelfSigned: false, version: '' };
    } catch (e) {
        logger.error("Community Model Fetch Error:", e);
        return { models: [], isSelfSigned: false, version: '' };
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Resolves a requested model name to the best available match.
 */
export function resolveOllamaModel(requested: string, available: string[]): string {
    if (available.length === 0) return requested;
    
    // 1. Exact Match
    if (available.includes(requested)) return requested;
    
    // 2. Intelligent Prefix Match
    const parts = requested.split(':');
    const namePart = parts[0].toLowerCase();
    
    const candidates = available.filter(m => m.toLowerCase().includes(namePart));
    
    if (candidates.length > 0) {
        const sorted = [...candidates].sort((a, b) => {
            const aStart = a.toLowerCase().startsWith(namePart);
            const bStart = b.toLowerCase().startsWith(namePart);
            if (aStart && !bStart) return -1;
            if (!aStart && bStart) return 1;
            return 0;
        });

        const latest = sorted.find(c => c.endsWith(':latest'));
        if (latest) return latest;
        
        return sorted[0];
    }

    const brand = namePart.split(/[0-9.]/)[0];
    if (brand.length > 2) {
        const brandCandidates = available.filter(m => m.toLowerCase().includes(brand));
        if (brandCandidates.length > 0) return brandCandidates[0];
    }
    
    return requested;
}
