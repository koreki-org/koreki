import { useState, useEffect } from 'react';
import type { GradingGraph } from '@/lib/grading/types';
import { parseGraphJson } from '@/lib/grading/graph-intake';

/**
 * Der Bewertungsgraph und seine JSON-Ansicht.
 * 📄
 *
 * Beide zeigen dasselbe: Wer im Editor eine Variable ändert, muss das im
 * JSON-Reiter sehen, und umgekehrt. Der Graph ist die Quelle, der Text seine
 * Darstellung — die Rückrichtung läuft über `parseGraphJson` und schlägt bei
 * ungültiger Eingabe nur den Text um, nicht den Graphen.
 *
 * Genau deshalb liegen sie in EINEM Hook: getrennt gehalten laufen sie
 * auseinander, sobald jemand nur eine Seite anfasst.
 */

export interface UseGraphDocumentParams {
    /** Der beim Öffnen übergebene Graph. Ändert er sich, gilt der neue. */
    initialGraph?: GradingGraph;
}

export function useGraphDocument({ initialGraph }: UseGraphDocumentParams) {
    const [graph, setGraph] = useState<GradingGraph>(() =>
        initialGraph && Array.isArray(initialGraph.variables)
            ? initialGraph
            // Leere Vorlage, wenn nichts uebergeben wurde.
            : { taskId: `task-${Date.now()}`, discipline: 'general', variables: [] }
    );

    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Der Text folgt dem Graphen — nicht umgekehrt.
    useEffect(() => {
        setJsonText(JSON.stringify(graph, null, 2));
    }, [graph]);

    useEffect(() => {
        if (initialGraph && Array.isArray(initialGraph.variables)) {
            setGraph(initialGraph);
        }
    }, [initialGraph]);

    /**
     * Eingabe im JSON-Reiter.
     *
     * Der Text wird IMMER übernommen, damit die Lehrkraft weitertippen kann;
     * der Graph nur bei gültiger Eingabe. Sonst verschwände die halbfertige
     * Zeile beim nächsten Tastendruck.
     */
    const handleJsonChange = (val: string) => {
        setJsonText(val);

        const result = parseGraphJson(val);
        if (result.ok) {
            setGraph(result.graph);
            setJsonError(null);
        } else {
            setJsonError(result.error);
        }
    };

    return { graph, setGraph, jsonText, jsonError, handleJsonChange };
}
