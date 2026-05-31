import { useCallback } from 'react';
import { BatchFile, Task, AppSettings } from '../../types';
import { performAIRequest } from '../../lib/ai-logic';
import { resolveOCRSource, applyRedactionsToPreviews } from '../../lib/privacy-utils';
import { calculateGrade } from '../../lib/logic';
import { splitTextByTasks } from '../../lib/task-utils';
import { promisePool } from '../../lib/ai/promise-pool';
import { runExtractionStrategy } from '../../lib/ai/extraction-logic';
import { extractTextFromFile } from '../../lib/file-utils';
import { useBatchStore } from '../store/useBatchStore';

export const useProcessingPipeline = (
    state: any,
    userData: any,
    settings: AppSettings,
    modelSolution: string,
    tasksLayout: Task[],
    setUserData: React.Dispatch<React.SetStateAction<any>>,
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
        sourceMetadata: Partial<BatchFile> = {}
    ) => {
        if (!textToMap || tasksLayout.length === 0) return;

        const cleanData = await performAIRequest('clean-and-map', {
            text: textToMap, 
            isInclusive: false, 
            tasksLayout, 
            pageCount,
            requestId: index // Scoped streaming
        }, userData?.appMode, settings);


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
                    status: 'pending'
                };
                return next;
            });
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles]);

    const startExtraction = useCallback(async (items: BatchFile[]) => {
        setIsLoadingBatch(true);
        try {
            for (let i = 0; i < items.length; i++) {
                if (items[i].status !== 'pending' && items[i].previewDataUrls?.length) continue;
                setCurrentProcessingIndex(i);
                
                // Moodle/Digital Path: If no physical file but text is present, go straight to mapping
                if ((!items[i].files || items[i].files.length === 0) && items[i].fileText) {
                    await internalProcessMapping(i, items[i].fileText, 1, 1);
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
                            appMode: userData?.appMode,
                            settings,
                            pageRange: items[i].pageRange,
                            isComplex: ocrStrategy === 'handwriting'
                        });
                        text = res.text;
                        pageCount = res.pageCount;
                        documentType = res.documentType;
                        previewDataUrls = res.previewDataUrls;
                    }

                    let redactedDataUrls = items[i].redactedDataUrls;
                    let redactionRects = items[i].redactionRects;
                    let isRedacted = items[i].isRedacted;
                    
                    if (items[i].autoRedactTop2cm && previewDataUrls && previewDataUrls.length > 0 && !items[i].isRedacted) {
                        try {
                            const rects: Record<number, { x: number, y: number, w: number, h: number }[]> = {};
                            const redactedUrls: string[] = [];
                            
                            for (let pageIdx = 0; pageIdx < previewDataUrls.length; pageIdx++) {
                                const url = previewDataUrls[pageIdx];
                                const img = new Image();
                                await new Promise((resolve, reject) => {
                                    img.onload = resolve;
                                    img.onerror = reject;
                                    img.src = url;
                                });
                                
                                const h = Math.round(img.height * 0.0673); // ~2 cm proportional on A4 A-series ratio
                                const rect = { x: 0, y: 0, w: img.width, h };
                                rects[pageIdx] = [rect];
                                
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.drawImage(img, 0, 0);
                                    ctx.fillStyle = '#0f172a'; // Slate-900 / Black-out
                                    ctx.fillRect(0, 0, img.width, h);
                                    redactedUrls.push(canvas.toDataURL('image/jpeg', 0.9));
                                } else {
                                    redactedUrls.push(url);
                                }
                            }
                            
                            redactionRects = rects;
                            redactedDataUrls = redactedUrls;
                            isRedacted = true;
                        } catch (err) {
                            console.error("Failed auto-redaction during extraction", err);
                        }
                    } else if (isRedacted && redactionRects && previewDataUrls && previewDataUrls.length > 0) {
                        try {
                            redactedDataUrls = await applyRedactionsToPreviews(previewDataUrls, redactionRects);
                        } catch (err) {
                            console.error("Failed to re-apply redactions", err);
                        }
                    }

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
                                ocrDone: false 
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
                                }
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
                    console.error("Extraction error", err);
                }
            }
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy]);

    const handleExtractOCR = useCallback(async (currentBatch: BatchFile[]) => {
        setIsLoadingBatch(true);
        try {
            for (let i = 0; i < currentBatch.length; i++) {
                if (currentBatch[i].selected && !currentBatch[i].ocrDone) {
                    setCurrentProcessingIndex(i);
                    try {
                        const mainFile = currentBatch[i].files![0];
                        
                        // 🏮 INDUSTRIAL PRIVACY CHECK (Layer 2)
                        const ocrSource = resolveOCRSource(currentBatch[i]);
                        
                        const ocrRes = await runExtractionStrategy(mainFile, {
                            isScan: currentBatch[i].documentType === 'scanned',
                            needsPreview: true, // For splitting & UI
                            appMode: userData?.appMode,
                            settings,
                            pageRange: currentBatch[i].pageRange,
                            sourceOverride: ocrSource || undefined,
                            isComplex: ocrStrategy === 'handwriting'
                        });

                        // 🏗️ Step 2: Unified Mapping & State Update
                        await internalProcessMapping(
                            i, 
                            ocrRes.text, 
                            ocrRes.pageCount || currentBatch[i].pageCount || 1, 
                            2, // Multiplier for OCR
                            { previewDataUrls: ocrRes.previewDataUrls || currentBatch[i].previewDataUrls }
                        );
                    } catch (err: any) {
                        const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit') || err.message?.includes('überlastet');
                        setBatchFiles((prev: BatchFile[]) => {
                            const next = [...prev];
                            next[i] = { 
                                ...next[i], 
                                status: 'error', 
                                error: isRateLimit 
                                    ? 'KI-Server ausgelastet — bitte ca. 30s warten und erneut starten.' 
                                    : err.message 
                            };
                            return next;
                        });
                    }
                }
            }
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
        }
    }, [userData, settings, tasksLayout, setUserData, setBatchFiles, setCurrentProcessingIndex, setIsLoadingBatch, ocrStrategy]);

    /**
     * INDUSTRIAL CORRECTION ENGINE (Single Item)
     * 🏗️ Handles the correction of a single student file.
     */
    const internalCorrectionPipeline = useCallback(async (i: number, freshFiles?: BatchFile[], force: boolean = false) => {
        const files = freshFiles || useBatchStore.getState().batchFiles;
        const currentFile = files[i];

        if (!currentFile || (!force && currentFile.status === 'done') || !currentFile.selected) {
            return;
        }

        setCurrentProcessingIndex(i);

        try {
            // --- STAGE 15 INDUSTRIAL RECOVERY: Ensure studentText is never empty ---
            // Bugfix: When re-scanning a 'done' item, the user's edits are stored in result.tasks, not currentFile.tasks.
            const activeTasks = (currentFile.status === 'done' && currentFile.result?.tasks?.length) 
                ? currentFile.result.tasks 
                : currentFile.tasks;

            const sectionText = activeTasks && activeTasks.length > 0
                ? activeTasks.map((t: any) => `### ${t.name} ###\n${t.content || ''}`).join('\n\n') 
                : '';
            
            const finalStudentText = sectionText.trim().length > 0 
                ? sectionText 
                : (currentFile.fileText || '');

            if (!finalStudentText.trim()) {
                throw new Error("Fehler: Kein Schülertext für die Korrektur gefunden.");
            }

            const startTime = performance.now();
            let gradingMemoryCases = undefined;
            try {
                const storedCases = localStorage.getItem('koreki_active_grading_memory_cases');
                if (storedCases) {
                    gradingMemoryCases = JSON.parse(storedCases);
                }
            } catch (e) {}

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
            }, userData?.appMode, settings);
            const duration = performance.now() - startTime;

            // --- POPULATE student answer content in correction results from pre-correction tasks ---
            if (data && Array.isArray(data.tasks)) {
                const cleanLayout = tasksLayout.map(t => ({ ...t, content: undefined }));
                const rawSplit = splitTextByTasks(currentFile.fileText || "", cleanLayout);

                data.tasks = data.tasks.map((task: any) => {
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
                setUserData((u: any) => u ? { ...u, credits: Math.max(0, u.credits - (currentFile.pageCount || 1)) } : null);
            }
        } catch (err: any) {
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'error', error: err.message };
                return next;
            });
        }
    }, [modelSolution, tasksLayout, userData, settings, setUserData, setBatchFiles, setCurrentProcessingIndex, ocrStrategy, expertProfileName]);

    const processBatch = useCallback(async (aiStatus: any) => {
        // INDUSTRIAL FIX: Get FRESH state to prevent closure staleness on auto-start
        const freshFiles = useBatchStore.getState().batchFiles;
        
        if (aiStatus?.correctionBrakeActive) return alert(aiStatus.message);
        if (!modelSolution) return alert("Bitte zuerst Musterlösung hochladen.");
        setIsLoadingBatch(true);
        try {
            const indices = freshFiles.map((_, i) => i);
            await promisePool(indices, 1, async (i: number) => {
                await internalCorrectionPipeline(i, freshFiles);
            });
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
        }
    }, [internalCorrectionPipeline, setIsLoadingBatch, setCurrentProcessingIndex, modelSolution]);

    const processSingleFile = useCallback(async (i: number, aiStatus?: any) => {
        if (aiStatus?.correctionBrakeActive) return alert(aiStatus.message);
        if (!modelSolution) return alert("Bitte zuerst Musterlösung hochladen.");
        
        setIsLoadingBatch(true);
        try {
            setBatchFiles((prev: BatchFile[]) => {
                const next = [...prev];
                next[i] = { ...next[i], status: 'pending', error: null };
                return next;
            });
            await internalCorrectionPipeline(i, undefined, true);
        } finally {
            setIsLoadingBatch(false);
            setCurrentProcessingIndex(-1);
        }
    }, [internalCorrectionPipeline, setIsLoadingBatch, setCurrentProcessingIndex, modelSolution, setBatchFiles]);

    const cleanAndExtractLayout = useCallback(async (solution: string, currentSettings: AppSettings, pageCount: number = 1, isScan: boolean = false) => {
        if (!solution) return null;
        state.setIsLoadingModel(true);
        try {
            const data = await performAIRequest('clean-and-analyze', {
                modelSolution: solution,
                isInclusive: false,
                pageCount,
                isScan,
                requestId: 'model-solution' // Unique scope for model solution
            }, userData?.appMode, currentSettings);

            if (data && Array.isArray(data.tasks)) {
                data.tasks = data.tasks.map((task: any) => ({
                    ...task,
                    taskType: 'default',
                    gradingGraph: undefined
                }));
            }

            return data;
        } catch (err: any) {
            console.error("Layout extraction error:", err);
            throw err;
        } finally {
            state.setIsLoadingModel(false);
        }
        return null;
    }, [userData?.appMode, state]);

    return { startExtraction, handleExtractOCR, processBatch, processSingleFile, cleanAndExtractLayout };
};
