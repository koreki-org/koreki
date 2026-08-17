import { useState } from 'react';
import type { AppSettings } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { extractRefinementResponse, isUsableGraph, mergeRefinedGraph } from '@/lib/grading/graph-intake';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Den Graphen im Gespräch mit der KI verfeinern.
 * 💬📐
 *
 * Die Lehrkraft sagt in einem Satz, was anders werden soll („Toleranz auf 0.1"),
 * und bekommt den geänderten Graphen zurück. Der Verlauf bleibt sichtbar,
 * damit nachvollziehbar ist, welche Anweisung welche Änderung ausgelöst hat.
 */

export interface ChatEintrag {
    role: 'user' | 'assistant';
    text: string;
    hasError?: boolean;
}

export interface UseGraphAiRefinementParams {
    graph: GradingGraph;
    setGraph: (graph: GradingGraph) => void;
    /** Der Aufgabentext, damit die KI weiß, worum es geht. */
    taskContent?: string;
    discipline: string;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    settings?: AppSettings;
}

export function useGraphAiRefinement(p: UseGraphAiRefinementParams) {
    const { graph, setGraph, taskContent, discipline, appMode, settings } = p;

    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatEintrag[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const [initialUserNotes, setInitialUserNotes] = useState('');
    const [showAdvancedInspector, setShowAdvancedInspector] = useState(false);

    const handleRefineGraph = async () => {
        if (!chatInput.trim() || isRefining) return;

        const instruction = chatInput.trim();
        setChatInput('');
        setIsRefining(true);
        setChatHistory(prev => [...prev, { role: 'user', text: instruction }]);

        try {
            const responseData = await performAIRequest(
                'refine-graph',
                {
                    taskText: taskContent || '',
                    currentGraph: graph,
                    userInstruction: instruction,
                    discipline
                },
                appMode,
                settings!
            );

            const { graph: updatedGraph, explanation } = extractRefinementResponse(responseData);

            if (!isUsableGraph(updatedGraph)) {
                throw new Error('Ungültiges Graphen-Format von KI zurückgegeben.');
            }

            // Schuetzt die Punktvergabe der Lehrkraft vor der Verfeinerung —
            // Begruendung in lib/grading/graph-intake.ts.
            setGraph(mergeRefinedGraph(graph, updatedGraph));
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                text: explanation || `Graph erfolgreich verfeinert!\nEs wurden ${updatedGraph.variables.length} Variablen deklariert.`
            }]);
        } catch (err) {
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                text: `Fehler: ${toErrorMessage(err, 'Verbindungsfehler')}`,
                hasError: true
            }]);
        } finally {
            setIsRefining(false);
        }
    };

    return {
        chatInput, setChatInput,
        chatHistory, setChatHistory,
        isRefining,
        initialUserNotes, setInitialUserNotes,
        showAdvancedInspector, setShowAdvancedInspector,
        handleRefineGraph
    };
}
