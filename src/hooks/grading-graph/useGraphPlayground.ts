import { useState, useMemo } from 'react';
import type { GradingGraph, GradingResult } from '@/lib/grading/types';
import { GraphRunner } from '@/lib/grading/GraphRunner';
import { buildPerfectInputs, computeExpectedValues, parsePlaygroundInputs } from '@/lib/grading/graph-preview';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Der Probelauf: einen Graphen mit erfundenen Schülerwerten durchrechnen.
 * 🧪
 *
 * Der Lehrkraft zeigt das VOR dem Einsatz, was ihre Bewertung tatsächlich tut —
 * inklusive Folgefehler-Kulanz. Ohne diesen Reiter müsste sie es an einer
 * echten Klausur herausfinden.
 */

export interface UseGraphPlaygroundParams {
    graph: GradingGraph;
}

export function useGraphPlayground({ graph }: UseGraphPlaygroundParams) {
    const [playgroundInputs, setPlaygroundInputs] = useState<Record<string, string>>({});
    const [playgroundResult, setPlaygroundResult] = useState<GradingResult | null>(null);

    /**
     * Die erwarteten Werte aller Formeln, laufend nachgerechnet.
     *
     * Dient zugleich als Syntaxprüfung: Was sich nicht auswerten lässt, meldet
     * sich hier, während die Lehrkraft die Formel noch schreibt.
     */
    const evaluatedContext = useMemo(
        () => computeExpectedValues(graph?.variables),
        [graph?.variables]
    );

    /** Füllt die Eingaben mit der fehlerfreien Musterlösung. */
    const handleFillPerfect = () => {
        setPlaygroundInputs(buildPerfectInputs(graph?.variables, evaluatedContext.context));
    };

    const handleRun = () => {
        const studentValues = parsePlaygroundInputs(graph?.variables, playgroundInputs);

        try {
            setPlaygroundResult(GraphRunner.grade(graph, studentValues));
        } catch (e) {
            alert(`Fehler beim Berechnen der Bewertung: ${toErrorMessage(e)}`);
        }
    };

    return {
        playgroundInputs, setPlaygroundInputs,
        playgroundResult,
        evaluatedContext,
        handleFillPerfect,
        handleRun
    };
}
