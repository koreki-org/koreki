import { Task } from '../types';

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
