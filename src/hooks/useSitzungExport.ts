import { exportSessionToJson } from '@/lib/utils';
import type { BatchFile, Task } from '@/types';

interface SitzungExportQuellen {
    batchFiles: BatchFile[];
    modelSolution: string;
    tasksLayout: Task[];
    activePromptProfileId?: string;
    activeAiProfileId?: string;
    sessionProfileName?: string;
    sessionAiProfileName?: string;
    activeGradingMemoryName?: string;
}

/**
 * Die Sitzung als .koreki-Datei ausgeben.
 *
 * `alsSchuelerloesung` unterscheidet die beiden Schaltflaechen — sonst sind sie
 * identisch. Sie standen bis 18.08.2026 zweimal ausgeschrieben da, 20 Zeilen
 * wortgleich: wer eine der uebergebenen Einstellungen ergaenzt haette, haette
 * sie in genau einem der beiden Exporte ergaenzt, ohne dass etwas aufgefallen
 * waere.
 *
 * Seit dem 21.11.2026 ein eigener Hook, weil auch „Neue Korrektur“ speichert
 * (Speichern / Nicht speichern / Abbrechen) — dieselbe Datei wie „Korrektur
 * exportieren“, kein zweites Format.
 *
 * Rueckgabe: ob gespeichert wurde. Auf dem Desktop kann die Lehrkraft den
 * Speichern-Dialog abbrechen; dann darf nichts verworfen werden.
 */
export function useSitzungExport(q: SitzungExportQuellen) {
    return (alsSchuelerloesung: boolean): Promise<boolean> => {
        let cases = undefined;
        try {
            const stored = localStorage.getItem('koreki_active_grading_memory_cases');
            if (stored) cases = JSON.parse(stored);
        } catch {
            // Kein lesbarer Erfahrungsschatz — der Export laeuft ohne.
        }
        return exportSessionToJson(
            q.batchFiles,
            q.modelSolution,
            q.tasksLayout,
            {
                activeProfileId: q.activePromptProfileId,
                activeProfileName: q.sessionProfileName,
                activeAiProfileId: q.activeAiProfileId,
                activeAiProfileName: q.sessionAiProfileName,
                activeGradingMemoryId: localStorage.getItem('koreki_active_grading_memory_id') || undefined,
                activeGradingMemoryName: q.activeGradingMemoryName,
                activeGradingMemoryCases: cases
            },
            alsSchuelerloesung
        );
    };
}
