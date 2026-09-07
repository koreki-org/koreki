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
import { FREETEXT_TEMPERATURE_MINIMUM, nutztFestenStartwert, SAMPLING_SEED, TEMPERATURE_MINIMUM, TOP_P_DEFAULT } from './temperature-guidance';
import { isDesktopTarget } from '@/lib/env-context';
import { AIProviderError } from './provider-error';
import { buildPromptForAction, PromptPayload } from './prompt-dispatch';
import { alsText } from './chat-types';
import type { ChatNachricht, ChatAnfrage, ChatAntwort, TokenVerbrauch } from './chat-types';
import { pruefeWerkzeugAufruf } from './tool-validation';
import { denktBeiAktion } from './denkschritt';

/**
 * Leer ist auch der leere String.
 *
 * Die Pruefung hier fragte bis zum 07.09.2026 nur auf `null`/`undefined` — eine
 * Antwort mit `""` lief weiter und scheiterte erst beim JSON-Lesen, mit einer
 * Meldung ueber Formatierung statt ueber die leere Antwort. Der Mistral-Pfad
 * pruefte an derselben Stelle laengst auf alle drei.
 */
const istLeer = (wert: string | null | undefined): boolean =>
    wert === null || wert === undefined || wert === '';
import { ueberDesktopProxy } from './desktop-proxy';
import type { GradingMemoryCase, CustomSkillDefinition } from '@/types';
import type { PromptLibraryEntry } from './prompt-library';

import type { AIAction } from './prompt-dispatch';
import { DEFAULT_OPENAI_COMPATIBLE_MODEL } from './provider-connection';
export type { AIAction };

export interface OpenAIRequestOptions {
    temperature?: number;
    topP?: number;
    presencePenalty?: number;
    maxTokens?: number;
    customPrompt?: string;
    model?: string;
    enableThinking?: boolean;
    /** Denktiefe fuer diesen Aufruf; ohne Angabe entscheidet das Modell. */
    reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
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
    const targetModel = options.model || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_COMPATIBLE_MODEL;
    
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
    //
    // Die Entscheidung, ob laut gedacht wird, faellt in `denkschritt.ts` — dieselbe
    // Leiter wie beim Ollama-Weg. Hier stand bis zum 07.09.2026 eine ZWEITE, andere
    // Fassung davon: Sie zaehlte `vision`, `anonymize` und die Struktur-Aktionen
    // richtig auf, wurde aber nirgends gesendet und war damit wirkungslos. Das Modell
    // entschied selbst, und Qwen 3.6 denkt von sich aus — auch beim Abschreiben einer
    // Seite, wo es die gesamte Antwortlaenge aufbraucht und leeren Text liefert.
    const isThinking = denktBeiAktion(action, options.enableThinking);
    
    // System-level cleaning/mapping actions where we want to enforce prompt-defined temperature (0.0) 
    // to guarantee verbatim/structural integrity and prevent any user-configured correction temperature from inducing hallucinations.
    const isSystemAction = ['clean-and-map', 'clean-and-analyze'].includes(action);

    // Respect the prompt's defined temperature/topP if not overridden by explicit options
    let targetTemp = isSystemAction 
        ? (promptObj.options?.temperature ?? 0.0)
        : (options.temperature ?? promptObj.options?.temperature ?? (isThinking ? 1.0 : TEMPERATURE_MINIMUM));
        
    // Untergrenze fuer Qwen bei Ermessens- und Korrekturaufgaben: Schutz vor
    // Wiederholungsschleifen. Extraktions-Aufgaben (calc-trace-extraction,
    // variable-extraction) duerfen weiterhin auf 0.0 laufen — sie schreiben ab,
    // dort ist jede Abweichung ein Fehler.
    //
    // Lag bis zum 24.08.2026 bei 0.2. Die Zweitmeinung behaelt diesen Wert, weil sie
    // als einzige dieser Aktionen in Prosa antwortet und kein Schema die Ausgabe zum
    // Ende zwingt; alle uebrigen liefern JSON.
    const isQwen = targetModel.toLowerCase().includes('qwen');
    const isReasoningAction = ['correction', 'second-opinion', 'generate-graph', 'refine-graph', 'generate-calc-trace'].includes(action);
    if (isQwen && isReasoningAction) {
        const untergrenze = action === 'second-opinion' ? FREETEXT_TEMPERATURE_MINIMUM : TEMPERATURE_MINIMUM;
        if (targetTemp < untergrenze) targetTemp = untergrenze;
    }

    const targetTopP = isSystemAction
        ? (promptObj.options?.topP ?? 0.1)
        : (options.topP ?? promptObj.options?.topP ?? TOP_P_DEFAULT);
        
    // presence_penalty: Always respect user-configured value from AI profile.
    // Default 0.0 matches the UI default in useAiProfiles.ts. The old hardcoded 1.5 caused OCR
    // to skip repeated tokens (e.g. circled task numbers ②) and was never aligned with the UI.
    const presencePenalty = options.presencePenalty ?? 0.0;

    /**
     * Wie tief das Modell vor der Antwort nachdenkt.
     *
     * GEMESSEN AM 07.09.2026. `reasoning_effort` ist der einzige Schalter, der den
     * Denkschritt auf diesem Weg beeinflusst — `chat_template_kwargs` und
     * `enable_thinking` werden angenommen und ignoriert. Der Kommentar weiter unten,
     * der Vermittler stuerze bei diesen Feldern ab, war ueberholt.
     *
     * Bewusst EINE Einstellung fuer alle Aufrufe und kein Rueckfall im Fehlerfall:
     * Wuerde eine Aufgabe nach einem Aussetzer ohne Denkschritt bewertet und die
     * naechste mit, entschiede der Zufall ueber die Konfiguration, unter der eine
     * Schuelerin beurteilt wird. Ungleiche Bewertung ist teurer als ein sichtbarer
     * Fehlschlag.
     *
     * Ohne Angabe entscheidet das Modell selbst — der bisherige Zustand.
     */
    const denktiefe = options.reasoningEffort;

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
        max_tokens: calculatedMaxTokens,
        ...(denktiefe ? { reasoning_effort: denktiefe } : {})
    };

    // Gleiche Eingabe, gleiche Ausgabe — siehe SAMPLING_SEED.
    if (nutztFestenStartwert(action)) {
        body.seed = SAMPLING_SEED;
    }
    
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

    /**
     * Der Denkschritt — und warum er VERSCHACHTELT stehen muss.
     *
     * Hier stand die Warnung, der Vermittler (LiteLLM bei Mittwald) stuerze bei
     * `chat_template_kwargs` ab, weshalb man sich auf das Eigenverhalten des Modells
     * verlasse. Am 07.09.2026 gegen den Endpunkt nachgemessen: Er stuerzt nicht. Er
     * nimmt das Feld an und befolgt es.
     *
     * Was WIRKLICH gilt, gemessen mit je drei Laeufen und eindeutigen Prompts:
     *
     * | Form                                          | Qwen 3.6 | Qwen 3.8 |
     * |-----------------------------------------------|----------|----------|
     * | `enable_thinking: false` auf oberster Ebene   | ignoriert | ignoriert |
     * | `chat_template_kwargs.enable_thinking: false` | **wirkt** | **wirkt** |
     * | `reasoning_effort: 'low'`                     | wirkungslos | wirkt |
     *
     * Die oberste Ebene wird STILL verworfen — kein Fehler, keine Warnung, das Denken
     * laeuft weiter. Genau davor warnt auch Mittwalds eigene Modell-Dokumentation.
     * Deshalb steht das Feld hier verschachtelt, und deshalb ist `reasoning_effort`
     * kein Ersatz dafuer: Bei Qwen 3.6 — dem Modell hinter "Hohe Genauigkeit" im
     * SaaS — aendern die Denktiefen-Stufen nachweislich nichts.
     *
     * Damit unterscheidet sich diese Familie von Ollama nur im FELD (`think` dort,
     * `chat_template_kwargs.enable_thinking` hier), nicht mehr in der Entscheidung.
     */
    body.chat_template_kwargs = { enable_thinking: isThinking };

    
    const isGraphAction = action === 'generate-graph' || action === 'refine-graph';
    if (isGraphAction) {
        body.tools = [VALIDATE_GRAPH_TOOL];
        body.tool_choice = "auto";
    }

    let responseContent: string | null = null;
    let responseUsage: TokenVerbrauch | undefined = undefined;
    let toolRetryCount = 0;
    const maxToolRetries = 3;

    /**
     * Eine 200er-Antwort ohne Inhalt ist kein HTTP-Fehler — `fetchWithRetry` sieht sie
     * nicht. Sie wird deshalb hier abgefangen und BEWUSST NICHT wiederholt.
     *
     * ANLASS (07.09.2026). `Qwen3.8-27B-NVFP4` erzeugte fuer einen Rubrik-Grenzfall
     * 13631 Zeichen Denktext, waegte darin endlos ab und schloss ohne Antwort ab —
     * `finish_reason: stop`, `content` leer. Kein Abbruch, kein Filter: Das Modell
     * zerdenkt sich.
     *
     * Ein Wiederholungsversuch stand hier kurzzeitig und ist auf Einspruch des
     * Anbieters entfallen. Er haette den Fehler unsichtbar gemacht: Eine Aufgabe waere
     * nach einem Aussetzer anders zustande gekommen als die daneben, und die Lehrkraft
     * saehe der Punktzahl nicht an, dass etwas schiefging. Ein sichtbarer Fehlschlag
     * ist einer Bewertung vorzuziehen, die niemand einordnen kann.
     *
     * Der Abbruchgrund gehoert deshalb in die Meldung: Ohne ihn sieht man nur, DASS
     * nichts kam.
     */
    let abbruchgrund: string | undefined;

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
        abbruchgrund = currentData.choices?.[0]?.finish_reason;

        break;
    }

    if (toolRetryCount > maxToolRetries) {
        throw new Error('Die KI konnte nach mehreren Versuchen keinen mathematisch validen Graphen generieren. Bitte passe den Aufgabentext an oder nutze ein leistungsstärkeres Modell.');
    }

    // Ausgeschrieben statt ueber `istLeer`: Nur so verengt der Compiler den Typ fuer
    // alles danach. Eine Hilfsfunktion braeuchte dafuer eine Typzusicherung, und die
    // waere hier eine Behauptung ueber etwas, das der Compiler selbst sehen kann.
    if (responseContent === null || responseContent === undefined || responseContent === '') {
        // Der Abbruchgrund gehoert in die Meldung: "length" heisst, der Denktext hat den
        // Platz aufgebraucht — eine ganz andere Ursache als "content_filter" oder "stop".
        // Ohne ihn sieht man nur, DASS nichts kam.
        const verbrauch = responseUsage
            ? ` (${responseUsage.completion_tokens ?? '?'} Antwort-Tokens)`
            : '';
        throw new Error(
            `Die KI hat eine leere Antwort zurückgegeben. Abbruchgrund: `
            + `${abbruchgrund ?? 'unbekannt'}${verbrauch}. Das Modell kann überlastet sein, `
            + `die Eingabe blockiert, oder der Denktext hat den Antwortplatz aufgebraucht.`
        );
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
