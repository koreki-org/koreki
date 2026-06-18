import { 
    MISTRAL_CORE_MODEL, 
    MISTRAL_UTILS_MODEL, 
    MISTRAL_CHATS_MODEL, 
    MISTRAL_OCR_MODEL,
    MISTRAL_MEDIUM_MODEL,
    fetchWithRetry 
} from './constants';
import { 
    buildCorrectionPrompt, 
    buildCleanAndAnalyzePrompt, 
    buildCleanAndMapPrompt, 
    buildVisionPrompt,
    buildStudentSimulatorPrompt,
    buildAnonymizePrompt,
    buildSecondOpinionPrompt,
    buildVariableExtractionPrompt,
    StructuredPrompt 

} from './prompt-builder';
import { buildGraphGenerationPrompt, buildGraphRefinementPrompt, VALIDATE_GRAPH_TOOL, parseGeneratedGraph, validateGraphDeterminism } from '../grading/graph-generator';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'ocr' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction';

export interface AIRequestOptions {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    isScan?: boolean;
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
 * The Isomorphic Mistral Bridge
 * 
 * This is the SINGLE SOURCE OF TRUTH for all AI interactions in Koreki.
 * It is designed to run both in the Browser (PURE mode) and on the Server (STANDARD mode).
 */
export async function executeMistralRequest(
    action: AIAction,
    payload: any,
    apiKey: string,
    options: AIRequestOptions = {}
): Promise<any> {
    // 1. Model Mapping (Industrial Consensus)
    let model = options.model || MISTRAL_CORE_MODEL; // Respect model override
    
    // INDUSTRIAL SAFETY: Override for specific capabilities
    // The Provider must be immune to wrong models passed from UI state for specialized tasks.
    if (action === 'vision') {
        model = MISTRAL_CHATS_MODEL; // Force Vision-capable model (Pixtral / Large)
    } else if (action === 'ocr') {
        model = MISTRAL_OCR_MODEL; // Force specialized OCR model
    } else if (!options.model) {
        // Fallback for text actions if no model is provided
        if (action === 'clean-and-analyze' || action === 'clean-and-map') {
            // Default to Mistral Medium (mistral-medium-2604) for optimal precision/verbatim integrity without being oversized
            model = MISTRAL_MEDIUM_MODEL; 
        } else if (action === 'second-opinion') {
            model = MISTRAL_CORE_MODEL; // mistral-large-latest (Mistral Large) as preferred by the user
        }
    }

    // 2. Prompt Building & Parameter Extraction
    let messages: any[] = [];
    let responseFormat: any = undefined; // Default to raw text for vision/ocr
    let promptObj: StructuredPrompt;

    if (action === 'ocr') {
        // OCR uses the /v1/ocr endpoint, not chat/completions
        return await handleOCRRequest(payload, apiKey, options.isScan, options.signal);
    }

    // Industrial Single-Pass: Build prompt once and extract options
    if (action === 'vision') {
        promptObj = buildVisionPrompt();
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
            promptObj = buildCorrectionPrompt(payload.modelSolution, payload.studentText, payload.tasksLayout, options.customPrompt, model, options.gradingMemory, options.activeSkillIds, options.customSkills);
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
        } else {
            throw new Error(`Unsupported text action: ${action}`);
        }
        
        messages = [
            { role: 'system', content: promptObj.system },
            { role: 'user', content: promptObj.user }
        ];
        if (action !== 'second-opinion') {
            if (options.responseSchema) {
                responseFormat = {
                    type: "json_schema",
                    json_schema: {
                        name: "GradingGraph",
                        strict: true,
                        schema: options.responseSchema
                    }
                };
            } else {
                responseFormat = { type: 'json_object' };
            }
        }
    }

    // 3. API Execution (VRE Parameter Hardening)
    // Rule: temp: 0 already implies top_p: 1.0 (greedy). 
    // Mistral rejects requests where both are manipulated in a way that conflicts.
    const isSystemAction = ['clean-and-map', 'clean-and-analyze'].includes(action);
    const targetTemp = isSystemAction 
        ? (promptObj.options?.temperature ?? 0.0) 
        : (options.temperature ?? promptObj.options?.temperature ?? 0);
    const targetTopP = isSystemAction 
        ? (promptObj.options?.topP ?? 0.1) 
        : (options.topP ?? promptObj.options?.topP ?? 1.0);

    const url = 'https://api.mistral.ai/v1/chat/completions';
    const body: any = {
        model,
        messages,
        response_format: responseFormat,
        temperature: targetTemp,
        top_p: targetTemp === 0 ? 1.0 : targetTopP, // Safety: use 1.0 if greedy to avoid 422
        max_tokens: options.maxTokens ?? 4000
    };

    // Elevate max tokens if thinking is enabled to allow room for the reasoning chain
    const isThinking = options.enableThinking ?? false;
    if (isThinking) {
        body.max_tokens = options.maxTokens ?? 8192; // Max output tokens supported by modern Mistral models
        
        // Pass adjustable reasoning parameters for Mistral Medium 3.5 (mistral-medium-2604)
        if (model.toLowerCase().includes('medium')) {
            body.reasoning_effort = 'high';
            body.max_tokens = options.maxTokens ?? 32768; // Elevate max tokens to allow room for the full reasoning chain
        }
    }

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
        let responseData: any;

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
                responseData = JSON.parse(res);
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
                let errorMessage = `Mistral API Error: ${response.status}`;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error?.message || errorMessage;
                    } else {
                        const errorText = await response.text();
                        if (errorText.toLowerCase().includes('bad gateway')) {
                            errorMessage = "Der KI-Server ist aktuell nicht erreichbar (Bad Gateway). Bitte versuchen Sie es in Kürze erneut.";
                        } else if (response.status === 504) {
                            errorMessage = "Zeitüberschreitung bei der KI-Anfrage (Gateway Timeout). Die Musterlösung ist eventuell zu komplex.";
                        } else {
                            errorMessage = `Server-Fehler (${response.status}). Bitte versuchen Sie es erneut.`;
                        }
                    }
                } catch (e) {
                    errorMessage = `Kritischer API-Fehler (${response.status}).`;
                }
                throw new Error(errorMessage);
            }
            responseData = await response.json();
        }

        const data = responseData;
        const message = data.choices[0].message;
        responseUsage = data.usage;

        // Handle structured content block arrays returned by Mistral's reasoning models
        let content = message.content;
        if (Array.isArray(content)) {
            const textBlock = content.find((block: any) => block.type === 'text');
            content = textBlock ? textBlock.text : '';
        }

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

                body.messages = messages;
                toolRetryCount++;
                continue;
            }
        }

        responseContent = content;
        break;
    }

    let content = responseContent;

    if (content === null || content === undefined) {
        throw new Error('Die KI hat eine leere Antwort (null) zurückgegeben. Dies kann passieren, wenn das Modell überlastet ist oder die Eingabe blockiert wurde.');
    }

    // 4. Robust JSON Parsing (Standard Pattern)
    if (responseFormat?.type === 'json_object') {
        try {
            // Regex-Protection: Find the first { and the last } to ignore markdown fences
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : content;
            return {
                ...JSON.parse(cleanJson),
                usage: responseUsage // Pass usage data for billing
            };
        } catch (e) {
            throw new Error("KI-Antwort konnte nicht als JSON verarbeitet werden.");
        }
    }

    return { 
        text: content,
        usage: responseUsage 
    };
}

/**
 * Specialized handler for Mistral OCR Endpoint
 */
async function handleOCRRequest(payload: any, apiKey: string, isScan: boolean = false, signal?: AbortSignal): Promise<any> {
    const url = 'https://api.mistral.ai/v1/ocr';
    const body = {
        model: MISTRAL_OCR_MODEL,
        document: {
            type: "document_url",
            document_url: `data:${payload.mimeType};base64,${payload.buffer}`
        }
    };

    let responseData: any;

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
            if (signal) {
                if (signal.aborted) {
                    throw new DOMException('The user aborted a request.', 'AbortError');
                }
                res = await Promise.race([
                    invokePromise,
                    new Promise<string>((_, reject) => {
                        signal.addEventListener('abort', () => {
                            reject(new DOMException('The user aborted a request.', 'AbortError'));
                        });
                    })
                ]);
            } else {
                res = await invokePromise;
            }
            responseData = JSON.parse(res);
        } catch (e) {
            throw new Error(`Desktop OCR Proxy Fehler: ${e}`);
        }
    } else {
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            let errorMessage = `Mistral OCR API Error: ${response.status}`;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const err = await response.json();
                    errorMessage = err.error?.message || errorMessage;
                } else {
                    const text = await response.text();
                    if (text.toLowerCase().includes('bad gateway')) {
                        errorMessage = "Der OCR-Server ist aktuell nicht erreichbar (Bad Gateway).";
                    } else {
                        errorMessage = `OCR-Server-Fehler (${response.status}).`;
                    }
                }
            } catch (e) {
                errorMessage = `Kritischer OCR-Fehler (${response.status}).`;
            }
            throw new Error(errorMessage);
        }
        responseData = await response.json();
    }

    const data = responseData;
    return {
        text: (data.pages || []).map((p: any) => p.markdown).join('\n\n'),
        usage: data.usage
    };
}
