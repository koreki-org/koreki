import { 
    MISTRAL_CORE_MODEL, 
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
    buildCalcTraceExtractionPrompt,
    StructuredPrompt 
} from './prompt-builder';
import { VALIDATE_GRAPH_TOOL } from '../grading/graph-generator';
import { isDesktopTarget } from '@/lib/env-context';
import type { GradingMemoryCase, CustomSkillDefinition } from '@/types';
import { PromptLibraryEntry, splitSkillSnippet } from './prompt-library';
import { logger } from '@/lib/logger';
import { AIProviderError } from './provider-error';
import { buildPromptForAction } from './prompt-dispatch';
import { pruefeWerkzeugAufruf } from './tool-validation';

/**
 * Liest den Fehlertext einer abgelehnten Antwort für den Server-Log aus.
 * Darf selbst nicht werfen — sonst verdeckt das Lesen des Fehlers den Fehler.
 */
async function readErrorDetail(response: Response): Promise<string> {
    try {
        // Nicht jede Antwort, die hier ankommt, ist eine vollwertige `Response`:
        // Der Desktop-Proxy und Testdoubles liefern schlankere Objekte. Fehlt der
        // Header oder `text()`, wird der JSON-Pfad versucht statt aufgegeben.
        const contentType = response.headers?.get?.('content-type') || '';
        if (contentType.includes('application/json') || typeof response.text !== 'function') {
            const data = await response.json();
            return data?.error?.message || response.statusText || '';
        }
        return (await response.text()).slice(0, 500) || response.statusText || '';
    } catch {
        return response.statusText || '';
    }
}

import type { AIAction as GemeinsameAIAction } from './prompt-dispatch';

/** Mistral kann zusaetzlich den dedizierten OCR-Endpunkt (/v1/ocr) ansprechen. */
export type AIAction = GemeinsameAIAction | 'ocr';

export interface AIRequestOptions {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    isScan?: boolean;
    customPrompt?: string;
    model?: string;
    enableThinking?: boolean;
    gradingMemory?: GradingMemoryCase[] | null;
    activeSkillIds?: string[];
    customSkills?: Record<string, CustomSkillDefinition | PromptLibraryEntry>;
    responseSchema?: unknown;
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
        // Default model selection per action when no explicit model override is provided
        if (action === 'correction' || action === 'clean-and-analyze' || action === 'clean-and-map') {
            // Mistral Medium (mistral-medium-2604) for corrections & analysis:
            // Math-optimized reasoning at a better cost/performance ratio than Large
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
        promptObj = buildPromptForAction(action, payload, {
            model,
            customPrompt: options.customPrompt,
            gradingMemory: options.gradingMemory,
            activeSkillIds: options.activeSkillIds,
            customSkills: options.customSkills
        });

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
        
        // Pass max tokens for Mistral Large / Medium
        if (model.toLowerCase().includes('medium') || model.toLowerCase().includes('large')) {
            body.max_tokens = options.maxTokens ?? 32768; // Elevate max tokens to allow room for the full reasoning chain
        }
    }

    const isGraphAction = action === 'generate-graph' || action === 'refine-graph';
    if (isGraphAction) {
        body.tools = [
            {
                type: 'function',
                function: VALIDATE_GRAPH_TOOL.function
            }
        ];
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
                throw new AIProviderError('Mistral', response.status, await readErrorDetail(response));
            }
            responseData = await response.json();
        }
        const data = responseData;
        if (!data.choices) {
            logger.error('Mistral response missing choices field', { hasData: !!data });
        }
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
            const urteil = pruefeWerkzeugAufruf(toolCall.function.name, toolCall.function.arguments);

            if (urteil.status === 'akzeptiert') {
                return urteil.artefakt;
            }

            if (urteil.status === 'nachbessern') {
                messages.push(message);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: urteil.rueckmeldung
                });

                body.messages = messages; // Update the payload for the next request
                toolRetryCount++;
                continue;
            }
        }

        responseContent = content;
        break;
    }

    if (toolRetryCount > maxToolRetries) {
        throw new Error('Die KI konnte nach mehreren Versuchen keinen mathematisch validen Graphen generieren. Bitte passe den Aufgabentext an oder nutze ein leistungsstärkeres Modell.');
    }

    let content = responseContent;

    if (content === null || content === undefined || content === '') {
        throw new Error('Die KI hat eine leere Antwort (null) zurückgegeben. Dies kann passieren, wenn das Modell überlastet ist oder die Eingabe blockiert wurde.');
    }

    // 4. Robust JSON Parsing (Standard Pattern)
    if (responseFormat?.type === 'json_object' || responseFormat?.type === 'json_schema') {
        const repairUnescapedBackslashes = (jsonStr: string): string => {
            return jsonStr.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        };

        try {
            // Regex-Protection: Find the first { and the last } to ignore markdown fences
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : content;
            return {
                ...JSON.parse(repairUnescapedBackslashes(cleanJson)),
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
            throw new AIProviderError('Mistral OCR', response.status, await readErrorDetail(response));
        }
        responseData = await response.json();
    }

    const data = responseData;
    return {
        text: (data.pages || []).map((p: any) => p.markdown).join('\n\n'),
        usage: data.usage
    };
}
