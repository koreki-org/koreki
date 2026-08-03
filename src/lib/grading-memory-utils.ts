import { GradingMemoryCase, Task } from '../types';

export function resolveTaskName(
    taskName: string | undefined,
    correctionNotes: string | undefined,
    studentText: string | undefined,
    tasksLayout?: Task[]
): { resolvedTaskName: string | undefined; isHighConfidence: boolean } {
    let resolvedTaskName = taskName;
    let isHighConfidence = !!taskName;
    
    if (!resolvedTaskName && correctionNotes) {
        const match = correctionNotes.match(/^\[Aufgabe:\s*([^\]]+)\]/);
        if (match) {
            resolvedTaskName = match[1];
            isHighConfidence = true;
        }
    }
    
    if (!resolvedTaskName && tasksLayout && tasksLayout.length > 0) {
        const combinedText = `${studentText || ''} ${correctionNotes || ''}`.toLowerCase();
        const bestTask = tasksLayout.reduce((best, t) => {
            const words = `${t.name} ${t.content || ''}`.toLowerCase().match(/\b[a-z0-9äöüß]{3,}\b/g) || [];
            const score = words.filter(w => combinedText.includes(w)).length;
            return score > best.score ? { task: t, score } : best;
        }, { task: null as any, score: 0 });
        if (bestTask.score > 2) resolvedTaskName = bestTask.task.name;
    }
    
    return { resolvedTaskName, isHighConfidence };
}

/**
 * Normalisiert einen Aufgabennamen fuer den toleranten Vergleich.
 * "Aufgabe 2b)" / "2b" / "AUFGABE 2 B" -> "2b"
 * Punkte bleiben erhalten, damit "1.1" und "11" nicht kollidieren.
 */
export function normalizeTaskName(name: string): string {
    return name
        .toLowerCase()
        .replace(/teilaufgabe|aufgabe|task/g, '')
        .replace(/[^a-z0-9äöüß.]/g, '')
        .replace(/\.+$/, '');
}

/**
 * Bildet einen moeglicherweise abweichend geschriebenen Aufgabennamen auf den
 * kanonischen Namen aus dem Layout ab. Ohne Treffer: undefined statt Raterei.
 */
export function canonicalizeTaskName(name: string | undefined, tasksLayout?: Task[]): string | undefined {
    if (!name || !tasksLayout || tasksLayout.length === 0) return undefined;

    const exact = tasksLayout.find(t => t.name?.toLowerCase() === name.toLowerCase());
    if (exact) return exact.name;

    const normalized = normalizeTaskName(name);
    if (!normalized) return undefined;

    return tasksLayout.find(t => t.name && normalizeTaskName(t.name) === normalized)?.name;
}

export interface TaskCaseGroup {
    taskName: string;
    cases: GradingMemoryCase[];
}

/**
 * Gruppiert Erfahrungsschatz-Faelle nach der Aufgabe, zu der sie gehoeren.
 * Die Gruppen folgen der Reihenfolge des Layouts; Faelle ohne verlaessliche
 * Zuordnung landen gesammelt in `unassigned` statt bei einer falschen Aufgabe.
 */
export function groupCasesByTask(
    cases: GradingMemoryCase[],
    tasksLayout?: Task[]
): { groups: TaskCaseGroup[]; unassigned: GradingMemoryCase[] } {
    const byTask = new Map<string, GradingMemoryCase[]>();
    const unassigned: GradingMemoryCase[] = [];

    cases.forEach(c => {
        const { resolvedTaskName } = resolveTaskName(
            c.taskName,
            c.expectedCorrection?.correctionNotes,
            c.studentText,
            tasksLayout
        );
        const canonical = canonicalizeTaskName(resolvedTaskName, tasksLayout);

        if (!canonical) {
            unassigned.push(c);
            return;
        }
        byTask.set(canonical, [...(byTask.get(canonical) || []), c]);
    });

    const groups = (tasksLayout || [])
        .map(t => t.name)
        .filter((name): name is string => !!name && byTask.has(name))
        .map(name => ({ taskName: name, cases: byTask.get(name) as GradingMemoryCase[] }));

    return { groups, unassigned };
}

export function resolveMaxPoints(
    currentMaxPoints: number | undefined,
    resolvedTaskName: string | undefined,
    tasksLayout?: Task[]
): number | undefined {
    let resolvedMaxPoints = currentMaxPoints;
    if (!resolvedMaxPoints && resolvedTaskName && tasksLayout) {
        const matched = tasksLayout.find(t => t.name?.toLowerCase() === resolvedTaskName.toLowerCase());
        if (matched) resolvedMaxPoints = Number(matched.maxPoints);
    }
    return resolvedMaxPoints;
}
