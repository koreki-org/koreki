import { useCallback } from 'react';
import { BatchFile, Task, AppSettings, GradingMemoryCase, GradingMemory, User, AITask, AiStatus } from '../../types';
import { performAIRequest } from '../../lib/ai-logic';
import { resolveOCRSource, applyRedactionsToPreviews } from '../../lib/privacy-utils';
import { calculateGrade } from '../../lib/logic';
import { splitTextByTasks } from '../../lib/task-utils';
import { promisePool } from '../../lib/ai/promise-pool';
import { runExtractionStrategy } from '../../lib/ai/extraction-logic';
import { extractTextFromFile, renderDocumentPages } from '../../lib/file-utils';
import { logger } from '../../lib/logger';
import { alsAnfrageModus } from '../../lib/ai/app-mode';
import { useCorrectionRun } from './useCorrectionRun';
import { useOcrActions } from './useOcrActions';
import { useLayoutExtraction } from './useLayoutExtraction';
import { ensureActiveGradingMemorySynced } from '../../lib/grading-memory-sync';
import { useBatchStore } from '../store/useBatchStore';
import { isDesktopTarget } from '../../lib/env-context';
import { apiClient } from '../../lib/api-client';
import { toErrorMessage, isAbortError, isRateLimitError } from '../../lib/error-message';


/**
 * Der Ausschnitt des Batch-Zustands, den die Verarbeitung braucht.
 *
 * Bewusst nur diese vier: der Hook soll den Zustand fortschreiben, nicht ihn
 * kennen. Vorher stand hier `state: any` — damit war jeder Tippfehler in einem
 * dieser Namen erst zur Laufzeit sichtbar.
 */
interface ProcessingPipelineState {
    setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
    setCurrentProcessingIndex: React.Dispatch<React.SetStateAction<number>>;
    setIsLoadingBatch: React.Dispatch<React.SetStateAction<boolean>>;
    setIsLoadingModel: React.Dispatch<React.SetStateAction<boolean>>;
    ocrStrategy?: string;
}

export const useProcessingPipeline = (
    state: ProcessingPipelineState,
    userData: User | null,
    settings: AppSettings,
    modelSolution: string,
    tasksLayout: Task[],
    setUserData: React.Dispatch<React.SetStateAction<User | null>>,
    expertProfileName?: string
) => {
    const { setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy } = state;
    
    /**
     * INDUSTRIAL UNIFICATION: Handles the mapping of extracted text to tasks,
     * credit deduction, and state updates. This centrally prevents logic drift.
     */
    const internalProcessMapping = useCallback(async (
        index: number, 
        textToMap: string, 
        pageCount: number, 
        costMultiplier: number = 1,
        sourceMetadata: Partial<BatchFile> = {},
        signal?: AbortSignal
    ) => {
        if (!textToMap || tasksLayout.length === 0) return;
 
        const cleanData = await performAIRequest('clean-and-map', {
            text: textToMap, 
            isInclusive: false, 
            tasksLayout, 
            pageCount,
            requestId: index // Scoped streaming
        }, alsAnfrageModus(userData?.appMode), settings, signal);

        if (cleanData?.tasks && cleanData.tasks.length > 0) {
            const structuredTasks = cleanData.tasks;

            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[index] = { 
                    ...next[index], 
                    ...sourceMetadata,
                    fileText: textToMap, 
                    tasks: structuredTasks, 
                    ocrDone: true, 
                    status: 'pending' // Let User review it first
                };
                return next;
            });
        } else {
            throw new Error("KI konnte keine Aufgaben im Text finden. Bitte erneut versuchen oder LLM-Anbieter prüfen.");
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles]);


    const startExtraction = useCallback(async (items: BatchFile[]) => {
        setIsLoadingBatch(true);
        const controller = new AbortController();
        useBatchStore.getState().registerBatchController(controller);
        const signal = controller.signal;

        try {
            for (let i = 0; i < items.length; i++) {
                if (signal.aborted) break;
                if (items[i].status !== 'pending' && items[i].previewDataUrls?.length) continue;
                setCurrentProcessingIndex(i);
                
                // Moodle/Digital Path: If no physical file but text is present, go straight to mapping
                const current = items[i];
                if ((!current.files || current.files.length === 0) && current.fileText) {
                    await internalProcessMapping(i, current.fileText, 1, 1, {}, signal);
                    continue;
                }

                const mainFile = items[i].files?.[0];
                if (!mainFile) continue;

                try {
                    const isScan = items[i].documentType === 'scanned';
                    let text = '';
                    let pageCount = items[i].pageCount || 1;
                    let documentType = items[i].documentType;
                    let previewDataUrls = items[i].previewDataUrls;

                    if (isScan) {
                        // INDUSTRIAL PERFORMANCE FIX: Bypassing runExtractionStrategy which executes heavy Mistral LLM OCR.
                        // For batch split & upload, we only need fast visual PDF previews via pdf.js to show the user the queue.
                        const fastRes = await extractTextFromFile(mainFile, true, items[i].pageRange, { skipPreview: false });
                        pageCount = fastRes.pageCount;
                        previewDataUrls = fastRes.previewDataUrls;
                    } else {
                        const res = await runExtractionStrategy(mainFile, {
                            isScan: false,
                            needsPreview: true,
                            appMode: alsAnfrageModus(userData?.appMode),
                            settings,
                            pageRange: items[i].pageRange,
                            isComplex: ocrStrategy === 'handwriting',
                            signal
                        });
                        text = res.text;
                        pageCount = res.pageCount;
                        documentType = res.documentType;
                        previewDataUrls = res.previewDataUrls;
                    }

                    if (signal.aborted) break;

                    let redactedDataUrls = items[i].redactedDataUrls;
                    let redactionRects = items[i].redactionRects;
                    let isRedacted = items[i].isRedacted;
                    
                    if (redactionRects && Object.keys(redactionRects).length > 0) {
                        // Deckt zwei Fälle ab: das Wiederherstellen nach einem
                        // .koreki-Import UND vorgemerkte Rechtecke aus einer
                        // Sammel-Übertragung, die mangels Vorschaubildern noch
                        // nicht aufgetragen werden konnten.
                        //
                        // 🏮 Der `.koreki`-Export enthält bewusst nur die
                        // Koordinaten, nicht die geschwärzten Bilder. Ohne
                        // Seitenbilder ließen sich die Balken nie auftragen —
                        // bei Bild-Uploads (JPG/PNG) liefert extractTextFromFile
                        // grundsätzlich keine. Deshalb werden sie hier notfalls
                        // selbst gerendert.
                        let basis = previewDataUrls;
                        if (!basis?.length) {
                            try {
                                basis = await renderDocumentPages(mainFile, items[i].pageRange);
                                previewDataUrls = basis;
                            } catch (err) {
                                logger.warn("Seitenbilder für Schwärzung nicht renderbar", { message: String(err) });
                            }
                        }

                        try {
                            if (basis?.length) {
                                redactedDataUrls = await applyRedactionsToPreviews(basis, redactionRects);
                                isRedacted = true;
                            } else {
                                // 🏮 Niemals als geschwärzt ausweisen, ohne dass ein
                                // anonymisierter Abzug existiert: resolveOCRSource
                                // fiele auf das ORIGINAL zurück, während die Liste
                                // ein grünes GESCHWÄRZT zeigte. Lieber sichtbar
                                // ungeschützt — dann greift die Datenschutz-Warnung
                                // vor dem Absenden.
                                isRedacted = false;
                                redactedDataUrls = undefined;
                            }
                        } catch (err) {
                            console.error("Failed to re-apply redactions", err);
                            isRedacted = false;
                            redactedDataUrls = undefined;
                        }
                    }

                    if (signal.aborted) break;

                    if (documentType === 'scanned' || isScan) {
                        // For scans, we only update metadata and wait for manual OCR
                        setBatchFiles((prev: BatchFile[]) => {
                            const next = [...prev];
                            next[i] = { 
                                ...next[i], 
                                pageCount, 
                                previewDataUrls, 
                                redactedDataUrls, 
                                redactionRects, 
                                isRedacted, 
                                ocrDone: next[i].ocrDone || false 
                            };
                            return next;
                        });
                    } else {
                        // 🏗️ Step 2: Unified Mapping & State Update (Digital Path)
                        // Trigger mapping only if text is not already present
                        if (!items[i].fileText) {
                            await internalProcessMapping(
                                i, 
                                text, 
                                pageCount, 
                                1, // Multiplier for digital
                                { 
                                    pageCount, 
                                    previewDataUrls, 
                                    redactedDataUrls, 
                                    redactionRects, 
                                    isRedacted 
                                },
                                signal
                            );
                        } else {
                            // Just update metadata if text was already there
                            setBatchFiles((prev: BatchFile[]) => {
                                const next = [...prev];
                                next[i] = { 
                                    ...next[i], 
                                    pageCount, 
                                    previewDataUrls, 
                                    redactedDataUrls, 
                                    redactionRects, 
                                    isRedacted, 
                                    ocrDone: true 
                                };
                                return next;
                            });
                        }
                    }
                } catch (err) {
                    if (isAbortError(err) || signal.aborted) {
                        console.log("Extraction aborted by user");
                        break;
                    }
                    console.error("Extraction error", err);
                    // Ensure the UI shows the error instead of defaulting to [unbeantwortet]
                    setBatchFiles((prev: BatchFile[]) => {
                        const next = [...prev];
                        next[i] = {
                            ...next[i],
                            status: 'error',
                            error: toErrorMessage(err, "Fehler bei der Verarbeitung. Bitte erneut versuchen.")
                        };
                        return next;
                    });
                }
            }
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
            useBatchStore.getState().clearBatchController();
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy, internalProcessMapping]);

    const { handleExtractOCR, processSingleOCR } = useOcrActions({
        setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, setUserData,
        userData, settings, tasksLayout, ocrStrategy, internalProcessMapping
    });

    const { internalCorrectionPipeline, processBatch, processSingleFile } = useCorrectionRun({
        setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, setUserData,
        userData, settings, modelSolution, tasksLayout, ocrStrategy, expertProfileName
    });

    const { cleanAndExtractLayout } = useLayoutExtraction({
        userData,
        setIsLoadingModel: state.setIsLoadingModel
    });

    return { startExtraction, handleExtractOCR, processBatch, processSingleFile, processSingleOCR, cleanAndExtractLayout };
};
