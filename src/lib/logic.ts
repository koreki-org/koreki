import { diffWords, type Change } from 'diff';
import type { TargetGoal, CalcTraceResult, CalcTraceTemplate } from './grading/calc-trace-types';
import type { GradingGraph, GradingResult } from './grading/types';

/**
 * Compares two strings and returns an array of diff objects.
 */
export function compareTexts(modelSolution: string, studentText: string): Change[] {
    if (!modelSolution || !studentText) return [];

    const cleanModel = modelSolution.trim();
    const cleanStudent = studentText.trim();

    return diffWords(cleanModel, cleanStudent);
}

/**
 * Calculates a grade suggestion based on a linear key:
 * Einschätzung = 6 - 5 * (matchPercentage / 100)
 */
export function calculateGrade(matchPercentage: number): string {
    const p = Math.max(0, Math.min(100, matchPercentage));
    const grade = 6 - 5 * (p / 100);
    return grade.toFixed(1).replace('.', ',');
}

/**
 * Recalculates the total percentage from a task list.
 */
export interface Task {
    pointsObtained?: number | string;
    maxPoints?: number | string;
    name?: string;
    feedback?: string;
    content?: string;
    confidence?: number; // 0-1 or 0-100
    taskType?: string;
    gradingGraph?: GradingGraph;
    gradingResult?: GradingResult;
    targetGoal?: TargetGoal;
    calcTraceResult?: CalcTraceResult;
    /** Musterrechnung — Vorlage aus dem Skill-Editor oder ein TargetGoal. */
    calcTrace?: CalcTraceTemplate | TargetGoal;
    suggestGraph?: boolean;
    predictedPluginDomain?: string | null;
    sandboxBypassed?: boolean;
}

export function calculatePercentageFromTasks(tasks: Task[]): number {
    if (!tasks || !Array.isArray(tasks)) return 0;
    let obtained = 0;
    let max = 0;
    tasks.forEach(t => {
        obtained += Number(t.pointsObtained || 0);
        max += Number(t.maxPoints || 0);
    });
    return max > 0 ? (obtained / max) * 100 : 0;
}

/**
 * Simple heuristic to estimate match percentage from diff.
 */
export function getMatchPercentage(diffParts: Change[]): number {
    let matched = 0;
    let total = 0;

    diffParts.forEach(part => {
        if (!part.added && !part.removed) {
            matched += part.value.length;
        }
        if (!part.added) {
            total += part.value.length;
        }
    });

    return total > 0 ? (matched / total) * 100 : 0;
}

/**
 * Re-indexes a list of batch files to maintain "Schüler #N" naming convention.
 *
 * Bewusst generisch: die Funktion braucht nur `name` und gibt denselben Typ
 * zurueck, den sie bekommen hat. Ein fester `BatchFile[]` waere hier ein
 * Ringschluss — `BatchFile` liegt in types/index.ts, das seinerseits `Task`
 * aus dieser Datei bezieht.
 */
export function reindexBatchFiles<T extends { name?: string }>(files: T[]): T[] {
    if (!files || !Array.isArray(files)) return [];
    return files.map((file, idx) => ({
        ...file,
        name: `Schüler #${idx + 1}`
    }));
}

/**
 * Generates new batch items from a split operation.
 */
export function generateSplitBatchItems<T extends { name?: string; originalName?: string }>(
    /** Darf null sein — der Rumpf faengt das ab und liefert eine leere Liste. */
    originalFile: T | null,
    splits: { firstName?: string, lastName?: string, name?: string, pageCount: number }[],
    baseIdx: number
) {
    if (!originalFile || !splits) return [];
    
    let currentStartPage = 1;
    return splits.map((s, idx) => {
        const defaultName = `Schüler #${baseIdx + idx + 1}`;
        
        const fName = s.firstName?.trim() || '';
        const lName = s.lastName?.trim() || '';
        const combined = `${fName} ${lName}`.trim() || s.name || '';
        const realNameProvided = combined && !/^Schüler #\d+$/.test(combined);

        const item = {
            ...originalFile,
            name: defaultName,
            originalName: realNameProvided ? combined : undefined,
            studentFirstName: fName || undefined,
            studentLastName: lName || undefined,
            status: 'pending',
            result: null,
            error: null,
            fileText: undefined,
            tasks: undefined,
            grade: undefined,
            pageCount: s.pageCount,
            pageRange: [currentStartPage, currentStartPage + s.pageCount - 1] as [number, number],
            ocrDone: false,
            selected: true,
            splitInfo: {
                originalIdx: baseIdx,
                originalName: originalFile.name,
                sourceFileName: originalFile.originalName
            }
        };
        currentStartPage += s.pageCount;
        return item;
    });
}
