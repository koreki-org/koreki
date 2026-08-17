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
import { VALIDATE_GRAPH_TOOL } from '../grading/graph-generator';
import { logger } from '@/lib/logger';
import { parseLlmJson } from './llm-json';
import { isDesktopTarget } from '@/lib/env-context';
import { AIProviderError } from './provider-error';
import { buildPromptForAction, PromptPayload } from './prompt-dispatch';
import { alsText } from './chat-types';
import type { ChatNachricht, ChatAnfrage, ChatAntwort, TokenVerbrauch } from './chat-types';
import { pruefeWerkzeugAufruf } from './tool-validation';
import { ueberDesktopProxy } from './desktop-proxy';
import type { GradingMemoryCase, CustomSkillDefinition } from '@/types';
import type { PromptLibraryEntry } from './prompt-library';

import type { AIAction } from './prompt-dispatch';
export type { AIAction };

export interface OpenAIRequestOptions {
    temperature?: number;
    topP?: number;
    presencePenalty?: number;
    maxTokens?: number;
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
 * Industrial OpenAI-Compatible Bridge
 * 🏮🏛️🛡️
 * 
 * Supports any provider using the /v1/chat/completions standard (Mittwald, DeepInfra, Together, etc.).
 * Specifically optimized for Qwen 3.6 with "Thinking Mode" support.
 */
export async function executeOpenAIRequest(
    action: AIAction,
    payload: PromptPayload,
    baseUrl: string,
    apiKey: string,
    options: OpenAIRequestOptions = {}
// ARCH: any required because die Rueckgabe je Aktion verschieden ist
// (GradingGraph, TargetGoal, geparstes JSON oder { text }). Ein Union
// zwaenge jeden Aufrufer in eine Fallunterscheidung, die er nicht braucht.
): Promise<any> {
    const targetModel = options.model || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
    
    // 1. Prompt Building
    let promptObj: StructuredPrompt;
    let messages: ChatNachricht[] = [];

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
            model: targetModel,
            customPrompt: options.customPrompt,
            gradingMemory: options.gradingMemory,
            activeSkillIds: options.activeSkillIds,
            customSkills: options.customSkills
        });

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

    const body: ChatAnfrage = {
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
        const schemaName = action === 'generate-calc-trace' ? 'CalcTrace' : 'GradingGraph';
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
    let responseUsage: TokenVerbrauch | undefined = undefined;
    let toolRetryCount = 0;
    const maxToolRetries = 3;

    while (toolRetryCount <= maxToolRetries) {
        let currentData: ChatAntwort;

        if (isDesktopTarget()) {
            currentData = await ueberDesktopProxy({ url, apiKey, body, signal: options.signal, kontext: 'Desktop Proxy Fehler' });
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
                throw new AIProviderError(
                    'OpenAI-kompatibler Anbieter',
                    response.status,
                    errorData.error?.message || response.statusText
                );
            }

            currentData = await response.json();
        }

        const message = currentData.choices?.[0]?.message;
        responseUsage = currentData.usage;

        // Tool Calling Logic
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

        // No tool calls or unknown tool, we have our final content
        responseContent = alsText(message?.content ?? null);
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
        try {
            return {
                ...parseLlmJson<Record<string, unknown>>(content),
                usage: responseUsage
            };
        } catch (e) {
            logger.error("JSON Parse Fatal Error: AI response could not be parsed as JSON", {
                contentLength: content?.length || 0
            });
            throw new Error("KI-Antwort konnte nicht als JSON verarbeitet werden. (Möglicherweise unvollständige Antwort oder Formatierungsfehler im Thinking-Block)");
        }
    }

    return { 
        text: content,
        usage: responseUsage 
    };
}
