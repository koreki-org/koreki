import { parseGeneratedGraph, validateGraphDeterminism } from '../grading/graph-generator';
import { parseGeneratedCalcTrace, validateCalcTraceDeterminism } from '../grading/calc-trace-generator';
import type { GradingGraph } from '../grading/types';
import type { TargetGoal } from '../grading/calc-trace-types';

/**
 * Werkzeugaufrufe des Modells pruefen.
 * 🧪
 *
 * Beim Erzeugen eines Bewertungsgraphen oder einer Rechenkette liefert das
 * Modell seinen Entwurf nicht als Text, sondern als Werkzeugaufruf. Koreki
 * rechnet ihn probeweise durch, bevor er akzeptiert wird — haelt er nicht,
 * geht der konkrete Fehler zurueck ans Modell und es bessert nach.
 *
 * Das ist der Grund, warum ein erzeugter Graph verlaesslich ist: er wurde
 * simuliert, nicht nur plausibel formuliert.
 *
 * WARUM DIESE DATEI EXISTIERT
 * ---------------------------
 * Diese Pruefung stand zweimal da — in mistral-provider und openai-provider,
 * ueber 58 Zeilen zeichengleich bis auf einen Kommentar. Sie war (noch) nicht
 * auseinandergelaufen. In derselben Sitzung sind aber zwei andere Kopien-Paare
 * genau daran gescheitert: einmal fehlte `<think>` nur in einer Fassung,
 * einmal wurde `task.targetGoal` nur in einer gesetzt. Beide Male war die
 * Folge eine falsche oder fehlende Bewertung.
 *
 * Eine Doppelung, die noch nicht gedriftet ist, ist keine heile Struktur —
 * nur eine, bei der es noch niemand angefasst hat.
 */

/** Wie viele Nachbesserungen das Modell bekommt, bevor abgebrochen wird. */
export const MAX_TOOL_RETRIES = 3;

export type ToolValidationOutcome =
    /** Der Entwurf hat die Simulation bestanden und kann direkt zurueck. */
    | { status: 'akzeptiert'; artefakt: GradingGraph | TargetGoal }
    /** Der Entwurf haelt nicht — diese Rueckmeldung geht ans Modell. */
    | { status: 'nachbessern'; rueckmeldung: string }
    /** Kein Werkzeug, das hier geprueft wird. Der Anbieter macht normal weiter. */
    | { status: 'unbekannt' };

/**
 * Prueft den Entwurf hinter einem Werkzeugaufruf.
 *
 * Die Rueckmeldung im Fall `nachbessern` nennt bewusst den KONKRETEN Fehler
 * ("Mathematical validation failed: ..."). Ein blosses "war falsch" laesst das
 * Modell im naechsten Versuch dieselbe Struktur mit anderen Zahlen bauen.
 */
export function pruefeWerkzeugAufruf(name: string, argumente: string): ToolValidationOutcome {
    if (name === 'validate_graph') {
        const entwurf = parseGeneratedGraph(argumente, { skipSanitization: true });
        if (!entwurf) {
            return {
                status: 'nachbessern',
                rueckmeldung: 'Invalid JSON structure or missing variables. Ensure you match the GRADING_GRAPH_SCHEMA exactly.'
            };
        }

        const pruefung = validateGraphDeterminism(entwurf);
        if (pruefung.isValid) {
            // [Short-Circuit Optimization] Der Entwurf ist simuliert und haelt —
            // ein weiterer Modellaufruf brauchte nichts mehr beizutragen.
            return { status: 'akzeptiert', artefakt: entwurf };
        }

        return {
            status: 'nachbessern',
            rueckmeldung: `Mathematical validation failed: ${pruefung.error}. Please fix this and try again or return the corrected graph.`
        };
    }

    if (name === 'validate_calc_trace') {
        const entwurf = parseGeneratedCalcTrace(argumente);
        if (!entwurf) {
            return {
                status: 'nachbessern',
                rueckmeldung: 'Invalid JSON structure or missing fields. Ensure you match the CALC_TRACE_SCHEMA exactly.'
            };
        }

        const pruefung = validateCalcTraceDeterminism(entwurf);
        if (pruefung.isValid) {
            return { status: 'akzeptiert', artefakt: entwurf };
        }

        return {
            status: 'nachbessern',
            rueckmeldung: `Mathematical validation failed: ${pruefung.error}. Please fix this and try again.`
        };
    }

    return { status: 'unbekannt' };
}
