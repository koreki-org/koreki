import { useMemo, useRef, useEffect } from 'react';
import type { Task } from '@/types';
import {
    deriveTaskSections,
    findEligibleTaskIndices,
    areAllSuggestedGraphsVerified,
    sumMaxPoints
} from '@/lib/model-solution-derivations';

/**
 * Was sich aus der Musterlösung ableiten lässt — an einer Stelle.
 * 🧮
 *
 * Die Berechnungen selbst stehen als reine Funktionen in
 * `lib/model-solution-derivations.ts`; hier liegt nur die Erinnerung daran
 * (`useMemo`) und die Nachführung der beiden Referenzen.
 *
 * Zusammengefasst, weil `ModelSolutionCard` sonst acht Hook-Aufrufe allein für
 * Ableitungen braucht — bei einer Grenze von zehn für die ganze Komponente.
 */

export interface UseModelSolutionDerivationsParams {
    modelSolution: string;
    tasksLayout: Task[];
    /** Ohne Aufgabenstruktur gibt es nichts aufzuteilen. */
    hasTaskStructure: boolean;
}

export function useModelSolutionDerivations(p: UseModelSolutionDerivationsParams) {
    const { modelSolution, tasksLayout, hasTaskStructure } = p;

    const taskSections = useMemo(
        () => (hasTaskStructure ? deriveTaskSections(modelSolution, tasksLayout) : []),
        [modelSolution, tasksLayout, hasTaskStructure]
    );

    const eligibleTaskIndices = useMemo(() => findEligibleTaskIndices(tasksLayout), [tasksLayout]);
    const allSuggestedGraphsVerified = useMemo(() => areAllSuggestedGraphsVerified(tasksLayout), [tasksLayout]);
    const totalMaxPoints = useMemo(() => sumMaxPoints(tasksLayout), [tasksLayout]);

    /**
     * Referenzen auf den jeweils AKTUELLEN Stand.
     *
     * Der Autopilot läuft minutenlang asynchron. Läse er die Werte aus der
     * Renderphase, arbeitete er mitten im Lauf mit einem veralteten Stand — und
     * überschriebe Aufgaben, die er selbst gerade erzeugt hat.
     */
    const tasksLayoutRef = useRef(tasksLayout);
    useEffect(() => {
        tasksLayoutRef.current = tasksLayout;
    }, [tasksLayout]);

    const taskSectionsRef = useRef(taskSections);
    useEffect(() => {
        taskSectionsRef.current = taskSections;
    }, [taskSections]);

    return {
        taskSections,
        eligibleTaskIndices,
        allSuggestedGraphsVerified,
        totalMaxPoints,
        tasksLayoutRef,
        taskSectionsRef
    };
}
