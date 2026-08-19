import { diffWords, type Change } from 'diff';
import { alsModellzahl } from './zahlen';
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
export function calculateGrade(matchPercentage: number | null | undefined): string {
    // Ohne brauchbare Prozentzahl gibt es KEINE Note.
    //
    // GEFUNDEN BEIM LESEN, 19.08.2026: Der Parameter war als `number`
    // deklariert, die Aufrufstelle liest ihn aber aus einer `any`-Antwort —
    // der Compiler sah davon nichts. Und die Rechnung gab dann Auskunft, wo
    // keine war:
    //
    //     calculateGrade(undefined) -> "NaN"   (steht so im Notenfeld)
    //     calculateGrade(null)      -> "6,0"   (die SCHLECHTESTE Note)
    //
    // Der zweite Fall ist der gefaehrliche: `Math.min(100, null)` ist 0, und
    // aus "keine Angabe" wird lautlos "durchgefallen" — eine plausibel
    // aussehende Falschaussage ueber die Arbeit eines Schuelers.
    //
    // `'-'` ist der Platzhalter, den die Auswertung ohnehin schon kennt:
    // `analytics-logic` schliesst ihn per `isNaN` aus dem Notenschnitt aus,
    // und der Excel-Export schreibt ihn als Strich.
    if (!Number.isFinite(matchPercentage)) return '-';

    const p = Math.max(0, Math.min(100, matchPercentage as number));
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

    // Zaehler und Nenner umfassen DIESELBEN Aufgaben.
    //
    // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand zweimal `Number(...)`. Eine
    // Maximalpunktzahl, die sich nicht deuten laesst, machte den Nenner zu NaN,
    // die Bedingung `max > 0` falsch, und der Rueckgabewert 0 wurde ueber
    // `calculateGrade` zur Note 6,0 — waehrend die Lehrkraft gerade Punkte
    // korrigierte.
    //
    // Dieselbe Regel gilt seit dem 18.08.2026 in `parseCorrectionResult`; hier
    // fehlte sie. Deshalb wohnt `alsModellzahl` jetzt in `lib/zahlen` statt in
    // der KI-Abbildung: eine Regel, eine Stelle.
    //
    // Eine Aufgabe ohne deutbares Maximum laesst sich nicht anteilig
    // verrechnen und bleibt aus BEIDEN Summen heraus — sonst zaehlten ihre
    // Punkte mit, ihr Maximum aber nicht, und das Ergebnis stiege ueber 100 %.
    let obtained = 0;
    let max = 0;
    tasks.forEach(t => {
        const maximum = alsModellzahl(t.maxPoints, NaN);
        if (!Number.isFinite(maximum)) return;
        max += maximum;
        obtained += alsModellzahl(t.pointsObtained, 0);
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
