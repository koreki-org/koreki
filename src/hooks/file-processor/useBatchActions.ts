import { useCallback } from 'react';
import { BatchFile, Task, AppSettings } from '../../types';
import { reindexBatchFiles, fuegeArbeitenHinzu, calculatePercentageFromTasks, calculateGrade } from '../../lib/logic';
import { performAIRequest, performOCRRequest } from '../../lib/ai-logic';
import { extractTextFromFile, convertPdfToImage } from '../../lib/file-utils';
import { parseMoodleExcel, erklaereMoodleBefund } from '../../lib/excel';
import { toErrorMessage } from '../../lib/error-message';
import { meldeFehler, meldeHinweis } from '@/lib/notify';
import { askConfirmation } from '@/lib/confirm-dialog';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { erzeugeKorrekturEintraege } from '@/lib/ai-protocol';

export const useBatchActions = (
    state: any,
    userData: any,
    settings: AppSettings,
    startExtraction: (items: BatchFile[], auchFertige?: boolean) => Promise<void>,
    setModelSolution?: React.Dispatch<React.SetStateAction<string>>,
    setTasksLayout?: React.Dispatch<React.SetStateAction<Task[]>>,
    setModelSolutionContext?: React.Dispatch<React.SetStateAction<string>>
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

    /**
     * Laedt eine ganze Sitzung aus einer `.koreki`-Datei.
     *
     * Das ERSETZT Musterloesung, Aufgaben, Arbeiten und Protokoll — genau wie
     * „Neue Korrektur", und deshalb fragt es wie „Neue Korrektur". Gesperrt wird
     * hier NICHT: „eine andere Sitzung weiterbearbeiten" ist eine legitime
     * Absicht, auch mitten in einer Korrektur. Bis zum 09.11.2026 lief der Import
     * wortlos durch — ein mit abgelegtes `.koreki` loeschte die laufende Arbeit.
     */
    const handleKorekiImport = useCallback(async (file: File) => {
        // Dieselbe Bedingung wie bei „Neue Korrektur" und „Demo laden": Eine
        // geladene Musterloesung ohne Arbeiten ist auch etwas zu verlieren.
        const hatInhalt = useBatchStore.getState().batchFiles.length > 0
            || !!useDashboardStore.getState().modelSolution;
        if (hatInhalt && !(await askConfirmation({
            title: 'Sitzung laden',
            message: `„${file.name}" ersetzt die aktuelle Korrektur vollständig — Musterlösung, Aufgaben, Arbeiten und Protokoll. Fortfahren?`
        }))) return null;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            let importedFiles: BatchFile[] = [];

            if (Array.isArray(data)) {
                importedFiles = data;
            } else if (data) {
                if (data.batchFiles) {
                    importedFiles = data.batchFiles;
                }
                if (data.modelSolution && setModelSolution) setModelSolution(data.modelSolution);
                if (data.tasksLayout && setTasksLayout) setTasksLayout(data.tasksLayout);
                // Aeltere .koreki-Dateien kennen das Feld nicht — dann bleibt der Rahmen leer.
                if (setModelSolutionContext) setModelSolutionContext(typeof data.modelSolutionContext === 'string' ? data.modelSolutionContext : '');
            }

            // Aeltere .koreki-Dateien kennen kein Protokoll — dann bleibt es leer.
            useBatchStore.getState().protokollErsetzen(Array.isArray(data?.protokoll) ? data.protokoll : []);

            setBatchFiles(importedFiles);
            setIsImportedSession(true);
            return data;
        } catch (err) {
            meldeFehler("Import fehlgeschlagen: " + toErrorMessage(err));
            return null;
        }
    }, [setBatchFiles, setIsImportedSession, setModelSolution, setTasksLayout, setModelSolutionContext]);

    /**
     * Nimmt Schuelerarbeiten an — per Klick ODER per Ablegen; welcher Weg es war,
     * aendert nichts, deshalb kommen die Dateien fertig herein statt als
     * Eingabe-Ereignis. Angenommen wird ANGEHAENGT, nie ersetzt: s.
     * `fuegeArbeitenHinzu`.
     */
    const handleStudentUpload = useCallback(async (allFiles: File[]) => {
        if (allFiles.length === 0) return;
        
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
                const { arbeiten, befund } = await parseMoodleExcel(excelFile);
                moodleItems = arbeiten as BatchFile[];

                // Eine Tabelle, aus der keine Arbeiten wurden, sah bisher aus
                // wie „nichts zu tun": kein Eintrag erschien, keine Meldung
                // kam. Jede der drei Ursachen verlangt aber etwas anderes.
                if (befund.art !== 'ok') {
                    meldeHinweis(`„${excelFile.name}" ergab keine Schülerarbeiten.\n\n` + erklaereMoodleBefund(befund));
                }
            } catch (err) {
                console.error("Moodle import failed", err);
                meldeFehler(`„${excelFile.name}" liess sich nicht lesen.\n\n${toErrorMessage(err)}`);
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

        // 4. Anhaengen statt ersetzen. In zwei Schritten, weil die Grenze
        //    zwischen Moodle- und Einzeldateien gebraucht wird: nur die
        //    Einzeldateien stellen sich in die PDF-Typ-Warteschlange, und deren
        //    Platznummern muessen in die ENDGUELTIGE Liste zeigen.
        const bestand: BatchFile[] = useBatchStore.getState().batchFiles;
        const nachMoodle = fuegeArbeitenHinzu(bestand, moodleItems);
        const nachDateien = fuegeArbeitenHinzu(nachMoodle.liste, standardItems);
        const finalBatch = nachDateien.liste;
        setBatchFiles(finalBatch);

        const doppelt = [...nachMoodle.uebersprungen, ...nachDateien.uebersprungen];
        if (doppelt.length > 0) {
            meldeHinweis(
                `${doppelt.length} Datei(en) waren bereits geladen und wurden übersprungen:\n\n` +
                doppelt.join('\n')
            );
        }

        // 5. Handle PDF Type Selection Queue
        const neueDateien = finalBatch.slice(nachMoodle.liste.length);
        if (neueDateien.length > 0) {
            setPdfTypeQueue(neueDateien.map((item, i) => ({
                idx: nachMoodle.liste.length + i,
                fileName: item.name
            })));
        }

        // 6. Industrial Pipeline Trigger (@principal_architect)
        // For Moodle items, we skip the UI queue and start semantic mapping immediately.
        // `finalBatch` enthaelt seit dem Anhaengen auch Fertiges; die Schleife in
        // `startExtraction` ueberspringt das, weil sie die Platznummern der
        // GESAMTEN Liste braucht.
        if (nachMoodle.liste.length > bestand.length) {
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
            // `true`: Die wiederverbundenen Eintraege sind FERTIG (aus dem Import),
            // brauchen aber ihre Vorschaubilder. Der einzige Weg, der das darf.
            if (matched > 0) setTimeout(() => startExtraction(next, true), 100);
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
        // Protokoll (Art. 12 KI-VO): Die Korrektur der Lehrkraft ist ein eigener
        // Eintrag, kein Ueberschreiben des alten — so entsteht die Abweichung
        // zwischen KI-Vorschlag und Endnote von selbst.
        if (tasksForResults) {
            const vorher = useBatchStore.getState().batchFiles[idx];
            if (vorher?.status === 'done' && vorher.result?.tasks) {
                useBatchStore.getState().protokollAnhaengen(
                    erzeugeKorrekturEintraege(idx + 1, vorher.result.tasks, tasksForResults, settings)
                );
            }
        }
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
                    
                    // CRITICAL WORKFLOW FIX:
                    // Also persist the manually edited texts in the pre-correction tasks array,
                    // so that they survive a recorrection reset run instead of falling back to stale OCR text.
                    if (updatedItem.tasks && updatedItem.tasks.length > 0) {
                        updatedItem.tasks = updatedItem.tasks.map(t => {
                            const newT = tasksForResults.find(r => r.name === t.name || r.name?.toLowerCase() === t.name?.toLowerCase());
                            return newT ? { ...t, content: newT.content } : t;
                        });
                    } else {
                        updatedItem.tasks = tasksForResults;
                    }
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
    }, [setBatchFiles, settings]);

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
