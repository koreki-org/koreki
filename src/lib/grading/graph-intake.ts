import type { GradingGraph } from './types';
import { toErrorMessage } from '../error-message';
import { parseGeneratedGraph } from './graph-generator';

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
 * BIS ZUM 18.08.2026 wurde hier nur geprueft, ob gueltiges JSON mit einer
 * `variables`-Liste vorliegt — einzelne Variablen gar nicht. Der Kommentar an
 * dieser Stelle nannte das eine bekannte Luecke, deren Schliessung "in einen
 * eigenen Schritt" gehoere. Das ist dieser Schritt.
 *
 * Der Anlass: dieselben Pruefungen gibt es laengst fuer den KI-Weg. Wer den
 * Graphen dagegen von Hand in die JSON-Ansicht schrieb, bekam KEINE davon —
 * nachgestellt:
 *
 *   doppelte Variablen-Kennung -> 1 von 2 Punkten fuer eine richtige Antwort
 *   Aequivalenzgruppe ohne `prefixes` -> Absturz mitten in der Bewertung
 *
 * Zwei Eingaenge, eine Regel. Die Punktverteilung bleibt dabei unangetastet
 * (`skipSanitization`): sie ist die Entscheidung der Lehrkraft, und wer von
 * Hand JSON schreibt, meint sie so.
 */
export function parseGraphJson(text: string): GraphJsonParseResult {
    let roh: unknown;
    try {
        roh = JSON.parse(text);
    } catch (err) {
        return { ok: false, error: toErrorMessage(err, 'Ungültiges JSON-Format') };
    }

    if (!isUsableGraph(roh)) {
        return { ok: false, error: "Das JSON muss eine 'variables'-Liste enthalten." };
    }

    // Eine LEERE Liste bleibt zulaessig: die JSON-Ansicht wird waehrend des
    // Tippens laufend gedeutet, und wer neu anfaengt, loescht zuerst alles. Ein
    // Graph ohne Variablen bewertet ohnehin nichts — das faengt der Trockenlauf.
    const vorher = (roh as { variables: unknown[] }).variables.length;
    if (vorher === 0) {
        return { ok: true, graph: roh as GradingGraph };
    }

    const geprueft = parseGeneratedGraph(text, { skipSanitization: true });
    if (!geprueft) {
        return { ok: false, error: 'Keine brauchbare Variable gefunden. Jede braucht eine `id` und den Typ `input` oder `formula`.' };
    }

    // Verworfene Variablen NICHT verschweigen: wer von Hand schreibt, soll
    // erfahren, dass etwas nicht angekommen ist — sonst sucht er den Fehler
    // spaeter in der Bewertung.
    if (geprueft.variables.length < vorher) {
        return {
            ok: false,
            error: `${vorher - geprueft.variables.length} von ${vorher} Variablen sind unbrauchbar `
                + '(fehlende `id`, unbekannter Typ, doppelte Kennung oder unerlaubter Ausdruck).'
        };
    }

    return { ok: true, graph: geprueft };
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
