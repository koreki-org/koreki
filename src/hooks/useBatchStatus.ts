import { useState, useMemo, useEffect, useCallback } from 'react';
import { BatchFile, Task, AppSettings } from '../types';
import { groupTasksByMain } from '../lib/task-utils';
import { useBatchState } from './file-processor/useBatchState';
import { isLocalInstance } from '../lib/env-context';

/**
 * Industrial Batch Status Hook (Stage 11)
 * 📊🛡️🏛️
 * Encapsulates batch-wide metrics (Credits, Pending Counts), 
 * UI states (expanded, mobile view), and privacy confirmation orchestration.
 */
export const useBatchStatus = (
    batchFiles: BatchFile[],
    tasksLayout: Task[] = [],
    onExtractOCR: () => void,
    onProcess: () => void,
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void,
    settings?: AppSettings,
    onResetResults?: () => void
) => {
    // --- UI Visibility States ---
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [showScan, setShowScan] = useState<Record<number, boolean>>({});
    const [showConfirm, setShowConfirm] = useState<'ocr' | 'process' | 'reset' | null>(null);
    const [mobileViewMode, setMobileViewMode] = useState<'text' | 'image'>('image');
    const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
    const [activeGroupName, setActiveGroupName] = useState<string>("");
    const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
    const [showDigitalSlips, setShowDigitalSlips] = useState<boolean>(false);
    
    // --- Global State Interop ---
    const { ocrStrategy, setOcrStrategy } = useBatchState();

    // --- Cleanup Preview URLs on Unmount ---
    useEffect(() => {
        return () => {
            Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, [previewUrls]);

    // --- Derived Metrics (Arithmetical Precision) ---
    const metrics = useMemo(() => {
        const totalPendingCredits = batchFiles
            .filter(f => f.status !== 'done' && f.selected !== false)
            .reduce((acc, f) => acc + (f.pageCount || 1), 0);
        
        const totalPossibleCredits = batchFiles
            .filter(f => f.selected !== false)
            .reduce((acc, f) => acc + (f.pageCount || 1), 0);

        const ocrCreditsRequired = batchFiles
            .filter(f => f.documentType === 'scanned' && !f.ocrDone && f.selected !== false)
            .reduce((acc, f) => acc + (f.pageCount || 1), 0);
        
        const pendingCount = batchFiles.filter(f => f.status !== 'done' && f.selected !== false).length;
        const totalCount = batchFiles.length;
        const hasFinishedFiles = batchFiles.some(f => f.status === 'done');
        const unredactedScansCount = batchFiles.filter(f => f.documentType === 'scanned' && !f.isRedacted && f.selected !== false).length;
        const hasPendingOcr = batchFiles.some(f => f.documentType === 'scanned' && !f.ocrDone && f.selected !== false);
        
        return { totalPendingCredits, totalPossibleCredits, ocrCreditsRequired, pendingCount, totalCount, hasFinishedFiles, unredactedScansCount, hasPendingOcr };
    }, [batchFiles]);

    // --- Task Grouping Logic ---
    const groupedTasks = useMemo(() => groupTasksByMain(tasksLayout), [tasksLayout]);
    const groupNames = Object.keys(groupedTasks);

    useEffect(() => {
        if (groupNames.length > 0 && (!activeGroupName || !groupedTasks[activeGroupName])) {
            setActiveGroupName(groupNames[0]);
        }
    }, [groupNames, activeGroupName, groupedTasks]);

    // --- STAGE 11: MOBILE AUTO-SWITCH ON OCR OR CORRECTION COMPLETE ---
    const [lastKnownStatus, setLastKnownStatus] = useState<Record<number, { ocr: boolean, done: boolean }>>({});
    useEffect(() => {
        batchFiles.forEach((file, idx) => {
            const prevState = lastKnownStatus[idx] || { ocr: false, done: false };
            const isDone = file.status === 'done';

            if (file.ocrDone && !prevState.ocr) {
                // This file just finished OCR! -> Show Text Verifier
                setMobileViewMode('text');
                setLastKnownStatus(prev => ({ ...prev, [idx]: { ...prevState, ocr: true } }));
            } else if (isDone && !prevState.done) {
                // This file just finished Correction! -> Show Grading (Korrektur)
                setMobileViewMode('image');
                setLastKnownStatus(prev => ({ ...prev, [idx]: { ...prevState, done: true } }));
            } else if (!file.ocrDone && prevState.ocr) {
                setLastKnownStatus(prev => ({ ...prev, [idx]: { ...prevState, ocr: false } }));
            } else if (!isDone && prevState.done) {
                setLastKnownStatus(prev => ({ ...prev, [idx]: { ...prevState, done: false } }));
            }
        });
    }, [batchFiles, lastKnownStatus]);

    // --- Privacy Confirmation Logic ---
    // --- Privacy Confirmation Logic (Dynamic & Concrete) ---
    const CONFIRM_TEXT = useMemo(() => {
        if (showConfirm === 'reset') {
            return "Möchten Sie die bereits korrigierten Aufgaben wirklich zurücksetzen? Die bisherigen Bewertungen und manuellen Änderungen gehen dabei verloren.";
        }
        if (settings?.provider === 'ollama') {
            return "Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe. Da Sie eine lokale KI-Instanz (Ollama) nutzen, verbleiben Ihre Daten vollständig innerhalb Ihrer Infrastruktur.";
        }
        if (settings?.provider === 'mistral') {
            return "Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe. Mir ist bekannt, dass die Daten zur Verarbeitung an die europäische KI-Schnittstelle von Mistral AI (Paris, Frankreich) übertragen werden.";
        }
        return "Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe. Mir ist bekannt, dass die Daten an eine KI-Schnittstelle innerhalb der Europäischen Union übertragen werden.";
    }, [settings?.provider, showConfirm]);

    const handleConfirmAction = useCallback(async () => {
        const action = showConfirm === 'ocr' ? 'OCR Start' : showConfirm === 'reset' ? 'Reset Results' : 'Correction Batch Start';

        // --- INDUSTRIAL BYPASS: No central logging for local instances ---
        if (!isLocalInstance() && showConfirm !== 'reset') {
            try {
                await fetch('/api/privacy/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, confirmedText: CONFIRM_TEXT })
                });
            } catch (err) {
                console.error('Failed to log privacy confirmation:', err);
            }
        }

        if (showConfirm === 'ocr') {
            onExtractOCR();
        }
        if (showConfirm === 'process') {
            onProcess();
        }
        if (showConfirm === 'reset' && onResetResults) {
            onResetResults();
            
            // Auto-Start Correction after Reset
            setTimeout(() => {
                onProcess();
            }, 100);
        }
        setShowConfirm(null);
    }, [showConfirm, onExtractOCR, onProcess, onResetResults, CONFIRM_TEXT]);

    // --- Review Handlers ---
    const handleReviewPointChange = useCallback((idx: number, taskName: string, points: number) => {
        const item = batchFiles[idx];
        // Ohne Aufgabenliste gibt es nichts zu aendern — `tasks` ist optional,
        // weil eine Analyse ohne erkannte Aufgaben zurueckkommen kann.
        if (!item?.result?.tasks) return;
        const newTasks = item.result.tasks.map(t =>
            t.name === taskName ? { ...t, pointsObtained: points } : t
        );
        onUpdateText(idx, item.fileText || '', newTasks);
    }, [batchFiles, onUpdateText]);

    const handleReviewFeedbackChange = useCallback((idx: number, taskName: string, feedback: string) => {
        const item = batchFiles[idx];
        if (!item?.result?.tasks) return;
        const newTasks = item.result.tasks.map(t =>
            t.name === taskName ? { ...t, feedback } : t
        );
        onUpdateText(idx, item.fileText || '', newTasks);
    }, [batchFiles, onUpdateText]);

    const handleReviewPointAndFeedbackChange = useCallback((idx: number, taskName: string, points: number, feedback: string) => {
        const item = batchFiles[idx];
        if (!item?.result?.tasks) return;
        const newTasks = item.result.tasks.map(t =>
            t.name === taskName ? { ...t, pointsObtained: points, feedback } : t
        );
        onUpdateText(idx, item.fileText || '', newTasks);
    }, [batchFiles, onUpdateText]);

    const getPreviewUrl = useCallback((idx: number, item: BatchFile) => {
        if (item.redactedDataUrls && item.redactedDataUrls.length > 0) return item.redactedDataUrls[0];
        if (item.previewDataUrls && item.previewDataUrls.length > 0) return item.previewDataUrls[0];
        if (previewUrls[idx]) return previewUrls[idx];

        const firstFile = item.files?.[0];
        if (firstFile && firstFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(firstFile);
            setPreviewUrls(prev => ({ ...prev, [idx]: url }));
            return url;
        }
        return null;
    }, [previewUrls]);

    return {
        state: { 
            expandedIdx, setExpandedIdx, showScan, setShowScan, showConfirm, setShowConfirm, 
            mobileViewMode, setMobileViewMode, activeGroupName, setActiveGroupName,
            ocrStrategy, setOcrStrategy, showAnalytics, setShowAnalytics,
            showDigitalSlips, setShowDigitalSlips
        },
        metrics,
        logic: { groupedTasks, groupNames, CONFIRM_TEXT },
        handlers: { handleConfirmAction, handleReviewPointChange, handleReviewFeedbackChange, handleReviewPointAndFeedbackChange, getPreviewUrl }
    };
};
