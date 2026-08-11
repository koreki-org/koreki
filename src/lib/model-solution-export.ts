import { Task } from '../types';
import { AppSettings } from '../types';

/**
 * Export der Musterlösung als `.koreki`-Datei.
 * 📦
 *
 * Ausgelagert aus ModelSolutionCard: Nutzlast und Dateiname sind reine
 * Datenumformung ohne React-Bezug. In der Komponente waren sie nur über das
 * Rendern der gesamten Karte erreichbar und damit praktisch ungetestet —
 * dabei sind es genau die beiden Dinge, die still kaputtgehen können: das
 * Format der Datei und die Versionsangabe, an der ein späterer Import hängt.
 */

/** Formatversion der Exportdatei. Ein Import muss sich darauf verlassen können. */
export const MODEL_SOLUTION_EXPORT_VERSION = '2.0';

export interface ModelSolutionExportInput {
    modelSolution: string;
    modelSolutionContext?: string;
    tasksLayout: Task[];
    settings?: AppSettings;
}

export interface ModelSolutionExportPayload {
    version: string;
    modelSolution: string;
    modelSolutionContext: string;
    tasksLayout: Task[];
    timestamp: string;
    metadata: {
        activeProfileId?: string;
        activeAiProfileId?: string;
    };
}

/**
 * Baut die Nutzlast der Exportdatei.
 *
 * `now` ist injizierbar, damit der Zeitstempel testbar bleibt.
 */
export function buildModelSolutionExport(
    input: ModelSolutionExportInput,
    now: Date = new Date()
): ModelSolutionExportPayload {
    return {
        version: MODEL_SOLUTION_EXPORT_VERSION,
        modelSolution: input.modelSolution,
        modelSolutionContext: input.modelSolutionContext ?? '',
        tasksLayout: input.tasksLayout,
        timestamp: now.toISOString(),
        metadata: {
            activeProfileId: input.settings?.activePromptProfileId,
            activeAiProfileId: input.settings?.activeAiProfileId
        }
    };
}

/**
 * Dateiname nach dem Muster `koreki-ml-JJJJ-MM-TT_hhmm.koreki`.
 *
 * Bewusst Ortszeit, nicht UTC: die Lehrkraft ordnet die Datei nach ihrem
 * eigenen Arbeitstag zu, nicht nach einer Zeitzone im Zeitstempel.
 */
export function buildModelSolutionExportFilename(now: Date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());

    return `koreki-ml-${yyyy}-${mm}-${dd}_${hh}${min}.koreki`;
}

/** Serialisiert die Nutzlast so, wie sie in die Datei geschrieben wird. */
export function serializeModelSolutionExport(
    input: ModelSolutionExportInput,
    now: Date = new Date()
): string {
    return JSON.stringify(buildModelSolutionExport(input, now), null, 2);
}
