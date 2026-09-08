import { BatchFile, Task } from '../types';

/**
 * Der Text, den der Schueler zu EINER Aufgabe abgegeben hat.
 * 🔎
 *
 * Die Rangfolge ist nicht beliebig:
 *
 * 1. Was im KI-Ergebnis steht, gewinnt — dort liegt der Text, den die Lehrkraft
 *    in der OCR-Pruefung moeglicherweise KORRIGIERT hat.
 * 2. Erst wenn dort nichts steht, greift der urspruengliche OCR-Abschnitt aus
 *    `studentSections`.
 *
 * Am 08.09.2026 hierher gezogen. Vorher stand diese Logik an drei Stellen:
 * zweimal wortgleich in `BatchTaskAnalysisCard` (Anlernen und Zweitmeinung) und
 * ein drittes Mal in `BatchSolutionPanel` — dort ausgeschrieben mit denselben
 * zwei Prioritaeten. Aufgefallen ist es erst, als beide Spalten fuer das
 * gemeinsame Raster in Zellen zerlegt wurden.
 *
 * Reine Funktion und deshalb in `lib/`, nicht in einer Komponente
 * (architectural-vision §6.1).
 */
export function schuelerAntwort(
    item: BatchFile,
    task: Task,
    tasksLayout: Task[],
    studentSections: string[]
): string {
    if (item.status === 'done' && item.result) {
        const aiTask = item.result.tasks?.find(t =>
            t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
        if (aiTask?.content) return aiTask.content;
    }
    const sIdx = tasksLayout.findIndex(t => t.name === task.name);
    return sIdx !== -1 ? (studentSections[sIdx] || '') : '';
}
