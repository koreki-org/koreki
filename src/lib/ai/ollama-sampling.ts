import type { AppSettings } from '../../types';
import type { AIAction } from './prompt-dispatch';
import { FREETEXT_TEMPERATURE_MINIMUM, TEMPERATURE_MINIMUM, TOP_P_DEFAULT, VISION_TEMPERATURE_MINIMUM } from './temperature-guidance';

/**
 * Wie heiss das lokale Modell rechnen darf.
 * 🌡️
 *
 * Die Trennung nach Aufgabenart ist Gesetz, nicht Konvention (siehe Skill
 * `prompt-engineering` §4): Beim Abschreiben einer Seite ist jede Kreativitaet
 * eine Halluzination — dort gilt 0.0. Beim inhaltlichen Bewerten muss das
 * Modell erkennen, dass "hoehere Geschwindigkeit" und "mehr Durchsatz"
 * dasselbe meinen — dort waeren 0.0 zu stur.
 *
 * Dagegen steht die Eigenart lokaler Modelle: unter einer bestimmten Temperatur
 * drehen sie sich im Kreis und wiederholen denselben Satz, bis der Puffer voll
 * ist. Qwen und Gemma/MoE haben deshalb dokumentierte Mindestwerte. Das ist
 * KEINE Aufweichung der Regel oben, sondern ein Stabilitaetsboden darunter.
 *
 * Herausgezogen aus `ollama-logic.ts`. Die Rechnung ist rein — gleiche Eingabe,
 * gleiche Ausgabe, kein Netz — und war dort 135 Zeilen lang ungeprueft.
 */

/** Aktionen, bei denen das Modell Struktur erzeugt statt zu formulieren. */
const SYSTEM_AKTIONEN: AIAction[] = [
    'clean-and-analyze',
    'clean-and-map',
    'variable-extraction',
    'generate-graph',
    'refine-graph',
    'generate-calc-trace',
    'calc-trace-extraction'
];

/**
 * Aktionen, die eine Rechnung abbilden. Hier ist jede Abweichung ein Fehler,
 * kein Stil — deshalb so kalt wie moeglich.
 */
const DETERMINISTISCHE_AKTIONEN: AIAction[] = [
    'calc-trace-extraction',
    'generate-calc-trace',
    'variable-extraction'
];
/**
 * Top P fuer die Aktionen, die ein festes JSON-Schema fuellen.
 *
 * Derselbe Wert, den `calc-trace-extraction` bei Mistral und OpenAI seit jeher fest
 * gesetzt bekommt (`calc-trace-extraction.ts`) und den der Prompt-Aufbau fuer diese
 * Aktion selbst vorgibt. Eng, weil diese Aktionen abschreiben statt zu formulieren.
 */
export const DETERMINISTISCHER_TOP_P = 0.1;

export interface ModellArt {
    isVision: boolean;
    isSystemAction: boolean;
    isReasoningModel: boolean;
    isGemmaOrMoE: boolean;
    isQwen: boolean;
}

/**
 * Ordnet Modellnamen und Aktion den Eigenarten zu, an denen die Parameter
 * unten haengen.
 *
 * Die Ausschluesse bei Gemma/MoE sind Absicht: die dichten 31b/32b-Varianten
 * tragen zwar dieselben Namensbestandteile, neigen aber nicht zur
 * Wiederholungsschleife und brauchen den Temperaturboden nicht.
 */
export function bestimmeModellArt(action: AIAction, model: string): ModellArt {
    const m = model.toLowerCase();
    return {
        isVision: action === 'vision',
        isSystemAction: SYSTEM_AKTIONEN.includes(action),
        isReasoningModel: m.includes('r1') || m.includes('qwq') || m.includes('reasoning'),
        isGemmaOrMoE:
            (m.includes('gemma') || m.includes('26b') || m.includes('a4b') || m.includes('moe')) &&
            !m.includes('31b') &&
            !m.includes('32b') &&
            !m.includes('dense'),
        isQwen: m.includes('qwen')
    };
}

export interface SamplingEingabe {
    action: AIAction;
    model: string;
    settings: AppSettings;
    /** Voreinstellungen aus dem Prompt selbst, falls die Instruktion welche mitbringt. */
    promptOptions?: { temperature?: number; topP?: number };
    /** Laenge von System- und Nutzertext zusammen, in Zeichen. */
    promptCharCount: number;
    imageCount: number;
    /** Ein erzwungenes Antwortschema zaehlt als strukturierte Ausgabe. */
    hasResponseSchema: boolean;
}

export interface SamplingParameter {
    temperature: number;
    topP: number;
    /** `undefined` heisst: die Entscheidung dem Server ueberlassen. */
    numCtx: number | undefined;
    maxTokens: number;
    /** Was im Feld `think` an Ollama geht. */
    think: boolean;
    art: ModellArt;
}

/** Ein Seitenbild kostet ungefaehr so viel Kontext wie 8000 Textzeichen-Token. */
const TOKEN_PRO_BILD = 8000;

/**
 * Deutscher Text und Formeln brauchen mehr Token pro Zeichen als englische
 * Prosa. Der Teiler ist bewusst niedrig — wird der Bedarf unterschaetzt,
 * schneidet Ollama den Prompt still ab, und die Bewertung laeuft auf einer
 * halben Schuelerarbeit.
 */
const ZEICHEN_PRO_TOKEN = 2.8;

export function berechneSamplingParameter(e: SamplingEingabe): SamplingParameter {
    const { action, settings, promptOptions, promptCharCount, imageCount, hasResponseSchema } = e;
    const art = bestimmeModellArt(action, e.model);
    const { isVision, isSystemAction, isReasoningModel, isGemmaOrMoE, isQwen } = art;
    const modelLower = e.model.toLowerCase();

    let targetMaxTokens = isVision
        ? (settings.visionMaxTokens ?? 16000)
        : (settings.maxTokens ?? 32768);
    if (isSystemAction) {
        targetMaxTokens = Math.min(targetMaxTokens, 8192);
    }

    const shouldIncludeThink = settings.enableThinking === true || isReasoningModel;
    // Bilderkennung und Struktur-Aktionen denken nicht laut: der Denktext
    // landete sonst im JSON, das sie erzeugen sollen.
    // Rueckfall `true`, wie ihn ADR 001, das Standardprofil und die
    // Thinking-Governance in ai-provider-infrastructure.md vorsehen. Stand hier bis
    // zum 25.08.2026 auf `false` — ohne geladenes Profil lief die Korrektur damit
    // ohne Denkschritt, obwohl jede andere Stelle das Gegenteil sagte. Gemessen am
    // 24.08.2026 ist es der Schalter mit dem groessten Einfluss auf die Genauigkeit.
    const think = (isVision || isSystemAction) ? false : (settings.enableThinking ?? true);

    // ─── Temperatur und top_p ────────────────────────────────────────────────
    let targetTemp: number;
    let targetTopP: number;

    if (isVision) {
        targetTemp = settings.visionTemperature ?? promptOptions?.temperature ?? 0.0;
        targetTopP = settings.visionTopP ?? promptOptions?.topP ?? 1.0;
    } else if (isSystemAction) {
        const defaultTemp = isGemmaOrMoE ? 0.5 : (isQwen ? 0.3 : 0.2);
        const defaultTopP = 0.9;

        if (action === 'clean-and-map' || action === 'clean-and-analyze'
            || DETERMINISTISCHE_AKTIONEN.includes(action)) {
            // Diese Aktionen ignorieren die Profileinstellung bewusst vollstaendig:
            // sie schreiben ab, was dasteht. Waere hier ein im Profil gesetzter
            // Kulanzwert wirksam, erfaende das Modell beim Abschreiben — und der
            // Fehler faende sich nie wieder, weil danach alles auf dem erfundenen
            // Text aufbaut.
            //
            // ERWEITERT AM 03.09.2026 um die deterministischen Aktionen. Fuer sie
            // stand die Absicht laengst in `DETERMINISTISCHE_AKTIONEN` — nur war sie
            // wirkungslos: `settings.temperature ?? (isDeterministisch ? 0.0 : ...)`
            // liess das PROFIL gewinnen, und bei `topP` wurde die Aktionsart nie
            // abgefragt. Da in Koreki immer ein Profil laeuft, war der kalte Zweig im
            // Betrieb nie aktiv — die Extraktion lief mit den Werten der Korrektur.
            //
            // EINE Regel (Profil ignorieren), ZWEI Wertesaetze — und das ist kein
            // Versehen, sondern am 04.09.2026 gemessen.
            //
            // Zuerst bekamen die deterministischen Aktionen dieselben Werte wie die
            // Aufbereitung (0.3 / 0.9 bei Qwen). Die Rechenketten-Pruefung fiel danach
            // im Demo-Szenario aus: "Schritt 1 der Extraktion hat keine Formel". Der
            // Schueler schreibt dort als erste Zeile `Ich nutze die Formel E = A · η · H`
            // — eine Formelzeile OHNE Zahlen. Bei 0.3 liess das Modell das Feld
            // schlicht weg, und die Aufgabe fiel in die manuelle Nachkontrolle.
            //
            // Die beiden Aufgaben sind nicht dieselbe:
            // * Aufbereitung schreibt eine ganze Seite als FLIESSTEXT ab. Zu kalt ist
            //   dort gefaehrlich — lokale Modelle bleiben an Wiederholungen haengen,
            //   bis der Puffer voll ist. Daher der Stabilitaetsaufschlag.
            // * Die deterministischen Aktionen fuellen ein festes JSON-SCHEMA. Das
            //   Schema beendet die Ausgabe von selbst; Schleifen sind hier nicht die
            //   Gefahr. Zu warm ist es: dann fehlen Felder.
            //
            // Gemeinsam ist beiden nur, dass ein im Profil gesetzter Kulanzwert sie
            // nicht erreichen darf. Die Zahlen daneben folgen der Arbeit, nicht der
            // Symmetrie.
            const istSchemaAktion = DETERMINISTISCHE_AKTIONEN.includes(action);
            targetTemp = istSchemaAktion ? TEMPERATURE_MINIMUM : defaultTemp;
            targetTopP = istSchemaAktion ? DETERMINISTISCHER_TOP_P : defaultTopP;
        } else {
            targetTemp = settings.temperature ?? defaultTemp;
            targetTopP = settings.topP ?? defaultTopP;
        }
    } else {
        // Ein Standardwert fuer alle Modelle (24.08.2026). Vorher lag er je Modell
        // verschieden (Gemma/MoE 0.5, Qwen 0.3) — das waren Stabilitaetsaufschlaege,
        // keine paedagogischen Werte, und sie kosteten Reproduzierbarkeit.
        targetTemp = settings.temperature ?? promptOptions?.temperature ?? TEMPERATURE_MINIMUM;
        targetTopP = settings.topP ?? promptOptions?.topP ?? TOP_P_DEFAULT;
    }

    // ─── Stabilitaetsboden ───────────────────────────────────────────────────
    // Nicht die paedagogische Regel, sondern der Schutz vor Endlosschleifen.
    if (isVision) {
        if (targetTemp < VISION_TEMPERATURE_MINIMUM) targetTemp = VISION_TEMPERATURE_MINIMUM;
    } else {
        // Freitext zuerst: Dort wiederholt Qwen bei <= 0.1 ganze Absaetze, bis der
        // Puffer voll ist. In strukturierter Ausgabe haelt das Schema dagegen — es
        // zwingt die Antwort zum Ende, eine Schleife kann gar nicht entstehen.
        // Betrifft heute genau die Zweitmeinung; sie behaelt deshalb ihre 0.2.
        const hasStructuredFormat = hasResponseSchema || isSystemAction || action !== 'second-opinion';
        const untergrenze = hasStructuredFormat ? TEMPERATURE_MINIMUM : FREETEXT_TEMPERATURE_MINIMUM;

        // Gilt jetzt fuer ALLE Modelle. Der frueher hoehere Boden fuer Gemma/MoE (0.5)
        // ist entfallen: Er war als Schutz vor derselben Wiederholungsschleife gedacht,
        // traf aber auch die strukturierte Korrektur, wo sie nicht auftreten kann.
        if (targetTemp < untergrenze) targetTemp = untergrenze;
    }

    // ─── Kontextfenster ──────────────────────────────────────────────────────
    const estimatedTextTokens = Math.ceil(promptCharCount / ZEICHEN_PRO_TOKEN);
    const imageTokens = imageCount * TOKEN_PRO_BILD;

    let numCtx: number | undefined = settings.ollamaNumCtx;
    if (!numCtx || numCtx === 0) {
        const customLimit = isVision ? (settings.visionMaxTokens ?? 0) : (settings.maxTokens ?? 0);
        // Denkt das Modell laut, braucht es Platz fuer den Denktext ZUSAETZLICH
        // zur Antwort. Ohne den groesseren Puffer laeuft der Kontext ueber und
        // die eigentliche Antwort faellt hinten heraus.
        const needsMoreBuffer = shouldIncludeThink || isReasoningModel;
        const responseBuffer = Math.max(needsMoreBuffer ? 12000 : 4000, customLimit);
        let totalEstimated = estimatedTextTokens + imageTokens + responseBuffer;

        if (action === 'calc-trace-extraction' || action === 'generate-calc-trace') {
            totalEstimated = Math.max(totalEstimated, 16384);
        }

        if (totalEstimated <= 8192) numCtx = 8192;
        else if (totalEstimated <= 16384) numCtx = 16384;
        else numCtx = 32768;
    }

    // Cloud-Varianten kennen `num_ctx` nicht und brechen bei abweichenden
    // Werten ab — dort entscheidet der Server.
    if (modelLower.includes('-cloud')) {
        numCtx = undefined;
    }

    const maxTokens = numCtx
        ? Math.min(targetMaxTokens, Math.max(1000, numCtx - estimatedTextTokens - imageTokens))
        : targetMaxTokens;

    return { temperature: targetTemp, topP: targetTopP, numCtx, maxTokens, think, art };
}
