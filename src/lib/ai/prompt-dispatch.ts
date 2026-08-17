import type { Task, GradingMemoryCase, CustomSkillDefinition, ChatMessage } from '../../types';
import type { PromptLibraryEntry } from './prompt-library';
import type { GradingGraph } from '../grading/types';
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
import { buildGraphGenerationPrompt, buildGraphRefinementPrompt } from '../grading/graph-generator';
import { buildCalcTraceGenerationPrompt } from '../grading/calc-trace-generator';

/**
 * Was ein Anbieter tun kann.
 *
 * Stand dreimal da — je einmal in mistral-provider, openai-provider und
 * ollama-logic — und die drei Fassungen waren nicht deckungsgleich. Der
 * `never`-Zweig unten kann seine Aufgabe nur erfuellen, wenn es genau EINE
 * Liste gibt: sonst prueft er die Vollstaendigkeit gegen die falsche.
 *
 * `ocr` fehlt bewusst: das ist Mistrals eigener Endpunkt (/v1/ocr), kein
 * Chat-Aufruf, und laeuft dort an dieser Zuordnung vorbei.
 */
export type AIAction = 'correction' | 'clean-and-analyze' | 'clean-and-map' | 'vision' | 'student-simulator' | 'anonymize' | 'second-opinion' | 'generate-graph' | 'refine-graph' | 'variable-extraction' | 'generate-calc-trace' | 'calc-trace-extraction';

/**
 * Welche Instruktion bekommt welche Aktion?
 * 🧭
 *
 * Diese Zuordnung stand DREIMAL da — in mistral-provider, openai-provider und
 * ollama-logic, jeweils als dieselbe Kette aus dreizehn `else if`. Sie ist das
 * Herz der Bewertung: sie entscheidet, welche Instruktion das Modell fuer eine
 * Aufgabe erhaelt.
 *
 * Zweimal in derselben Sitzung hat genau diese Bauform — dieselbe Logik
 * mehrfach gepflegt — einen Fehler erzeugt: `<think>` fehlte nur in einer
 * Kopie, `task.targetGoal` wurde nur in einer gesetzt. Beide Male fiel es erst
 * auf, als jemand danach suchte. Architectural Vision §11 verlangt identische
 * Qualitaet ueber alle Anbieter; drei getrennt gepflegte Ketten koennen das
 * nicht zusichern, sie koennen es nur zufaellig erfuellen.
 *
 * Die Vision-Aktion ist bewusst enthalten: der Prompt ist ueberall derselbe,
 * nur der Nachrichtenaufbau drumherum unterscheidet sich je Anbieter (Bild als
 * `image_url` gegen ein eigenes `images`-Feld). Der bleibt beim Anbieter.
 */

/**
 * Die Felder, die eine Aktion aus dem Payload liest.
 *
 * Alle optional, weil jede Aktion nur ihren eigenen Ausschnitt braucht — der
 * Payload ist die Vereinigung ueber dreizehn Aktionen, nicht der Bedarf einer
 * einzelnen. Vorher stand hier ueberall `payload: any`.
 */
export interface PromptPayload {
    modelSolution?: string;
    studentText?: string;
    text?: string;
    tasksLayout?: Task[] | null;
    selectedTasks?: string[];

    // second-opinion
    taskName?: string;
    taskInstructions?: string;
    sampleSolution?: string;
    maxPoints?: number;
    currentPoints?: number;
    currentFeedback?: string;
    teacherDoubt?: string;
    chatHistory?: ChatMessage[];

    // Graph und Rechenkette
    taskText?: string;
    discipline?: string;
    userNotes?: string;
    currentGraph?: GradingGraph;
    userInstruction?: string;

    // Extraktion
    variables?: unknown[];
    extractionInstructions?: string;
    expectedValues?: { id: string; label: string; unit?: string }[];
    systemPrompt?: string;
    correctionInstruction?: string;

    // Bilderkennung
    /** Base64 des Seitenbildes. */
    buffer?: string;
    mimeType?: string;

    /** Nur bei Ollama: der Erfahrungsschatz kommt dort ueber den Payload. */
    gradingMemory?: GradingMemoryCase[] | null;
    /** Nur bei Ollama: erlaubt dem Rust-Proxy, laufende Anfragen zuzuordnen. */
    requestId?: string;

    [key: string]: unknown;
}

/**
 * Was der Anbieter beisteuert.
 *
 * Bewusst getrennt vom Payload: Diese Werte stammen aus den Einstellungen des
 * Lehrers, nicht aus der Anfrage. Wo der Anbieter sie herholt, bleibt seine
 * Sache — Mistral und OpenAI lesen sie aus `options`, Ollama aus `settings`.
 */
export interface PromptDispatchOptions {
    model?: string;
    customPrompt?: string;
    gradingMemory?: GradingMemoryCase[] | null;
    activeSkillIds?: string[];
    customSkills?: Record<string, CustomSkillDefinition | PromptLibraryEntry>;
}

/**
 * Pflichtfelder der Prompt-Bauer absichern.
 *
 * Sie landen unveraendert in Textbausteinen. Kam dort frueher `undefined` an —
 * moeglich, weil der Payload `any` war —, stand im Prompt das WORT "undefined".
 */
const pflicht = (wert?: string): string => wert ?? '';

export function buildPromptForAction(
    action: AIAction,
    payload: PromptPayload,
    options: PromptDispatchOptions = {}
): StructuredPrompt {
    const { model, customPrompt, gradingMemory, activeSkillIds, customSkills } = options;

    switch (action) {
        case 'vision':
            return buildVisionPrompt();

        case 'correction':
            return buildCorrectionPrompt(
                pflicht(payload.modelSolution), pflicht(payload.studentText), payload.tasksLayout,
                customPrompt, model, gradingMemory, activeSkillIds, customSkills
            );

        case 'clean-and-analyze':
            return buildCleanAndAnalyzePrompt(pflicht(payload.modelSolution), model);

        case 'clean-and-map':
            return buildCleanAndMapPrompt(pflicht(payload.text || payload.studentText), payload.tasksLayout ?? undefined, model);

        case 'student-simulator':
            return buildStudentSimulatorPrompt(pflicht(payload.modelSolution), payload.tasksLayout ?? undefined, payload.selectedTasks);

        case 'anonymize':
            return buildAnonymizePrompt(pflicht(payload.studentText));

        case 'second-opinion':
            return buildSecondOpinionPrompt(
                pflicht(payload.taskName), payload.taskInstructions, payload.sampleSolution,
                payload.maxPoints, payload.studentText, payload.currentPoints,
                payload.currentFeedback, payload.teacherDoubt, payload.chatHistory
            );

        case 'generate-graph':
            return buildGraphGenerationPrompt(pflicht(payload.taskText), payload.discipline, payload.userNotes);

        case 'refine-graph':
            // Ohne bestehenden Graphen gibt es nichts zu verfeinern. Ihn als
            // `undefined` durchzureichen erzeugt einen Prompt, in dem das WORT
            // "undefined" als aktueller Graph steht — das Modell erfindet dann
            // einen neuen, statt den vorhandenen zu aendern.
            if (!payload.currentGraph) {
                throw new Error('refine-graph ohne currentGraph aufgerufen.');
            }
            return buildGraphRefinementPrompt(pflicht(payload.taskText), payload.currentGraph, pflicht(payload.userInstruction), payload.discipline);

        case 'variable-extraction':
            return buildVariableExtractionPrompt(pflicht(payload.studentText), payload.variables ?? [], payload.extractionInstructions, payload.taskName);

        case 'generate-calc-trace':
            return buildCalcTraceGenerationPrompt(pflicht(payload.taskText), pflicht(payload.discipline), payload.userNotes, payload.maxPoints);

        case 'calc-trace-extraction':
            return buildCalcTraceExtractionPrompt(
                pflicht(payload.studentText), payload.expectedValues, payload.taskName,
                payload.systemPrompt, payload.correctionInstruction
            );

        default:
            // Der Compiler prueft an dieser Stelle, dass oben KEINE Aktion fehlt:
            // kommt eine neue in AIAction dazu, ist `action` hier nicht mehr
            // `never` und die Zuweisung schlaegt fehl. Damit kann die Kette nicht
            // mehr stillschweigend hinter der Aktionsliste zurueckbleiben.
            const unbehandelt: never = action;
            throw new Error(`Unsupported text action: ${unbehandelt}`);
    }
}
