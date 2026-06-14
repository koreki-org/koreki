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
    StructuredPrompt 

} from './prompt-builder';
import { buildGraphGenerationPrompt, buildGraphRefinementPrompt } from '../grading/graph-generator';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction';

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
    const reasoningActions: AIAction[] = ['correction', 'second-opinion', 'generate-graph', 'refine-graph'];
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



    const body: any = {
        model: targetModel,
        messages,
        temperature: targetTemp,
        top_p: targetTopP,
        presence_penalty: presencePenalty,
        max_tokens: options.maxTokens ?? (isThinking ? 32768 : defaultLimit),
        response_format: isJsonFormat ? { type: 'json_object' } : undefined
    };

    if (isThinking) {
        body.enable_thinking = true;
    }

    // Specific Qwen/OpenAI-compat Extra Params
    // [Industrial Alert] 🛡️
    // LiteLLM (Mittwald's proxy) crashes with 'Unknown model name' if we pass enable_thinking, 
    // because it falsely assumes this is an Anthropic-specific request and searches the wrong catalog.
    // We rely on the system prompt or native model behavior for reasoning instead.
    
    let responseContent: string;
    let responseUsage: any = undefined;

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
            
            const data = JSON.parse(res);
            responseContent = data.choices[0].message.content;
            responseUsage = data.usage;
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

        const data = await response.json();
        console.log("[OPENAI-RESPONSE-DATA]", JSON.stringify(data));
        responseContent = data.choices?.[0]?.message?.content;
        responseUsage = data.usage;
    }

    const content = responseContent;

    if (content === null || content === undefined) {
        throw new Error('Die KI hat eine leere Antwort (null) zurückgegeben. Dies kann passieren, wenn das Modell überlastet ist oder die Eingabe blockiert wurde.');
    }

    // 4. Robust JSON Parsing
    if (action !== 'vision' && action !== 'second-opinion') {
        // [Industrial Hardening] 🛡️
        // We try the standard greedy extraction first to maintain backward compatibility.
        const standardJson = (() => {
            const match = content.match(/\{[\s\S]*\}/);
            return match ? match[0] : content;
        })();

        try {
            return {
                ...JSON.parse(standardJson),
                usage: responseUsage
            };
        } catch (e) {
            // Fallback: If standard parsing fails, it might be due to Thinking/Reasoning blocks 
            // containing braces that confuse the greedy regex. We strip them and try again.
            try {
                const cleanContent = content
                    .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '') // Handle unclosed tags
                    .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
                    .replace(/\[thought\][\s\S]*?(\[\/thought\]|$)/gi, '')
                    .trim();
                
                const hardenedMatch = cleanContent.match(/\{[\s\S]*\}/);
                const hardenedJson = hardenedMatch ? hardenedMatch[0] : cleanContent;
                
                return {
                    ...JSON.parse(hardenedJson),
                    usage: responseUsage
                };
            } catch (e2) {
                console.error("JSON Parse Fatal Error. Raw Content:", content);
                throw new Error("KI-Antwort konnte nicht als JSON verarbeitet werden. (Möglicherweise unvollständige Antwort oder Formatierungsfehler im Thinking-Block)");
            }
        }
    }

    return { 
        text: content,
        usage: responseUsage 
    };
}
