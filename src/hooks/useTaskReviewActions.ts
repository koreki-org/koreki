import React from 'react';
import { AppSettings, GradingMemory } from '../types';
import { useAuth } from './useAuth';
import { useGradingMemories } from './useGradingMemories';
import { apiClient } from '../lib/api-client';
import { isDesktopTarget, isLocalInstance } from '../lib/env-context';
import { performAIRequest } from '../lib/ai/ai-orchestrator';
import { toErrorMessage } from '../lib/error-message';
import { meldeErfolg, meldeFehler, meldeHinweis } from '../lib/notify';

/**
 * Anlernen des Erfahrungsschatzes samt vorgeschalteter Anonymisierung.
 * 🧠🛡️
 *
 * Am 08.09.2026 aus `BatchTaskAnalysisCard` herausgeloest. Dort standen zehn
 * `useState` und fuenf Handler direkt in der Komponente — 13 Hook-Aufrufe gegen
 * eine Grenze von 10, und 569 Zeilen gegen 300.
 *
 * Der eigentliche Anlass war ein anderer: Damit sich linke und rechte Spalte je
 * Aufgabe ausrichten koennen, muss ein gemeinsames Raster ueber die Aufgaben
 * laufen statt zweier getrennter Listen. Die Zelle je Aufgabe wird dafuer eine
 * eigene Komponente — und die darf diesen Zustand NICHT mitbringen:
 * `useGradingMemories` ruft eine API auf und hat keinen Cache. Pro Aufgabe eine
 * Instanz waere pro Aufgabe ein Abruf, bei zehn Aufgaben zehn gleiche Anfragen.
 *
 * Deshalb wird dieser Hook genau EINMAL aufgerufen, oberhalb der Aufgaben.
 *
 * Die Zweitmeinung liegt bewusst daneben in `useSecondOpinion`: Sie teilt mit
 * dem Anlernen keinen Zustand, und zusammen waeren es 332 Zeilen gegen 300.
 */

interface AnonymisierungsAuftrag {
    taskName: string;
    originalText: string;
    points: number;
    notes: string;
    maxPoints?: number;
}

interface TaskReviewActionsParams {
    settings?: AppSettings;
}

export function useTaskReviewActions({ settings }: TaskReviewActionsParams) {
    const [savingTaskId, setSavingTaskId] = React.useState<string | null>(null);
    const [targetMemoryId, setTargetMemoryId] = React.useState<string>('');
    const [isPending, setIsPending] = React.useState(false);

    const { userData } = useAuth();
    const { memories, activeMemoryId, refreshMemories } = useGradingMemories(userData);

    const [showAnonymizeDialog, setShowAnonymizeDialog] = React.useState(false);
    const [anonymizing, setAnonymizing] = React.useState(false);
    const [anonymizedText, setAnonymizedText] = React.useState('');
    const [anonymizeError, setAnonymizeError] = React.useState<string | null>(null);
    const [anonymizePayload, setAnonymizePayload] = React.useState<AnonymisierungsAuftrag | null>(null);

    /** `UNSET` ist kein Betriebsmodus, den der Orchestrator kennt. */
    const appMode = userData?.appMode === 'UNSET' ? undefined : userData?.appMode;

    React.useEffect(() => {
        if (activeMemoryId) {
            setTargetMemoryId(activeMemoryId);
        } else if (memories.length > 0) {
            setTargetMemoryId(memories[0].id || '');
        }
    }, [activeMemoryId, memories]);

    /**
     * Gemeinsame Vorpruefung von Anlernen und Anonymisieren.
     *
     * Stand vorher wortgleich in beiden Handlern — der Duplikat-Waechter zaehlt
     * ab sechs Zeilen, und es waren genau neun.
     */
    const fehltEtwas = (text: string, notes: string): boolean => {
        if (!targetMemoryId) {
            meldeHinweis('Bitte wähle zuerst einen Ziel-Erfahrungsschatz aus.');
            return true;
        }
        if (!text.trim()) {
            meldeHinweis('Keine Schülerlösung für diese Aufgabe gefunden.');
            return true;
        }
        if (!notes.trim()) {
            meldeHinweis('Bitte trage zuerst eine Begründung im Feedback-Feld ein.');
            return true;
        }
        return false;
    };

    const handleSaveToMemory = async (taskName: string, studentText: string, points: number, notes: string, maxPoints?: number) => {
        if (fehltEtwas(studentText, notes)) return;

        setIsPending(true);
        try {
            if (isDesktopTarget()) {
                // --- TAURI CLIENT-SIDE LOCAL STORAGE SYNC ---
                let list: GradingMemory[] = []; // Typangabe noetig: sonst leitet TS `never[]` ab
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    try {
                        list = JSON.parse(stored);
                    } catch (e) {
                        console.error('Failed to parse local memories JSON', e);
                    }
                }

                let memIdx = list.findIndex(m => m.id === targetMemoryId);
                if (memIdx === -1) {
                    // Create a placeholder local memory profile if it doesn't exist yet
                    const activeName = localStorage.getItem('koreki_active_grading_memory_name') || 'Importierter Erfahrungsschatz';
                    list.push({ id: targetMemoryId, name: activeName, cases: [] } as GradingMemory);
                    memIdx = list.length - 1;
                }

                const newCase = {
                    id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    studentText: studentText.trim(),
                    taskName: taskName,
                    expectedCorrection: {
                        pointsObtained: points,
                        maxPoints: maxPoints,
                        correctionNotes: notes.trim()
                    }
                };
                list[memIdx].cases = [...(list[memIdx].cases || []), newCase];
                localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));

                // Propagate active cases instantly
                const activeId = localStorage.getItem('koreki_active_grading_memory_id');
                if (activeId === targetMemoryId) {
                    localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(list[memIdx].cases));
                }

                await refreshMemories();
                setSavingTaskId(null);
                meldeErfolg('Erfolgreich in den lokalen Erfahrungsschatz aufgenommen! 🎓');
            } else {
                // --- SAAS VPS CLOUD DB SYNC ---
                const res = await apiClient.post('/api/user/grading-memories/append', {
                    gradingMemoryId: targetMemoryId,
                    studentText: studentText.trim(),
                    taskName: taskName,
                    expectedCorrection: {
                        pointsObtained: points,
                        maxPoints: maxPoints,
                        correctionNotes: notes.trim()
                    }
                });

                if (res.ok) {
                    await refreshMemories();
                    setSavingTaskId(null);
                    meldeErfolg('Erfolgreich in den Erfahrungsschatz aufgenommen! 🎓');
                } else {
                    const errData = await res.json();
                    meldeFehler(errData.message || 'Fehler beim Speichern in den Erfahrungsschatz.');
                }
            }
        } catch (err) {
            console.error('[useTaskReviewActions:Append] Unexpected error:', err);
            meldeFehler('Netzwerkfehler beim Anlernen des Falls.');
        } finally {
            setIsPending(false);
        }
    };

    const handleStartAnonymize = async (taskName: string, originalText: string, points: number, notes: string, maxPoints?: number) => {
        if (fehltEtwas(originalText, notes)) return;

        setIsPending(true);
        setAnonymizeError(null);
        setAnonymizedText('');

        try {
            const response = await performAIRequest('anonymize', { studentText: originalText }, appMode, settings || ({} as AppSettings));

            if (response && response.anonymizedText) {
                const cleanAnon = response.anonymizedText.trim();
                const cleanOrig = originalText.trim();

                if (cleanAnon === cleanOrig) {
                    // Smart Bypass: No anonymization needed! Save directly
                    await handleSaveToMemory(taskName, cleanOrig, points, notes, maxPoints);
                    return;
                }

                // Otherwise: Open simplified preview modal
                setAnonymizePayload({ taskName, originalText, points, notes, maxPoints });
                setAnonymizedText(cleanAnon);
                setAnonymizing(false);
                setShowAnonymizeDialog(true);
            } else {
                throw new Error('Ungültige Antwort von der Anonymisierungs-API.');
            }
        } catch (err) {
            console.error('[Anonymize] Error during stylistic anonymization:', err);
            // On error: show the dialog with error state so user can retry or save original
            setAnonymizePayload({ taskName, originalText, points, notes, maxPoints });
            setAnonymizedText(originalText);
            setAnonymizeError(toErrorMessage(err, 'Fehler bei der stilistischen Anonymisierung. Bitte versuche es erneut.'));
            setAnonymizing(false);
            setShowAnonymizeDialog(true);
        } finally {
            setIsPending(false);
        }
    };

    const handleRetryAnonymize = async () => {
        if (!anonymizePayload) return;
        setAnonymizing(true);
        setAnonymizeError(null);
        setAnonymizedText('');
        try {
            const response = await performAIRequest('anonymize', { studentText: anonymizePayload.originalText }, appMode, settings || ({} as AppSettings));

            if (response && response.anonymizedText) {
                setAnonymizedText(response.anonymizedText);
            } else {
                throw new Error('Ungültige Antwort von der Anonymisierungs-API.');
            }
        } catch (err) {
            console.error('[Anonymize] Error during stylistic anonymization retry:', err);
            setAnonymizeError(toErrorMessage(err, 'Fehler bei der stilistischen Anonymisierung. Bitte versuche es erneut.'));
        } finally {
            setAnonymizing(false);
        }
    };

    const handleConfirmAnonymizeSave = async () => {
        if (!anonymizePayload || !anonymizedText) return;
        await handleSaveToMemory(
            anonymizePayload.taskName,
            anonymizedText,
            anonymizePayload.points,
            anonymizePayload.notes,
            anonymizePayload.maxPoints
        );
        setShowAnonymizeDialog(false);
    };

    const handleCloseAnonymize = () => {
        if (isPending) return;
        setShowAnonymizeDialog(false);
        setAnonymizePayload(null);
    };

    const isSaaSService = !isLocalInstance() && userData?.appMode === 'STANDARD';

    return {
        appMode,
        memories, activeMemoryId, targetMemoryId, setTargetMemoryId,
        savingTaskId, setSavingTaskId, isPending,
        showAnonymizeDialog, anonymizing, anonymizedText, setAnonymizedText,
        anonymizeError, anonymizePayload,
        handleStartAnonymize, handleRetryAnonymize, handleConfirmAnonymizeSave, handleCloseAnonymize,
        isSaaSService
    };
}
