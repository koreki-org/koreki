import { useCallback, useEffect, useRef, useState } from 'react';
import type { BatchFile, Task } from '../types';
import { buildDemoScenario } from '../lib/demo/demoScenario';
import { ladeHandschriftArbeiten, type DemoArt } from '../lib/demo/demoHandschrift';
import { logger } from '@/lib/logger';
import { meldeFehler } from '@/lib/notify';
import { askConfirmation } from '@/lib/confirm-dialog';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

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
    /** Welche Fassung zuletzt geladen wurde — der Hinweis erklaert jeweils den naechsten Schritt. */
    demoArt: DemoArt;
    /** Laedt das Demo-Szenario in die Oberflaeche und blendet den Hinweis ein. */
    loadDemoData: (art?: DemoArt) => Promise<void>;
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
    const [demoArt, setDemoArt] = useState<DemoArt>('getippt');
    const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
    }, []);

    const dismissDemoHint = useCallback(() => {
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        setShowDemoHint(false);
    }, []);

    /**
     * Die Demo ERSETZT alles — Musterloesung, Aufgaben, Arbeiten. Der Knopf dafuer
     * sitzt in der Kopfzeile, einen Finger neben den Export-Knoepfen, und war bis
     * zum 09.11.2026 ungesichert: ein Fehlklick mitten in einer Korrektur loeschte
     * die Arbeit wortlos, denn Schuelerdaten leben nur im Arbeitsspeicher.
     *
     * Gefragt wird nur, wenn es etwas zu verlieren gibt — auf einer leeren
     * Oberflaeche ist die Demo genau das, was der Knopf verspricht.
     */
    const loadDemoData = useCallback(async (art: DemoArt = 'getippt') => {
        const hatInhalt = useBatchStore.getState().batchFiles.length > 0
            || !!useDashboardStore.getState().modelSolution;
        if (hatInhalt && !(await askConfirmation({
            title: 'Demo laden',
            message: 'Das Demo-Szenario ersetzt die aktuelle Korrektur vollständig — Musterlösung, Aufgaben und Arbeiten. Fortfahren?'
        }))) return;

        const scenario = buildDemoScenario();
        // Die Blaetter kommen VOR dem Ersetzen: Fehlt eines, bleibt alles, wie es war.
        let arbeiten = scenario.studentBatchFiles;
        if (art === 'handschrift') {
            try {
                arbeiten = await ladeHandschriftArbeiten();
            } catch (err) {
                logger.error('Handschrift-Demo nicht geladen', { message: String(err) });
                meldeFehler('Die Handschrift-Demo konnte nicht geladen werden.');
                return;
            }
        }

        setModelSolution(scenario.modelSolution);
        setModelSolutionContext(scenario.modelSolutionContext);
        setTasksLayout(scenario.tasksLayout);
        setBatchFiles(arbeiten);
        setDemoArt(art);

        setShowDemoHint(true);
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        hintTimeout.current = setTimeout(() => setShowDemoHint(false), DEMO_HINT_DURATION_MS);
    }, [setModelSolution, setModelSolutionContext, setTasksLayout, setBatchFiles]);

    return { showDemoHint, demoArt, loadDemoData, dismissDemoHint };
};
