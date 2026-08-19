import { useCallback } from 'react';
import type { BatchFile, Task, AppSettings, User, AiStatus, AITask, GradingMemoryCase } from '@/types';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { alsAnfrageModus } from '@/lib/ai/app-mode';
import { calculateGrade } from '@/lib/logic';
import { parseCorrectionResult } from '@/lib/ai/ai-orchestrator';
import { resolveOCRSource } from '@/lib/privacy-utils';
import { promisePool } from '@/lib/ai/promise-pool';
import { toErrorMessage, isAbortError, isRateLimitError } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import { splitTextByTasks } from '@/lib/task-utils';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { ensureActiveGradingMemorySynced } from '@/lib/grading-memory-sync';

/**
 * Der Korrektur-Lauf.
 * ✍️
 *
 * Nimmt die aufbereiteten Texte und laesst sie bewerten — einzeln oder als
 * Stapel. Jede Datei laeuft fuer sich: ein Fehlschlag bei Schuelerin 3 darf
 * Schueler 4 nicht verhindern, und ein Abbruch durch die Lehrkraft setzt die
 * betroffene Datei zurueck auf "wartet" statt sie rot zu faerben.
 *
 * Herausgezogen aus `useProcessingPipeline`, wo Texterkennung und Korrektur in
 * einer Datei lagen.
 */

export interface UseCorrectionRunParams {
    setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
    setCurrentProcessingIndex: React.Dispatch<React.SetStateAction<number>>;
    setIsLoadingBatch: React.Dispatch<React.SetStateAction<boolean>>;
    setUserData: React.Dispatch<React.SetStateAction<User | null>>;
    userData: User | null;
    settings: AppSettings;
    modelSolution: string;
    tasksLayout: Task[];
    ocrStrategy?: string;
    expertProfileName?: string;
}

export function useCorrectionRun({
    setBatchFiles,
    setCurrentProcessingIndex,
    setIsLoadingBatch,
    setUserData,
    userData,
    settings,
    modelSolution,
    tasksLayout,
    ocrStrategy,
    expertProfileName
}: UseCorrectionRunParams) {
    const internalCorrectionPipeline = useCallback(async (i: number, freshFiles?: BatchFile[], force: boolean = false, signal?: AbortSignal) => {
        const files = freshFiles || useBatchStore.getState().batchFiles;
        const currentFile = files[i];

        if (!currentFile || (!force && currentFile.status === 'done') || !currentFile.selected) {
            return;
        }

        if (signal?.aborted) return;

        setCurrentProcessingIndex(i);

        try {
            // --- STAGE 15 INDUSTRIAL RECOVERY: Ensure studentText is never empty ---
            // Bugfix: When re-scanning a 'done' item, the user's edits are stored in result.tasks, not currentFile.tasks.
            const activeTasks = (currentFile.status === 'done' && currentFile.result?.tasks?.length) 
                ? currentFile.result.tasks 
                : currentFile.tasks;

            const sectionText = activeTasks && activeTasks.length > 0
                ? activeTasks.map((t: Task) => `### ${t.name} ###\n${t.content || ''}`).join('\n\n') 
                : '';
            
            const finalStudentText = sectionText.trim().length > 0 
                ? sectionText 
                : (currentFile.fileText || '');

            if (!finalStudentText.trim()) {
                throw new Error("Fehler: Kein Schülertext für die Korrektur gefunden.");
            }

            // --- SYNC ACTIVE GRADING MEMORY SYNCHRONOUSLY BEFORE PROMPT COMPILATION ---
            await ensureActiveGradingMemorySynced();

            const startTime = performance.now();
            let gradingMemoryCases: GradingMemoryCase[] | undefined = undefined;
            try {
                const storedCases = localStorage.getItem('koreki_active_grading_memory_cases');
                if (storedCases) {
                    gradingMemoryCases = JSON.parse(storedCases);
                }
            } catch (e) {
                // Nicht verschweigen: Ohne den Erfahrungsschatz korrigiert das
                // Modell nach einem anderen Massstab als dem, den die Lehrkraft
                // eingestellt hat — und merkt es niemand.
                console.error('Erfahrungsschatz konnte nicht gelesen werden — die Korrektur läuft ohne ihn.', e);
            }

            console.log(`[Pipeline] Launching AI correction for index ${i}. Active memory cases sent:`, gradingMemoryCases?.length || 0);

            if (signal?.aborted) return;

            const data = await performAIRequest('correction', {
                modelSolution,
                studentText: finalStudentText,
                tasksLayout,
                documentType: currentFile.documentType || 'typed',
                pageCount: currentFile.pageCount || 1,
                isCorrection: true,
                requestId: i, // Scoped streaming
                expertProfileName,
                isComplex: ocrStrategy === 'handwriting',
                gradingMemory: gradingMemoryCases
            }, alsAnfrageModus(userData?.appMode), settings, signal);

            if (signal?.aborted) return;
            const duration = performance.now() - startTime;

            // --- POPULATE student answer content in correction results from pre-correction tasks ---
            if (data && Array.isArray(data.tasks)) {
                const cleanLayout = tasksLayout.map(t => ({ ...t, content: undefined }));
                const rawSplit = splitTextByTasks(currentFile.fileText || "", cleanLayout);

                data.tasks = data.tasks.map((task: AITask) => {
                    const preTask = currentFile.tasks?.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                    let fallbackContent = '';
                    if (preTask && preTask.content) {
                        fallbackContent = preTask.content;
                    } else {
                        const lIdx = tasksLayout.findIndex(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                        if (lIdx !== -1) {
                            fallbackContent = rawSplit[lIdx] || '';
                        }
                    }
                    return {
                        ...task,
                        content: task.content || fallbackContent
                    };
                });
            }

            if (signal?.aborted) return;

            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = {
                    ...next[i],
                    status: 'done',
                    result: data,
                    grade: calculateGrade(data.overallMatchPercentage),
                    inferenceDuration: duration,
                    error: null // Clear previous errors on success
                };
                return next;
            });

            if (userData?.appMode !== 'PURE') {
                setUserData(u => u ? { ...u, credits: Math.max(0, u.credits - (currentFile.pageCount || 1)) } : null);
            }
        } catch (err) {
            if (isAbortError(err) || signal?.aborted) {
                console.log(`Correction of file ${i} aborted by user`);
                setBatchFiles((prev: BatchFile[]) => {
                    const next = [...prev];
                    next[i] = { ...next[i], status: 'pending', error: null };
                    return next;
                });
                return;
            }
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'error', error: toErrorMessage(err) };
                return next;
            });
        }
    }, [modelSolution, tasksLayout, userData, settings, setUserData, setBatchFiles, setCurrentProcessingIndex, ocrStrategy, expertProfileName]);

    const processBatch = useCallback(async (aiStatus: AiStatus | null) => {
        // INDUSTRIAL FIX: Get FRESH state to prevent closure staleness on auto-start
        const freshFiles = useBatchStore.getState().batchFiles;
        
        if (aiStatus?.correctionBrakeActive) return alert(aiStatus.message);
        if (!modelSolution) return alert("Bitte zuerst Musterlösung hochladen.");
        setIsLoadingBatch(true);

        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            const indices = freshFiles.map((_, i) => i);
            await promisePool(indices, 1, async (i: number) => {
                if (signal.aborted) return;
                await internalCorrectionPipeline(i, freshFiles, false, signal);
            });
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
            useBatchStore.getState().clearBatchController();
        }
    }, [internalCorrectionPipeline, setIsLoadingBatch, setCurrentProcessingIndex, modelSolution]);

    const processSingleFile = useCallback(async (i: number, aiStatus?: AiStatus | null) => {
        if (aiStatus?.correctionBrakeActive) return alert(aiStatus.message);
        if (!modelSolution) return alert("Bitte zuerst Musterlösung hochladen.");
        
        setIsLoadingBatch(true);
        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'pending', error: null };
                return next;
            });
            await internalCorrectionPipeline(i, undefined, true, signal);
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
            useBatchStore.getState().clearBatchController();
        }
    }, [internalCorrectionPipeline, setIsLoadingBatch, setCurrentProcessingIndex, modelSolution, setBatchFiles]);

    return { internalCorrectionPipeline, processBatch, processSingleFile };
}
