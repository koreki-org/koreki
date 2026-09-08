import React from 'react';
import { AppSettings, Task } from '../types';
import { performAIRequest } from '../lib/ai/ai-orchestrator';

/**
 * Zustand der KI-Zweitmeinung.
 * 🧠
 *
 * Am 08.09.2026 aus `BatchTaskAnalysisCard` herausgeloest, zusammen mit dem
 * Erfahrungsschatz-Teil (`useTaskReviewActions`). Beide muessen genau EINMAL
 * oberhalb der Aufgabenliste aufgerufen werden, damit die Zelle je Aufgabe eine
 * duenne Komponente bleiben kann.
 *
 * Bewusst ein eigener Hook und nicht Teil von `useTaskReviewActions`: Die
 * Zweitmeinung teilt mit dem Anlernen des Erfahrungsschatzes keinen Zustand —
 * sie liest nur dieselbe Aufgabe. Zusammen waeren es 332 Zeilen gegen eine
 * Grenze von 300.
 */

/** Die Aufgabe, zu der gerade eine Zweitmeinung eingeholt wird. */
export interface ZweitmeinungsAufgabe {
    name: string;
    studentText: string;
    maxPoints: number;
    currentPoints: number;
    currentFeedback: string;
}

interface SecondOpinionParams {
    idx: number;
    settings?: AppSettings;
    tasksLayout: Task[];
    /** `UNSET` ist kein Betriebsmodus, den der Orchestrator kennt — dann `undefined`. */
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    handleReviewPointAndFeedbackChange?: (idx: number, name: string, pts: number, fb: string) => void;
}

export function useSecondOpinion({
    idx,
    settings,
    tasksLayout,
    appMode,
    handleReviewPointChange,
    handleReviewFeedbackChange,
    handleReviewPointAndFeedbackChange
}: SecondOpinionParams) {
    const [showSecondOpinionDrawer, setShowSecondOpinionDrawer] = React.useState(false);
    const [activeDoubleCheckTask, setActiveDoubleCheckTask] = React.useState<ZweitmeinungsAufgabe | null>(null);

    const handleApplySecondOpinion = (points: number, feedback: string) => {
        if (!activeDoubleCheckTask) return;
        if (handleReviewPointAndFeedbackChange) {
            handleReviewPointAndFeedbackChange(idx, activeDoubleCheckTask.name, points, feedback);
        } else {
            handleReviewPointChange(idx, activeDoubleCheckTask.name, points);
            handleReviewFeedbackChange(idx, activeDoubleCheckTask.name, feedback);
        }
    };

    const handleSubmitSecondOpinion = async (doubt: string, chatHistory?: unknown[]) => {
        if (!activeDoubleCheckTask) return;
        const sIdx = tasksLayout.findIndex(t => t.name === activeDoubleCheckTask.name);
        /*
         * FUND 08.09.2026: `instructions` und `sampleSolution` gibt es auf `Task`
         * nicht, und NICHTS im Baum schreibt sie je auf einen Layout-Eintrag. Die
         * Zweitmeinung sendet also seit jeher leere Werte, und der Prompt-Baukasten
         * setzt dafuer "Keine Angabe" ein.
         *
         * Sichtbar wurde das erst beim Umzug hierher: In der Komponente stand
         * `tasksLayout: any[]`, und ein `any` zeigt keine fehlenden Felder an.
         *
         * Das Verhalten bleibt bewusst unveraendert — welches Feld gemeint ist
         * (vermutlich `content`), ist eine fachliche Entscheidung und gehoert nicht
         * in einen Umbau.
         */
        const eintrag = sIdx !== -1
            ? (tasksLayout[sIdx] as Task & { instructions?: string; sampleSolution?: string })
            : undefined;

        return await performAIRequest(
            'second-opinion',
            {
                taskName: activeDoubleCheckTask.name,
                studentText: activeDoubleCheckTask.studentText,
                currentPoints: activeDoubleCheckTask.currentPoints,
                maxPoints: activeDoubleCheckTask.maxPoints,
                currentFeedback: activeDoubleCheckTask.currentFeedback,
                teacherDoubt: doubt,
                taskInstructions: eintrag?.instructions || '',
                sampleSolution: eintrag?.sampleSolution || '',
                chatHistory
            },
            appMode,
            settings || ({} as AppSettings)
        );
    };

    return {
        showSecondOpinionDrawer, setShowSecondOpinionDrawer,
        activeDoubleCheckTask, setActiveDoubleCheckTask,
        handleApplySecondOpinion, handleSubmitSecondOpinion
    };
}
