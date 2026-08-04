import { useCallback } from 'react';
import { Task, AppSettings, BatchFile } from '../types';
import { reindexBatchFiles, generateSplitBatchItems } from '../lib/logic';
import { runExtractionStrategy } from '../lib/ai/extraction-logic';
import { buildModelSolutionFromTasks } from '../lib/task-utils';
import { useDashboardStore } from './store/useDashboardStore';

// Sub-Hooks
import { useBatchState } from './file-processor/useBatchState';
import { useBatchActions } from './file-processor/useBatchActions';
import { useProcessingPipeline } from './file-processor/useProcessingPipeline';

export const useFileProcessor = (
    userData: any,
    settings: AppSettings,
    modelSolution: string,
    tasksLayout: Task[],
    setUserData: React.Dispatch<React.SetStateAction<any>>,
    profileName?: string,
    setModelSolution?: React.Dispatch<React.SetStateAction<string>>,
    setTasksLayout?: React.Dispatch<React.SetStateAction<Task[]>>,
    setModelSolutionContext?: React.Dispatch<React.SetStateAction<string>>
) => {
    // 1. Initial State
    const state = useBatchState();
    
    // Explicitly destructure for local usage and clarity
    const {
        batchFiles, setBatchFiles,
        splitIdx, setSplitIdx,
        pdfTypeQueue, setPdfTypeQueue,
        setIsLoadingBatch,
        setIsLoadingModel
    } = state;

    // 2. Async Pipelines
    const pipeline = useProcessingPipeline(
        state, 
        userData, 
        settings, 
        modelSolution, 
        tasksLayout, 
        setUserData,
        profileName
    );
    const { startExtraction, handleExtractOCR, processBatch, processSingleOCR } = pipeline;

    // 3. UI Actions
    const actions = useBatchActions(
        state, 
        userData, 
        settings, 
        startExtraction,
        setModelSolution,
        setTasksLayout,
        setModelSolutionContext
    );
    const {
        handleStudentUpload,
        handleRelinkFiles,
        handleKorekiImport,
        removeFile
    } = actions;

    // 4. Local Orchestration (Modals & Multi-step UI)
    const handlePDFTypeSelect = useCallback(async (type: 'scanned' | 'typed', applyToAll: boolean) => {
        if (!pdfTypeQueue || pdfTypeQueue.length === 0) return;
        const updatedBatch = [...batchFiles];

        if (applyToAll) {
            pdfTypeQueue.forEach(q => {
                updatedBatch[q.idx].documentType = type;
                updatedBatch[q.idx].estimatedCredits = (updatedBatch[q.idx].pageCount || 1) * (type === 'scanned' ? 2 : 1);
            });
            setPdfTypeQueue([]);
        } else {
            const current = pdfTypeQueue[0];
            updatedBatch[current.idx].documentType = type;
            updatedBatch[current.idx].estimatedCredits = (updatedBatch[current.idx].pageCount || 1) * (type === 'scanned' ? 2 : 1);
            setPdfTypeQueue(prev => prev.slice(1));
        }

        setBatchFiles(updatedBatch);
        if (applyToAll || pdfTypeQueue.length === 1) {
            await startExtraction(updatedBatch);
        }
    }, [batchFiles, pdfTypeQueue, startExtraction, setBatchFiles, setPdfTypeQueue]);

    const executeSplit = useCallback((students: { firstName?: string, lastName?: string, name?: string, pageCount: number }[]) => {
        if (splitIdx === null) return;
        const target = batchFiles[splitIdx];
        if (!target.files || target.files.length === 0) return;

        const newItems = generateSplitBatchItems(target, students, splitIdx);
        const updated = [...batchFiles];
        updated.splice(splitIdx, 1, ...newItems);
        const finalBatch = reindexBatchFiles(updated);

        setBatchFiles(finalBatch);
        setSplitIdx(null);
        startExtraction(finalBatch);
    }, [batchFiles, splitIdx, startExtraction, setBatchFiles, setSplitIdx]);

    const handleModelUpload = useCallback(async (file: File, isScan: boolean) => {
        if (!setModelSolution || !setTasksLayout) return;
        setIsLoadingModel(true);
        setModelSolution("");
        
        try {
            const { text, pageCount } = await runExtractionStrategy(file, {
                isScan,
                needsPreview: false,
                appMode: userData?.appMode,
                settings,
                isComplex: false // INDUSTRIAL FORCE: Musterlösung immer via Standard-OCR (Defensiv)
            });
            
            // Industrial Update: Track page count for subsequent re-extractions
            const setModelPageCount = (useDashboardStore.getState() as any).setModelSolutionPageCount;
            if (setModelPageCount) setModelPageCount(pageCount);

            if (userData?.appMode !== 'PURE') {
                setUserData((prev: any) => prev ? { ...prev, credits: Math.max(0, prev.credits - pageCount) } : null);
            }

            if (!text) throw new Error("Kein Text extrahiert.");
            
            // Layout analysis via pipeline logic (or direct AI call)
            const data = await pipeline.cleanAndExtractLayout?.(text, settings, pageCount, isScan);
            if (data?.tasks && data.tasks.length > 0) {
                // Der gemeinsame Rahmen gehoert zu keiner Aufgabe und faellt ohne eigenes Feld
                // aus der Analyse heraus.
                const analysisContext = typeof data.context === 'string' ? data.context.trim() : '';
                if (setModelSolutionContext) setModelSolutionContext(analysisContext);

                // Die strukturierte Fassung ist ab hier die Musterloesung: gegliederte Aufgaben,
                // rekonstruierte Tabellen, reparierte OCR-Fehler, kein Formularrauschen — und
                // identisch mit dem, was die Lehrkraft im Dashboard sieht.
                console.debug(`[Analyse] ${data.tasks.length} Aufgaben, Rahmen: ${analysisContext ? `${analysisContext.length} Zeichen` : 'leer'}`);

                setTasksLayout(data.tasks);
                setModelSolution(buildModelSolutionFromTasks(analysisContext, data.tasks));
            } else {
                throw new Error("Koreki konnte keine Aufgabenstruktur in diesem Dokument erkennen. Bitte prüfe die PDF-Qualität.");
            }
        } catch (err: any) {
            const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit') || err.message?.includes('überlastet');
            alert(isRateLimit 
                ? "Der KI-Server ist gerade ausgelastet. Bitte warten Sie ca. 30 Sekunden und versuchen es erneut."
                : "Fehler bei Musterlösung: " + err.message
            );
        } finally {
            setIsLoadingModel(false);
        }
    }, [userData, settings, setUserData, setModelSolution, setTasksLayout, setIsLoadingModel, pipeline]);

    const cleanAndExtractLayout = pipeline.cleanAndExtractLayout;

    return {
        ...state,
        ...actions,
        ...pipeline,
        processSingleFile: pipeline.processSingleFile,
        processSingleOCR: pipeline.processSingleOCR,
        handlePDFTypeSelect,
        handleModelUpload,
        executeSplit,
        cleanAndExtractLayout
    };
};
