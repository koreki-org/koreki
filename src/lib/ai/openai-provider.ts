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
import { buildGraphGenerationPrompt } from '../grading/graph-generator';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'variable-extraction';

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
            promptObj = buildGraphGenerationPrompt(payload.taskText, payload.discipline);
        } else if (action === 'variable-extraction') {
            promptObj = buildVariableExtractionPrompt(payload.studentText, payload.variables, payload.extractionInstructions);
        } else {
            throw new Error(`Unsupported action: ${action}`);
        }
        
        messages = [
            { role: 'system', content: promptObj.system },
            { role: 'user', content: promptObj.user }
        ];
    }

    // 2. Parameter Hardening (Qwen 3.6 Recommendations)
    const isThinking = options.enableThinking ?? true;
    
    // Industrial Default Mapping:
    // If Thinking: temp 1.0 (general) or 0.6 (coding)
    // If Non-Thinking: temp 0.2 (Koreki default precision)
    let targetTemp = options.temperature ?? (isThinking ? 1.0 : 0.2);
    if (action === 'correction' && options.temperature === undefined) {
        targetTemp = isThinking ? 0.6 : 0.2;
    }

    const targetTopP = options.topP ?? (isThinking ? 0.95 : 0.8);
    const presencePenalty = options.presencePenalty ?? (isThinking ? 1.5 : 1.5); // Both recommend 1.5 for general tasks

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
        presence_penalty: options.presencePenalty ?? (structuralActions.includes(action) ? 0.0 : presencePenalty),
        max_tokens: options.maxTokens ?? (isThinking ? 32768 : defaultLimit),
        response_format: isJsonFormat ? { type: 'json_object' } : undefined
    };

    // Specific Qwen/OpenAI-compat Extra Params
    // [Industrial Alert] 🛡️
    // Thinking mode is often ON by default at Mittwald; we must explicitly send false to disable it.
    body.enable_thinking = isThinking;

    let responseContent: string;
    let responseUsage: any = undefined;

    if (isDesktopTarget()) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<string>('execute_ai_proxy_command', {
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });
            
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
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`KI-Provider Fehler (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        responseContent = data.choices[0].message.content;
        responseUsage = data.usage;
    }

    const content = responseContent;

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
