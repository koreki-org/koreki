import type { GradingGraph } from './types';

/**
 * Aufnahme eines Graphen aus einer fremden Quelle.
 * 📥🛡️
 *
 * Zwei Wege fuehren im Editor einen Graphen von aussen herein: die
 * JSON-Ansicht, in die eine Lehrkraft direkt hineinschreibt, und die
 * KI-Verfeinerung. Beide lagen im Rumpf von GradingGraphModal und waren nur
 * ueber das Rendern des gesamten Modals erreichbar.
 *
 * Der wichtigere der beiden Faelle ist die Verfeinerung: dort entscheidet eine
 * unscheinbare Zusammenfuehrung darueber, ob die Punktvergabe erhalten bleibt.
 */

/** Reicht der Kandidat als Graph? Mehr als das hat der Editor nie geprueft. */
export function isUsableGraph(candidate: any): boolean {
    return !!candidate && Array.isArray(candidate.variables);
}

export type GraphJsonParseResult =
    | { ok: true; graph: GradingGraph }
    | { ok: false; error: string };

/**
 * Deutet den Text aus der JSON-Ansicht.
 *
 * Bewusst nur die Pruefung, die der Editor schon immer gemacht hat: gueltiges
 * JSON mit einer `variables`-Liste. Einzelne Variablen werden NICHT geprueft —
 * ein Eintrag ohne `id` kommt weiterhin durch. Das ist eine bekannte Luecke und
 * hier absichtlich unveraendert gelassen; sie zu schliessen waere eine
 * Verhaltensaenderung und gehoert in einen eigenen Schritt.
 */
export function parseGraphJson(text: string): GraphJsonParseResult {
    try {
        const parsed = JSON.parse(text);

        if (!isUsableGraph(parsed)) {
            return { ok: false, error: "Das JSON muss eine 'variables'-Liste enthalten." };
        }

        return { ok: true, graph: parsed as GradingGraph };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Ungültiges JSON-Format' };
    }
}

export interface RefinementResponse {
    graph: any;
    explanation: string;
}

/**
 * Die KI antwortet in zwei Formen: entweder direkt mit dem Graphen oder mit
 * `{ graph, explanation }`. Diese Unterscheidung an einer Stelle statt im
 * Handler.
 */
export function extractRefinementResponse(responseData: any): RefinementResponse {
    if (responseData && responseData.graph) {
        return { graph: responseData.graph, explanation: responseData.explanation || '' };
    }

    return { graph: responseData, explanation: '' };
}

/**
 * Fuehrt den verfeinerten Graphen mit dem aktuellen zusammen.
 *
 * Die beiden Meta-Felder werden ABSICHTLICH unterschiedlich behandelt, und der
 * Unterschied ist keine Nachlaessigkeit:
 *
 * - `discipline` ist eine Einordnung, die das Modell mit Blick auf den neuen
 *   Graphen sinnvoll aktualisieren kann. Der neue Wert gewinnt, der alte dient
 *   als Rueckfall.
 * - `disablePoints` ist dagegen die Entscheidung der Lehrkraft darueber, ob
 *   die Engine streng punktet oder das Modell entscheidet. Diese Entscheidung
 *   darf eine Verfeinerung NIE ueberschreiben — der aktuelle Wert gewinnt,
 *   solange er gesetzt ist. Ginge er verloren, aenderte sich die Bewertung
 *   ganzer Aufgaben, ohne dass jemand etwas angeklickt haette.
 */
export function mergeRefinedGraph(current: GradingGraph, refined: any): GradingGraph {
    return {
        ...refined,
        discipline: refined?.discipline || current?.discipline,
        disablePoints: current?.disablePoints !== undefined
            ? current.disablePoints
            : refined?.disablePoints
    };
}
