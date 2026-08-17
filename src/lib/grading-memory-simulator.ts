import type { Task, AppSettings } from '@/types';
import { apiClient } from '@/lib/api-client';

/**
 * Der Schueler-Simulator: fiktive Abgaben zu einer Musterloesung.
 * 🎓
 *
 * Koreki erzeugt daraus Fallbeispiele, an denen die Lehrkraft ihre Bewertung
 * kalibriert. Kein React — deshalb hier und nicht im Hook.
 */

export interface SyntheticAnswer {
    uid: string;
    character: string;
    text: string;
    taskName?: string;
    pointsObtained?: number;
    maxPoints?: number;
    recommendedNotes?: string;
    recommendedFeedback?: string;
}

export interface Calibration {
    taskName: string;
    pointsObtained: number;
    maxPoints: number;
    correctionNotes: string;
    feedback: string;
}

/** Eine Abgabe, wie der Simulator sie liefert. */
export interface SimulatorAnswer {
    character: string;
    text: string;
    taskName?: string;
    pointsObtained?: number;
    maxPoints?: number;
    recommendedNotes?: string;
    recommendedFeedback?: string;
}

/**
 * Den Schueler-Simulator aufrufen — lokal oder ueber den Server.
 *
 * Ollama laeuft im Desktop-Betrieb direkt im Fenster, alles andere geht ueber
 * die Koreki-Route. Das ist der EINZIGE Unterschied zwischen den Betriebsarten
 * an dieser Stelle.
 */
export async function rufeSimulator(p: {
    modelSolution: string;
    tasksLayout: Task[];
    selectedTasks: string[];
    settings?: AppSettings;
}): Promise<{ studentAnswers?: SimulatorAnswer[] }> {
    const { modelSolution, tasksLayout, selectedTasks, settings } = p;

    if (settings?.provider === 'ollama') {
        const { executeOllamaRequest } = await import('@/lib/ai/ollama-logic');
        return await executeOllamaRequest(
            'student-simulator',
            { modelSolution, tasksLayout, selectedTasks },
            settings
        );
    }

    const response = await apiClient.post('/api/user/grading-memories/generate', {
        modelSolution,
        tasksLayout,
        selectedTasks,
        settings: settings || { provider: 'mistral' }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Die KI konnte die fiktiven Schülerabgaben nicht generieren.');
    }

    return await response.json();
}
