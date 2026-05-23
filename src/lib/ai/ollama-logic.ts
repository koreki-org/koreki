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
import { AppSettings } from '../../types';
import { isDesktopTarget } from '@/lib/env-context';

export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'variable-extraction';

/**
 * Specifically optimized for Gemma 4 E4B (multimodal).
 * In Desktop mode, this bypasses CORS by using a Rust-Backend Proxy.
 */
export async function executeOllamaRequest(
    action: AIAction,
    payload: any,
    settings: AppSettings
): Promise<any> {
    const baseUrl = settings.ollamaUrl || 'http://localhost:11434';
    const model = (settings.ollamaModel || 'gemma4:latest').trim();

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
        promptObj = buildGraphGenerationPrompt(payload.taskText, payload.discipline);
    } else if (action === 'variable-extraction') {
        promptObj = buildVariableExtractionPrompt(payload.studentText, payload.variables, payload.extractionInstructions);
    } else {
        throw new Error(`Unsupported action: ${action}`);
    }

    // 2. Execution Path Separation
    if (isDesktopTarget()) {
        try {
            // BRAKE: Dynamic import to prevent SaaS build issues
            const { invoke } = await import('@tauri-apps/api/core');
            // [Industrial Validation] If Mistral works but Qwen fails with connection error,
            // we must unify the request structure. Enabled JSON format for all.
            const targetFormat = (action === 'vision' || action === 'second-opinion') ? undefined : 'json';
            
            let numCtx: number | undefined = 8192;
            const modelLower = model.toLowerCase();

            // Industrial Cluster Check: Adjust context for larger or specialized models
            // [Industrial Hardening] Reduced from 16k to 8k to rule out VRAM resets 
            // or proxy timeouts during large model allocation.
            if (modelLower.includes('mistral') || modelLower.includes('31b') || modelLower.includes('qwen')) {
                numCtx = 8192; 
            }

            // [Industrial Hardening] 🛡️
            // Cloud-variants (using Ollama-compatible gateways) often don't support num_ctx 
            // or crash on value mismatch. We leave it to the backend for '-cloud' models.
            if (modelLower.includes('-cloud')) {
                numCtx = undefined;
            }

            // VRE Parameter Hardening (Greedy mode synchronization)
            // Rule: temp: 0 already implies top_p: 1.0 (greedy). 
            // Most cloud backends reject requests where BOTH are 0.0 or conflicting.
            const targetTemp = promptObj.options?.temperature ?? 0.7;
            const targetTopP = targetTemp === 0 ? 1.0 : (promptObj.options?.topP ?? 1.0);

            const content = await invoke<string>('execute_ollama_command', {
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
                topP: targetTopP
            });


            return processOllamaResponse(content, action, model);

        } catch (error) {
            console.error("Ollama Backend Proxy Error:", error);
            throw new Error(`Ollama Verbindung fehlgeschlagen: ${error}`);
        }
    }


    // --- SaaS FALLBACK (Legacy Fetch, likely blocked by CORS but safe) ---
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: promptObj.system },
                { role: 'user', content: promptObj.user }
            ],
            response_format: (action === 'vision' || action === 'second-opinion') ? undefined : { type: 'json_object' },
            options: { 
                num_ctx: 8192,
                temperature: promptObj.options?.temperature ?? 0.7,
                top_p: promptObj.options?.topP ?? 1.0
            } // Forward to Ollama options if supported by endpoint variant
        })
    });

    if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
    const data = await response.json();
    return processOllamaResponse(data.choices[0].message.content, action, model);

}

function processOllamaResponse(content: string, action: AIAction, modelName: string) {
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

    // 2. Greedy Extraction (First { to Last })
    const standardJson = (() => {
        const match = rawJson.match(/\{[\s\S]*\}/);
        return match ? match[0] : rawJson;
    })();

    try {
        return JSON.parse(standardJson);
    } catch (e) {
        // Fallback for Thinking/Reasoning blocks or corrupted prefixes
        try {
            const cleanContent = rawJson
                .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '') 
                .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
                .replace(/\[thought\][\s\S]*?(\[\/thought\]|$)/gi, '')
                .trim();

            const hardenedMatch = cleanContent.match(/\{[\s\S]*\}/);
            const hardenedJson = hardenedMatch ? hardenedMatch[0] : cleanContent;
            
            // Industrial Recovery: Check for trailing commas in arrays/objects (common LLM failure)
            const partiallyRepaired = hardenedJson
                .replace(/,\s*([\]\}])/g, '$1') // Removes trailing commas before ] or }
                .trim();

            return JSON.parse(partiallyRepaired);
        } catch (e2) {
            // Fatal Error Diagnostics
            const start = cleaned.slice(0, 100); // Increased visibility
            const end = cleaned.slice(-100);
            const errorMsg = e2 instanceof Error ? e2.message : String(e2);
            
            throw new Error(`Ollama JSON-Parse fehlgeschlagen (${errorMsg}). \n\nAnfang: [${start}]\n\nEnde: [${end}]\n\nLänge: ${cleaned.length}`);
        }
    }
}

/**
 * Industrial Ping for Ollama Discovery
 */
export async function pingOllama(baseUrl: string): Promise<{ success: boolean; isSelfSigned: boolean; version: string }> {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ success: boolean; is_self_signed: boolean; version: string }>('ping_ollama_command', { url: baseUrl });
            return { success: res.success, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            return { success: false, isSelfSigned: false, version: '' };
        }
    }

    try {
        const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
        return { success: res.ok, isSelfSigned: false, version: '' };
    } catch (e) {
        return { success: false, isSelfSigned: false, version: '' };
    }
}
/**
 * Fetches available models from Ollama.
 * In Desktop mode, this uses the Rust Proxy to bypass CORS.
 * In Community/SaaS mode, it attempts a direct fetch.
 */
export async function fetchOllamaModels(baseUrl: string): Promise<{ models: string[]; isSelfSigned: boolean; version: string }> {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ models: string[]; is_self_signed: boolean; version: string }>('get_ollama_models_command', { url: baseUrl });
            return { models: res.models, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            console.error("Desktop Model Fetch Error:", e);
            return { models: [], isSelfSigned: false, version: '' };
        }
    }

    try {
        const res = await fetch(`${baseUrl}/api/tags`);
        if (!res.ok) return { models: [], isSelfSigned: false, version: '' };
        const data = await res.json();
        const models = data.models.map((m: any) => m.name);
        return { models, isSelfSigned: false, version: '' };
    } catch (e) {
        console.error("Community Model Fetch Error:", e);
        return { models: [], isSelfSigned: false, version: '' };
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
