import { useCallback } from 'react';
import type { BatchFile, Task, AppSettings, User } from '@/types';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { alsAnfrageModus } from '@/lib/ai/app-mode';
import { resolveOCRSource } from '@/lib/privacy-utils';
import { extractTextFromFile } from '@/lib/file-utils';
import { runExtractionStrategy } from '@/lib/ai/extraction-logic';
import { promisePool } from '@/lib/ai/promise-pool';
import { toErrorMessage, isAbortError, isRateLimitError } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import { useBatchStore } from '@/hooks/store/useBatchStore';

/**
 * Texterkennung auf Zuruf.
 * 🔍
 *
 * Zwei Einstiege: alle ausgewaehlten Dateien im Stapel oder eine einzelne.
 * Beide fuehren denselben Weg — Bildquelle aufloesen (geschwaerzt, wenn
 * vorhanden), erkennen lassen, das Ergebnis den Aufgaben zuordnen.
 *
 * Der Abgleich mit `startExtraction` im Hauptteil: DORT laeuft die
 * Erstverarbeitung beim Hochladen, hier die nachtraegliche Erkennung, die die
 * Lehrkraft ausloest.
 */

export interface UseOcrActionsParams {
    setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
    setCurrentProcessingIndex: React.Dispatch<React.SetStateAction<number>>;
    setIsLoadingBatch: React.Dispatch<React.SetStateAction<boolean>>;
    setUserData: React.Dispatch<React.SetStateAction<User | null>>;
    userData: User | null;
    settings: AppSettings;
    tasksLayout: Task[];
    ocrStrategy?: string;
    /** Ordnet den erkannten Text den Aufgaben zu — geteilt mit der Erstverarbeitung. */
    internalProcessMapping: (
        index: number,
        textToMap: string,
        pageCount: number,
        costMultiplier?: number,
        sourceMetadata?: Partial<BatchFile>,
        signal?: AbortSignal
    ) => Promise<void>;
}

export function useOcrActions({
    setBatchFiles,
    setCurrentProcessingIndex,
    setIsLoadingBatch,
    setUserData,
    userData,
    settings,
    tasksLayout,
    ocrStrategy,
    internalProcessMapping
}: UseOcrActionsParams) {
    const handleExtractOCR = useCallback(async (currentBatch: BatchFile[]) => {
        setIsLoadingBatch(true);
        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            for (let i = 0; i < currentBatch.length; i++) {
                if (signal.aborted) break;
                if (currentBatch[i].selected && !currentBatch[i].ocrDone) {
                    setCurrentProcessingIndex(i);
                    try {
                        const mainFile = currentBatch[i].files![0];
                        
                        // 🏮 INDUSTRIAL PRIVACY CHECK (Layer 2)
                        const ocrSource = resolveOCRSource(currentBatch[i]);
                        
                        const ocrRes = await runExtractionStrategy(mainFile, {
                            isScan: currentBatch[i].documentType === 'scanned',
                            needsPreview: true, // For splitting & UI
                            appMode: alsAnfrageModus(userData?.appMode),
                            settings,
                            pageRange: currentBatch[i].pageRange,
                            sourceOverride: ocrSource || undefined,
                            isComplex: ocrStrategy === 'handwriting',
                            signal
                        });

                        if (signal.aborted) break;

                        // 🏗️ Step 2: Unified Mapping & State Update
                        await internalProcessMapping(
                            i, 
                            ocrRes.text, 
                            ocrRes.pageCount || currentBatch[i].pageCount || 1, 
                            2, // Multiplier for OCR
                            { previewDataUrls: ocrRes.previewDataUrls || currentBatch[i].previewDataUrls },
                            signal
                        );
                    } catch (err) {
                        if (isAbortError(err) || signal.aborted) {
                            console.log("OCR aborted by user");
                            break;
                        }
                        const isRateLimit = isRateLimitError(err);
                        setBatchFiles((prev: BatchFile[]) => {
                            const next = [...prev];
                            next[i] = { 
                                ...next[i], 
                                status: 'error', 
                                error: isRateLimit 
                                    ? 'KI-Server ausgelastet — bitte ca. 30s warten und erneut starten.' 
                                    : toErrorMessage(err) 
                            };
                            return next;
                        });
                    }
                }
            }
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
            useBatchStore.getState().clearBatchController();
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy, internalProcessMapping]);

    /**
     * INDUSTRIAL CORRECTION ENGINE (Single Item)
     * 🏗️ Handles the correction of a single student file.
     */

    const processSingleOCR = useCallback(async (i: number) => {
        const freshFiles = useBatchStore.getState().batchFiles;
        const currentFile = freshFiles[i];
        if (!currentFile || !currentFile.files?.[0]) return;

        setIsLoadingBatch(true);
        setCurrentProcessingIndex(i);

        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            // Reset state for this specific file to ocrDone: false, clear results/errors/grade
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { 
                    ...next[i], 
                    ocrDone: false,
                    status: 'pending',
                    result: null,
                    grade: undefined,
                    error: null
                };
                return next;
            });

            const mainFile = currentFile.files[0];
            
            // 🏮 INDUSTRIAL PRIVACY CHECK (Layer 2)
            const ocrSource = resolveOCRSource(currentFile);
            
            const ocrRes = await runExtractionStrategy(mainFile, {
                isScan: currentFile.documentType === 'scanned',
                needsPreview: true,
                appMode: alsAnfrageModus(userData?.appMode),
                settings,
                pageRange: currentFile.pageRange,
                sourceOverride: ocrSource || undefined,
                isComplex: ocrStrategy === 'handwriting',
                signal
            });

            if (signal.aborted) return;

            // 🏗️ Step 2: Unified Mapping & State Update
            await internalProcessMapping(
                i, 
                ocrRes.text, 
                ocrRes.pageCount || currentFile.pageCount || 1, 
                2, // Multiplier for OCR
                { previewDataUrls: ocrRes.previewDataUrls || currentFile.previewDataUrls },
                signal
            );
        } catch (err) {
            if (isAbortError(err) || signal.aborted) {
                console.log(`OCR of file ${i} aborted by user`);
                setBatchFiles((prev: BatchFile[]) => {
                    const next = [...prev];
                    next[i] = { ...next[i], status: 'pending', error: null };
                    return next;
                });
                return;
            }
            const isRateLimit = isRateLimitError(err);
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { 
                    ...next[i], 
                    status: 'error', 
                    error: isRateLimit 
                        ? 'KI-Server ausgelastet — bitte ca. 30s warten und erneut starten.' 
                        : toErrorMessage(err) 
                };
                return next;
            });
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
            useBatchStore.getState().clearBatchController();
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy, internalProcessMapping]);

    return { handleExtractOCR, processSingleOCR };
}
