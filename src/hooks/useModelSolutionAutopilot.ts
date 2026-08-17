import { useState, useCallback } from 'react';
import type { Task, AppSettings, CustomSkillDefinition } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import type { TargetGoal } from '@/lib/grading/calc-trace-types';
import { promisePool } from '@/lib/ai/promise-pool';
import { buildAutoSkillName } from '@/lib/custom-skill-id';
import { persistGeneratedSkill } from '@/lib/skills/skill-persistence';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Sammelerzeugung von Bewertungs-Engines für alle Aufgaben.
 * 🤖
 *
 * Der Lehrer startet den Autopiloten einmal, und Koreki erzeugt für jede
 * geeignete Aufgabe entweder einen Bewertungsgraphen (VLSM) oder ein
 * Rechenziel. Jede Aufgabe wird EINZELN abgearbeitet (`promisePool` mit
 * Nebenläufigkeit 1) und meldet ihren Zustand getrennt — ein Fehlschlag bei
 * Aufgabe 3 darf Aufgabe 4 nicht verhindern.
 *
 * Stand mitsamt Zustand in `ModelSolutionCard`. Nach architectural-vision §6.4
 * dient eine Komponente der Darstellung; dieser Ablauf ist Zustandsführung mit
 * Netzaufrufen und gehört in einen Hook.
 */

export type AutopilotZustand = 'waiting' | 'generating' | 'success' | 'error';

export interface AutopilotConfig {
    discipline: 'standard' | 'vlsm';
    disablePoints: boolean;
}

export interface UseModelSolutionAutopilotParams {
    /** Aufgaben, für die eine Engine erzeugt werden kann. */
    eligibleTaskIndices: number[];
    /**
     * Referenzen statt Werte: Der Lauf ist asynchron und dauert Minuten. Ein
     * eingefrorener Stand aus der Renderphase wäre in der Schleife längst
     * veraltet.
     */
    tasksLayoutRef: React.MutableRefObject<Task[]>;
    taskSectionsRef: React.MutableRefObject<string[]>;
    settings?: AppSettings;
    onTasksChange?: (updater: (prev: Task[]) => Task[]) => void;
    onGenerateGraph?: (idx: number, content: string, note: string, discipline: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (idx: number, content: string, note: string) => Promise<TargetGoal | null>;
}

export function useModelSolutionAutopilot(p: UseModelSolutionAutopilotParams) {
    const { eligibleTaskIndices, tasksLayoutRef, taskSectionsRef, settings,
        onTasksChange, onGenerateGraph, onGenerateCalcTrace } = p;

    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [batchStatus, setBatchStatus] = useState<Record<number, AutopilotZustand>>({});

    const setzeZustand = useCallback((idx: number, zustand: AutopilotZustand) => {
        setBatchStatus(prev => ({ ...prev, [idx]: zustand }));
    }, []);

    /** Trägt einen erzeugten Graphen als eigenen Skill ein. */
    const persistGraphAsSkill = useCallback((name: string, graph: GradingGraph, taskIdx: number) => {
        const neuerSkill: CustomSkillDefinition = {
            id: '',
            name,
            category: 'graph-skills',
            description: `Automatisch generierter Graph für ${name}.`,
            promptSnippet: `KORREKTUR-DIREKTIVE FÜR GRAPH-BASIERTE BEWERTUNG:\nNutze den definierten Grading Graph zur mathematischen Prüfung und Folgefehler-Kompensation.`,
            isCustom: true,
            isGraphBased: true,
            gradingGraph: graph
        };

        return persistGeneratedSkill({
            name,
            skill: neuerSkill,
            taskIdx,
            currentTask: tasksLayoutRef.current[taskIdx],
            settings,
            updateTaskLayout: task => ({ ...task, gradingGraph: graph }),
            onTasksChange
        });
    }, [tasksLayoutRef, settings, onTasksChange]);

    const setzeAufgabenTyp = useCallback((idx: number, aenderung: Partial<Task>) => {
        onTasksChange?.(prevTasks => {
            const updated = [...prevTasks];
            if (updated[idx]) updated[idx] = { ...updated[idx], ...aenderung };
            return updated;
        });
    }, [onTasksChange]);

    /** Ein Bewertungsgraph für eine Netzwerk-Aufgabe (VLSM). */
    const erzeugeGraph = useCallback(async (idx: number, content: string, config: AutopilotConfig, skillName: string) => {
        if (!onGenerateGraph) return false;

        const mappedDiscipline = 'skill-calc-vlsm';
        setzeAufgabenTyp(idx, { taskType: mappedDiscipline });

        const note = `SPEZIFIKATION: Bitte erstelle einen Graphen für ein Netzwerk-Plugin (VLSM). Die Bewertung soll ${config.disablePoints ? 'HYBRID (disablePoints = true)' : 'STRENG (disablePoints = false)'} sein.`;
        const generatedGraph = await onGenerateGraph(idx, content, note, mappedDiscipline);
        if (!generatedGraph) return false;

        generatedGraph.disablePoints = config.disablePoints;
        await persistGraphAsSkill(skillName, generatedGraph, idx);
        return true;
    }, [onGenerateGraph, setzeAufgabenTyp, persistGraphAsSkill]);

    /** Ein Rechenziel für eine MINT-Aufgabe. */
    const erzeugeRechenziel = useCallback(async (idx: number, content: string) => {
        if (!onGenerateCalcTrace) return false;

        const note = 'SPEZIFIKATION: Bitte extrahiere das Endziel und den Erwartungshorizont (TargetGoal).';
        const generatedGoal = await onGenerateCalcTrace(idx, content, note);
        if (!generatedGoal) return false;

        // `calc-trace` bleibt die Kennung fuer Mathe-Aufgaben.
        setzeAufgabenTyp(idx, { taskType: 'calc-trace', targetGoal: generatedGoal });
        return true;
    }, [onGenerateCalcTrace, setzeAufgabenTyp]);

    const handleStartAutoPilot = useCallback(async (configs: Record<number, AutopilotConfig>) => {
        if (eligibleTaskIndices.length === 0 || isBatchGenerating) return;

        setIsBatchGenerating(true);
        setBatchStatus(Object.fromEntries(eligibleTaskIndices.map(idx => [idx, 'waiting' as AutopilotZustand])));

        try {
            // Nebenlaeufigkeit 1: die Erzeugung ist teuer, und ein Anbieter, der
            // fuenf Anfragen gleichzeitig bekommt, drosselt.
            await promisePool(eligibleTaskIndices, 1, async (idx) => {
                try {
                    setzeZustand(idx, 'generating');

                    const task = tasksLayoutRef.current[idx];
                    const content = taskSectionsRef.current[idx] || '';

                    // Aus zehn Zeichen laesst sich keine Bewertung ableiten.
                    if (content.trim().length <= 10) {
                        setzeZustand(idx, 'error');
                        return;
                    }

                    const config = configs[idx] || { discipline: 'standard', disablePoints: true };
                    // Der Name muss zum Praefix-Vergleich in resolveCustomSkillId
                    // passen — beide liegen deshalb in lib/custom-skill-id.ts.
                    const skillName = buildAutoSkillName(task, idx);

                    const erfolg = config.discipline === 'vlsm'
                        ? await erzeugeGraph(idx, content, config, skillName)
                        : await erzeugeRechenziel(idx, content);

                    setzeZustand(idx, erfolg ? 'success' : 'error');
                } catch (taskErr) {
                    console.error(`Fehler bei der automatischen Generierung für Aufgabe Index ${idx}:`, toErrorMessage(taskErr));
                    setzeZustand(idx, 'error');
                }
            });
        } catch (err) {
            console.error('Fehler im Auto-Pilot Batch-Prozess:', toErrorMessage(err));
        } finally {
            setIsBatchGenerating(false);
        }
    }, [eligibleTaskIndices, isBatchGenerating, tasksLayoutRef, taskSectionsRef,
        setzeZustand, erzeugeGraph, erzeugeRechenziel]);

    return { isBatchGenerating, batchStatus, handleStartAutoPilot, persistGraphAsSkill };
}
