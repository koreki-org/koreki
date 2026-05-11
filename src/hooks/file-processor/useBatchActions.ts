import { useCallback, ChangeEvent } from 'react';
import { BatchFile, Task, AppSettings } from '../../types';
import { reindexBatchFiles, calculatePercentageFromTasks, calculateGrade } from '../../lib/logic';
import { performAIRequest, performOCRRequest } from '../../lib/ai-logic';
import { extractTextFromFile, convertPdfToImage } from '../../lib/file-utils';
import { parseMoodleExcel } from '../../lib/excel';

export const useBatchActions = (
    state: any,
    userData: any,
    settings: AppSettings,
    startExtraction: (items: BatchFile[]) => Promise<void>,
    setModelSolution?: React.Dispatch<React.SetStateAction<string>>,
    setTasksLayout?: React.Dispatch<React.SetStateAction<Task[]>>
) => {
    const {
        batchFiles, setBatchFiles,
        setPdfTypeQueue,
        setIsImportedSession,
        setIsLoadingModel
    } = state;

    const removeFile = useCallback((index: number) => {
        setBatchFiles((prev: BatchFile[]) => {
            const updated = prev.filter((_, idx) => idx !== index);
            return reindexBatchFiles(updated);
        });
    }, [setBatchFiles]);

    const handleKorekiImport = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            let importedFiles: BatchFile[] = [];

            if (Array.isArray(data)) importedFiles = data;
            else if (data?.batchFiles) {
                importedFiles = data.batchFiles;
                if (data.modelSolution && setModelSolution) setModelSolution(data.modelSolution);
                if (data.tasksLayout && setTasksLayout) setTasksLayout(data.tasksLayout);
            }

            setBatchFiles(importedFiles);
            setIsImportedSession(true);
        } catch (err: any) {
            alert("Import fehlgeschlagen: " + err.message);
        }
    }, [setBatchFiles, setIsImportedSession, setModelSolution, setTasksLayout]);

    const handleStudentUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const allFiles = Array.from(e.target.files);
        
        // 1. Koreki Session Import
        const korekiFile = allFiles.find(f => f.name.toLowerCase().endsWith('.koreki'));
        if (korekiFile) {
            await handleKorekiImport(korekiFile);
            return;
        }

        // 2. Moodle Excel/CSV Import (@principal_architect)
        // We look for any Excel/CSV file and treat it as a student response export.
        const excelFile = allFiles.find(f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.csv'));
        let moodleItems: BatchFile[] = [];
        if (excelFile) {
            try {
                const parsed = await parseMoodleExcel(excelFile);
                moodleItems = parsed as BatchFile[];
            } catch (err) {
                console.error("Moodle import failed", err);
            }
        }

        // 3. Standard File Upload (PDF, Images, TXT)
        const files = allFiles.filter(f => 
            (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ||
            f.type === 'text/plain' || f.name.toLowerCase().endsWith('.txt') ||
            f.type.startsWith('image/')) && 
            !f.name.toLowerCase().endsWith('.koreki') &&
            !f.name.toLowerCase().endsWith('.xlsx') &&
            !f.name.toLowerCase().endsWith('.csv')
        ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const standardItems: BatchFile[] = files.map((f, idx) => ({
            files: [f],
            name: `Schüler #${idx + 1 + moodleItems.length}`,
            originalName: f.name.replace(/\.[^/.]+$/, ""),
            status: 'pending',
            result: null,
            error: null,
            documentType: 'unknown',
            pageCount: 1,
            ocrDone: false,
            selected: true
        }));

        const finalBatch = reindexBatchFiles([...moodleItems, ...standardItems]);
        setBatchFiles(finalBatch);

        // 4. Handle PDF Type Selection Queue
        if (standardItems.length > 0) {
            const queue = standardItems.map((item, i) => ({ 
                idx: i + moodleItems.length, 
                fileName: item.name 
            }));
            setPdfTypeQueue(queue);
        }

        // 5. Industrial Pipeline Trigger (@principal_architect)
        // For Moodle items, we skip the UI queue and start semantic mapping immediately.
        if (moodleItems.length > 0) {
            setTimeout(() => startExtraction(finalBatch), 200);
        }
    }, [handleKorekiImport, setBatchFiles, setPdfTypeQueue, startExtraction]);

    const handleRelinkFiles = useCallback(async (newFiles: File[]) => {
        setBatchFiles((prev: BatchFile[]) => {
            const next = [...prev];
            let matched = 0;
            next.forEach((item, idx) => {
                if (item.files && item.files.length > 0) return;
                const match = newFiles.find(f => f.name.includes(item.originalName || ''));
                if (match) {
                    next[idx] = { ...next[idx], files: [match] };
                    matched++;
                }
            });
            if (matched > 0) setTimeout(() => startExtraction(next), 100);
            return next;
        });
    }, [setBatchFiles, startExtraction]);

    const onToggleSelect = useCallback((idx: number) => {
        setBatchFiles((prev: BatchFile[]) => {
            const next = [...prev];
            next[idx] = { ...next[idx], selected: !next[idx].selected };
            return next;
        });
    }, [setBatchFiles]);

    const onToggleType = useCallback((idx: number) => {
        setBatchFiles((prev: BatchFile[]) => {
            const next = [...prev];
            const newType = next[idx].documentType === 'scanned' ? 'typed' : 'scanned';
            next[idx] = { 
                ...next[idx], 
                documentType: newType, 
                estimatedCredits: (next[idx].pageCount || 1) * (newType === 'scanned' ? 2 : 1) 
            };
            return next;
        });
    }, [setBatchFiles]);

    const onUpdateText = useCallback((idx: number, text: string, tasksForResults?: Task[]) => {
        setBatchFiles((prev: BatchFile[]) => {
            const next = [...prev];
            const updatedItem = { ...next[idx] };

            if (tasksForResults) {
                if (updatedItem.status === 'done' && updatedItem.result) {
                    // Update post-correction results
                    const newPercentage = calculatePercentageFromTasks(tasksForResults);
                    updatedItem.result = {
                        ...updatedItem.result,
                        tasks: tasksForResults,
                        overallMatchPercentage: newPercentage
                    };
                    updatedItem.grade = calculateGrade(newPercentage);
                } else {
                    // Update pre-correction OCR texts (BatchItemPendingView)
                    updatedItem.tasks = tasksForResults;
                }
            } else {
                // Manual text edit from the text-area (Verification View)
                updatedItem.fileText = text;
            }

            next[idx] = updatedItem;
            return next;
        });
    }, [setBatchFiles]);

    /**
     * INDUSTRIAL RE-CORRECTION: Resets all 'done' and 'error' files to 'pending' to allow re-run with new prompts.
     */
    const onResetResults = useCallback(() => {
        setBatchFiles((prev: BatchFile[]) => {
            const next = prev.map(f => {
                if (f.status === 'done' || f.status === 'error') {
                    return { ...f, status: 'pending', result: null, grade: undefined, error: null };
                }
                return f;
            });
            return next;
        });
    }, [setBatchFiles]);

    return {
        handleStudentUpload,
        handleRelinkFiles,
        handleKorekiImport,
        removeFile,
        onToggleSelect,
        onToggleType,
        onUpdateText,
        onResetResults
    };
};
