import { diffWords } from 'diff';

/**
 * Compares two strings and returns an array of diff objects.
 */
export function compareTexts(modelSolution: string, studentText: string): any[] {
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
    gradingGraph?: any;
    gradingResult?: any;
    suggestGraph?: boolean;
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
export function getMatchPercentage(diffParts: any[]): number {
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
 */
export function reindexBatchFiles(files: any[]): any[] {
    if (!files || !Array.isArray(files)) return [];
    return files.map((file, idx) => ({
        ...file,
        name: `Schüler #${idx + 1}`
    }));
}

/**
 * Generates new batch items from a split operation.
 */
export function generateSplitBatchItems(
    originalFile: any,
    splits: { name: string, pageCount: number }[],
    baseIdx: number,
    autoRedact: boolean = false
): any[] {
    if (!originalFile || !splits) return [];
    
    let currentStartPage = 1;
    return splits.map((s, idx) => {
        const item = {
            ...originalFile,
            name: s.name || `Schüler #${baseIdx + idx + 1}`,
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
            autoRedactTop2cm: autoRedact,
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
