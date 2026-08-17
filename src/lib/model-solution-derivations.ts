import type { Task, CustomSkillDefinition } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import { splitTextByTasks } from '@/lib/task-utils';

/**
 * Ableitungen aus der Musterlösung.
 * 🧮
 *
 * Alles hier ist eine reine Funktion über `tasksLayout` — kein Zustand, keine
 * Seiteneffekte. Nach architectural-vision §6.1 gehören Berechnungen nach
 * `lib/`, damit sie einzeln prüfbar sind; die Erinnerung daran
 * (`useMemo`) bleibt beim Hook.
 */

/**
 * Der Vorgabe-Graph für eine Engine.
 *
 * Für einen eigenen Skill ist es dessen hinterlegter Graph, für VLSM eine
 * Netzwerk-Vorlage mit drei Variablen. Alles andere hat keinen Vorgabe-Graphen
 * — dort entsteht er erst durch die KI.
 */
export function buildDefaultGradingGraph(
    skillId: string,
    originalIdx: number,
    customSkills?: Record<string, CustomSkillDefinition>
): GradingGraph | undefined {
    if (skillId?.startsWith('custom-skill-')) {
        return customSkills?.[skillId]?.gradingGraph;
    }

    if (skillId === 'skill-calc-vlsm' || skillId === 'vlsm') {
        return {
            taskId: `vlsm-task-${originalIdx}-${Date.now()}`,
            discipline: 'computer-science-networking',
            variables: [
                { id: 'subnetA_hosts', type: 'input', defaultValue: 50, validationType: 'exact', maxPoints: 0 },
                { id: 'subnetA_netId', type: 'input', defaultValue: '192.168.1.0', validationType: 'exact', maxPoints: 0 },
                { id: 'subnetA_mask', type: 'formula', expression: 'network.calculateMask(subnetA_hosts)', validationType: 'exact', maxPoints: 1 }
            ]
        };
    }

    return undefined;
}

/**
 * Den Text der Musterlösung den Aufgaben zuordnen.
 *
 * Hat die KI den Text bereits aufgeteilt, gilt ihre Aufteilung. Der Rückfall
 * auf die Trennung per Muster greift nur, wenn KEINE Aufgabe Inhalt trägt —
 * eine teilweise Aufteilung würde sonst zur Hälfte überschrieben.
 */
export function deriveTaskSections(modelSolution: string, tasksLayout: Task[]): string[] {
    const hasPartitionedContent = tasksLayout.some(t => t.content && t.content.trim().length > 0);
    if (hasPartitionedContent) {
        return tasksLayout.map(t => t.content || '');
    }
    return splitTextByTasks(modelSolution, tasksLayout);
}

/**
 * Aufgaben, für die der Autopilot etwas zu tun hat: vorgeschlagen, aber noch
 * ohne Graph und ohne Rechenziel.
 */
export function findEligibleTaskIndices(tasksLayout: Task[]): number[] {
    return tasksLayout
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => t.suggestGraph && !t.gradingGraph && !t.targetGoal)
        .map(({ idx }) => idx);
}

/**
 * Sind alle vorgeschlagenen Engines fertig und geprüft?
 *
 * Ohne Vorschläge ist die Antwort `false`, nicht `true`: Es gibt dann nichts
 * zu bestätigen, und ein „alles geprüft" wäre eine falsche Zusicherung.
 *
 * Ein Rechenziel gilt als geprüft, sobald es extrahiert ist — anders als der
 * Graph durchläuft es keine Simulation.
 */
export function areAllSuggestedGraphsVerified(tasksLayout: Task[]): boolean {
    const suggestedTasks = tasksLayout.filter(t => t.suggestGraph);
    if (suggestedTasks.length === 0) return false;

    return suggestedTasks.every(t => {
        const hasValidGraph = t.gradingGraph && (t.gradingGraph.validation?.isValid ?? true);
        return hasValidGraph || !!t.targetGoal;
    });
}

/** Summe der erreichbaren Punkte über alle Aufgaben. */
export function sumMaxPoints(tasksLayout: Task[]): number {
    return tasksLayout.reduce((sum, t) => sum + Number(t.maxPoints || 0), 0);
}
