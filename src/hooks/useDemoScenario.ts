import { useCallback, useEffect, useRef, useState } from 'react';
import type { BatchFile, Task } from '../types';
import { buildDemoScenario } from '../lib/demo/demoScenario';

/** Wie lange der Demo-Hinweis stehen bleibt, bevor er sich selbst ausblendet. */
const DEMO_HINT_DURATION_MS = 8000;

interface UseDemoScenarioParams {
    setModelSolution: (val: string) => void;
    setModelSolutionContext: (val: string) => void;
    setTasksLayout: (val: Task[]) => void;
    setBatchFiles: (val: BatchFile[]) => void;
}

interface UseDemoScenarioResult {
    /** Der Hinweis-Banner ist sichtbar — die Demo wurde gerade geladen. */
    showDemoHint: boolean;
    /** Laedt das Demo-Szenario in die Oberflaeche und blendet den Hinweis ein. */
    loadDemoData: () => void;
    /** Blendet den Hinweis vorzeitig aus (Klick auf Schliessen). */
    dismissDemoHint: () => void;
}

/**
 * Kapselt das Laden des Demo-Szenarios und die Sichtbarkeit seines Hinweis-Banners.
 *
 * Die Szenario-Daten selbst liegen als Pure Function in `lib/demo/demoScenario.ts` —
 * dieser Hook steuert ausschliesslich den Zustand drumherum (siehe architectural-vision
 * Skill, Punkt 6: "Logic in Lib, State in Hook").
 */
export const useDemoScenario = ({
    setModelSolution,
    setModelSolutionContext,
    setTasksLayout,
    setBatchFiles
}: UseDemoScenarioParams): UseDemoScenarioResult => {
    const [showDemoHint, setShowDemoHint] = useState(false);
    const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
    }, []);

    const dismissDemoHint = useCallback(() => {
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        setShowDemoHint(false);
    }, []);

    const loadDemoData = useCallback(() => {
        const scenario = buildDemoScenario();

        setModelSolution(scenario.modelSolution);
        setModelSolutionContext(scenario.modelSolutionContext);
        setTasksLayout(scenario.tasksLayout);
        setBatchFiles(scenario.studentBatchFiles);

        setShowDemoHint(true);
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => setShowDemoHint(false), DEMO_HINT_DURATION_MS);
    }, [setModelSolution, setModelSolutionContext, setTasksLayout, setBatchFiles]);

    return { showDemoHint, loadDemoData, dismissDemoHint };
};
