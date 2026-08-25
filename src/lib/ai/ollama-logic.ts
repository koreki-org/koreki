import { logger } from '@/lib/logger';
// Die einzelnen Prompt-Bauer stehen hier nicht mehr: die Zuordnung Aktion ->
// Instruktion macht `buildPromptForAction` fuer alle drei Anbieter gemeinsam.
import { buildVisionPrompt, StructuredPrompt } from './prompt-builder';
import { VALIDATE_GRAPH_TOOL } from '../grading/graph-generator';
import { AppSettings } from '../../types';
import { isDesktopTarget, hasTauriRuntime } from '@/lib/env-context';
import { AIProviderError } from './provider-error';
import { parseLlmJson, LlmJsonParseError } from './llm-json';
import { buildPromptForAction, PromptPayload } from './prompt-dispatch';
import { berechneSamplingParameter } from './ollama-sampling';
import { leseOllamaStream } from './ollama-stream';
import { nutztFestenStartwert, SAMPLING_SEED } from './temperature-guidance';
import { pruefeWerkzeugAufruf, MAX_TOOL_RETRIES } from './tool-validation';

import type { AIAction } from './prompt-dispatch';
export type { AIAction };

/**
 * Eine Nachricht im Ollama-Chatformat.
 *
 * `tool` erscheint nur im Nachbesserungs-Umlauf beim Erzeugen eines Graphen:
 * dort geht das Pruefergebnis als eigene Nachricht zurueck ans Modell.
 */
interface OllamaNachricht {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    /** Base64-Seitenbilder, nur bei der Bilderkennung. */
    images?: string[];
    /** Entwuerfe, die das Modell zur Pruefung vorgelegt hat. */
    tool_calls?: OllamaWerkzeugAufruf[];
    /** Name des Werkzeugs, auf das sich eine `tool`-Nachricht bezieht. */
    name?: string;
}

/** Werkzeugdefinition, wie Ollama sie im Feld `tools` erwartet. */
interface OllamaWerkzeug {
    type: 'function';
    function: { name: string; description?: string; parameters?: unknown };
}

/** Werkzeugaufruf, wie das Modell ihn zurueckliefert. */
interface OllamaWerkzeugAufruf {
    function: { name: string; arguments?: unknown };
}

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

/**
 * Specifically optimized for Gemma 4 E4B (multimodal).
 * In Desktop mode, this bypasses CORS by using a Rust-Backend Proxy.
 */
export async function executeOllamaRequest(
    action: AIAction,
    payload: PromptPayload,
    settings: AppSettings,
    signal?: AbortSignal,
    options?: { responseSchema?: Record<string, unknown> }
// ARCH: any required because die Rueckgabe je Aktion verschieden ist
// (GradingGraph, TargetGoal, geparstes JSON oder { text }). Ein Union
// zwaenge jeden Aufrufer in eine Fallunterscheidung, die er nicht braucht —
// er weiss, welche Aktion er geschickt hat.
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

    // 1. Prompt Building
    let promptObj: StructuredPrompt;
    let images: string[] | undefined = undefined;

    if (action === 'vision') {
        promptObj = buildVisionPrompt();
        images = payload.buffer ? [payload.buffer] : undefined; // Base64 buffer
    } else {
        // Ollama holt customPrompt und Skills aus den Einstellungen, den
        // Erfahrungsschatz dagegen aus dem Payload — anders als Mistral und
        // OpenAI, die beides in `options` bekommen. Die Zuordnung Aktion ->
        // Instruktion ist danach fuer alle drei dieselbe.
        promptObj = buildPromptForAction(action, payload, {
            model,
            customPrompt: settings.correctionPrompt,
            gradingMemory: payload.gradingMemory,
            activeSkillIds: settings.activeSkillIds,
            customSkills: settings.customSkills
        });
    }

    // 1.5. Sampling-Parameter — die Rechnung dahinter steht in ./ollama-sampling
    const { temperature: targetTemp, topP: targetTopP, numCtx, maxTokens: finalMaxTokens, think: thinkValue, art } =
        berechneSamplingParameter({
            action,
            model,
            settings,
            promptOptions: promptObj.options,
            promptCharCount: promptObj.user.length + (promptObj.system?.length || 0),
            imageCount: images?.length || 0,
            hasResponseSchema: !!options?.responseSchema
        });
    const isSystemAction = art.isSystemAction;

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

            return processOllamaResponse(content, action, model);

        } catch (error) {
            logger.error("Ollama Backend Proxy Error:", error);
            throw new Error(`Ollama Verbindung fehlgeschlagen: ${error}`);
        }
    }    // --- Native Ollama API Fetch ---
    const messages: OllamaNachricht[] = [];
    if (promptObj.system) {
        messages.push({ role: 'system', content: promptObj.system });
    }
    if (isVision) {
        messages.push({
            role: 'user',
            content: promptObj.user,
            images: payload.buffer ? [payload.buffer] : undefined
        });
    } else {
        messages.push({
            role: 'user',
            content: promptObj.user
        });
    }

    const isGraphAction = action === 'generate-graph' || action === 'refine-graph';
    let tools: OllamaWerkzeug[] | undefined = undefined;
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

    while (toolRetryCount <= MAX_TOOL_RETRIES) {
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
                    presence_penalty: settings.presencePenalty ?? 0.0,
                    // Gleiche Eingabe, gleiche Ausgabe — siehe SAMPLING_SEED.
                    ...(nutztFestenStartwert(action) ? { seed: SAMPLING_SEED } : {})
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new AIProviderError('Ollama', response.status, errText || response.statusText);
        }

        fullContent = '';
        let toolCalls: OllamaWerkzeugAufruf[] = [];

        if (isStreaming) {
            fullContent = await leseOllamaStream(response.body);
        } else {
            const data = await response.json();
            fullContent = data.message?.content || '';
            toolCalls = data.message?.tool_calls || [];
        }

        // Werkzeug-Umlauf. Die Pruefung selbst steht in ./tool-validation und
        // ist fuer alle drei Anbieter dieselbe — Ollama hatte sie bis
        // 17.08.2026 als dritte eigene Fassung ausgeschrieben.
        if (toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const args = toolCall.function.arguments;
            const urteil = pruefeWerkzeugAufruf(
                toolCall.function.name,
                typeof args === 'string' ? args : JSON.stringify(args)
            );

            if (urteil.status === 'akzeptiert') {
                return urteil.artefakt;
            }

            if (urteil.status === 'nachbessern') {
                messages.push({ role: 'assistant', content: fullContent, tool_calls: toolCalls });
                messages.push({ role: 'tool', name: toolCall.function.name, content: urteil.rueckmeldung });
                toolRetryCount++;
                continue;
            }
        }


        // If no tool calls, exit loop
        break;
    }

    return processOllamaResponse(fullContent, action, model);

}

/**
 * Prueft die Struktur, auf die sich der weitere Ablauf verlaesst.
 *
 * Nur fuer die beiden Aufbereitungs-Aktionen: dort erzeugt das Modell die
 * Aufgabenliste, und ein fehlender Name macht die spaetere Zuordnung
 * unmoeglich. Die Meldungen nennen den Index, damit im Log erkennbar ist,
 * welche Aufgabe gemeint ist.
 */
function validateOllamaResponse(parsed: unknown, action: AIAction): unknown {
    if (action !== 'clean-and-analyze' && action !== 'clean-and-map') return parsed;
    if (!parsed) return parsed;

    const tasks = (parsed as { tasks?: unknown }).tasks;
    if (!tasks || !Array.isArray(tasks)) {
        throw new Error(`Ungültige KI-Struktur: Das "tasks"-Array fehlt oder ist unvollständig.`);
    }

    tasks.forEach((task: unknown, i: number) => {
        if (!task || typeof task !== 'object') {
            throw new Error(`Ungültige KI-Struktur: Aufgabe an Index ${i} ist kein gültiges Objekt.`);
        }
        const { name, maxPoints } = task as { name?: unknown; maxPoints?: unknown };
        if (!name || String(name).trim() === '') {
            throw new Error(`Ungültige KI-Struktur: Aufgabe an Index ${i} besitzt keinen gültigen Namen (Punkte: ${maxPoints ?? 'unbekannt'}).`);
        }
    });

    return parsed;
}

function processOllamaResponse(content: string | null | undefined, action: AIAction, modelName: string) {
    if (content === null || content === undefined) {
        throw new Error(`Ollama hat eine leere Antwort geliefert. \nGrund: Der Backend-Proxy hat keine Daten vom Modell empfangen.`);
    }
    if (action === 'vision' || action === 'second-opinion') return { text: content };

    const cleaned = content.trim();

    // Industrial Diagnostics: Handle empty responses caused by silent backend failures
    if (!cleaned) {
        throw new Error(`Ollama hat eine leere Antwort geliefert. \nGrund: Der Backend-Proxy hat keine Daten vom Modell empfangen. \n\nCheckliste:\n1. Ist das Modell "${modelName}" auf dem Server geladen?\n2. Ist der Server ausgebremst (GPU-VRAM voll)?\n3. Ist die Musterlösung evtl. zu groß für das Kontextfenster?`);
    }

    try {
        return validateOllamaResponse(parseLlmJson(cleaned), action);
    } catch (e) {
        // Nur den Parse-Fehler mit dem Anbieternamen versehen. Die
        // Struktur-Pruefung darunter wirft eigene, praezisere Meldungen —
        // die duerfen nicht ueberschrieben werden.
        if (e instanceof LlmJsonParseError) {
            throw new Error(`Ollama ${e.message}`);
        }
        throw e;
    }
}

/**
 * Industrial Ping for Ollama Discovery
 */
export async function pingOllama(baseUrl: string): Promise<{ success: boolean; isSelfSigned: boolean; version: string }> {
    const url = normalizeOllamaUrl(baseUrl);
    if (hasTauriRuntime()) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ success: boolean; is_self_signed: boolean; version: string }>('ping_ollama_command', { url });
            return { success: res.success, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            return { success: false, isSelfSigned: false, version: '' };
        }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
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
    if (hasTauriRuntime()) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ models: string[]; is_self_signed: boolean; version: string }>('get_ollama_models_command', { url });
            return { models: res.models, isSelfSigned: res.is_self_signed, version: res.version };
        } catch (e) {
            logger.error("Desktop Model Fetch Error:", e);
            return { models: [], isSelfSigned: false, version: '' };
        }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
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
        const models = Array.isArray(data?.models)
            ? (data.models as { name?: string }[]).map(m => m.name).filter((n): n is string => !!n)
            : [];
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
