import { useMemo } from 'react';
import { BatchFile, Task } from '../types';
import { hasOcrWarnings, splitTextByTasks } from '../lib/task-utils';
import { brauchtPruefung } from '../lib/vertrauen';

interface UseBatchItemDerivationsProps {
    item: BatchFile;
    idx: number;
    tasksLayout: any[];
    currentProcessingIndex: number | null;
    loading: boolean;
}

/**
 * useBatchItemDerivations Hook
 * 📐🏮🛡️
 * Extracts derived state and memoized computations for a batch file item.
 * Ensures 100% logic consistency with the Stage 14 industrial core.
 */
export const useBatchItemDerivations = ({
    item,
    idx,
    tasksLayout,
    currentProcessingIndex,
    loading
}: UseBatchItemDerivationsProps) => {
    
    // Check if the item or its tasks have OCR warnings
    const itemHasWarnings = useMemo(() => {
        if (item.status === 'done') return false; // INDUSTRIAL: Evict status badges after completion
        
        // Der Marker wird DORT gesucht, wo der Text steht, der auch zur Korrektur
        // geht: in `tasks`, sobald es welche gibt — `useCorrectionRun` baut den
        // Schuelertext aus genau diesem Feld. `fileText` ist der rohe Text der
        // Texterkennung und bleibt beim Reparieren einer Aufgabe absichtlich
        // unangetastet; er ist nur noch Rueckfallebene, solange keine Aufgaben
        // zugeordnet sind.
        //
        // GEMELDET 08.09.2026: Eine reparierte Aufgabe loeschte das rote
        // "OCR pruefen!" am Aufgabenfeld, aber nicht das an der Datei. Beide
        // Zeichen meinen dasselbe — nur dieses hier las zusaetzlich `fileText`
        // und stand damit fuer immer, egal wie sorgfaeltig korrigiert wurde.
        const textHasMarkers = item.tasks && item.tasks.length > 0
            ? item.tasks.some(t => hasOcrWarnings(t.content || ''))
            : hasOcrWarnings(item.fileText || '');
        
        // Priority 2: If we have NO markers, even if initial OCR was low confidence, we consider it "cleared" by the user.
        // However, if we HAVE markers, or if no edit was made AND the flag is true, we show the badge.
        const noStudentContent = (!item.fileText || item.fileText.trim() === '') && (!item.tasks || item.tasks.length === 0);
        return textHasMarkers || (item.hasLowConfidenceOcr && noStudentContent);
    }, [item]);

    // Status derivations
    const isProcessing = item.status === 'processing' || (loading && idx === currentProcessingIndex);
    const isDone = item.status === 'done' && !!item.result;

    // Student sections memoization (Industrial Grade Refactor)
    const studentSections = useMemo(() => {
        // INDUSTRIAL FIX: Strip content from layout tasks before splitting to prevent model solution leaks.
        const cleanLayout = tasksLayout.map(t => ({ ...t, content: undefined }));
        const rawSplit = splitTextByTasks(item.fileText || "", cleanLayout);
        
        return tasksLayout.map((layoutTask, lIdx) => {
            // Priority 1: Manual edit in item.tasks
            const manualEdit = item.tasks?.find(t => t.name === layoutTask.name);
            if (manualEdit && manualEdit.content !== undefined) return manualEdit.content;
            
            // Priority 2: Raw OCR split
            return rawSplit[lIdx] || "";
        });
    }, [item.fileText, item.tasks, tasksLayout]);

    // Nachsehen empfohlen? Nur bei einem GENANNTEN Wert unter der Schwelle —
    // `(t.confidence || 0) < 90` haette jede Aufgabe ohne Angabe eingesammelt.
    const reviewRecommended = useMemo(() => {
        return item.result?.tasks?.some(t => brauchtPruefung(t.confidence)) || false;
    }, [item.result]);

    // Calculate result percentage (Industrial Logic: from overallMatchPercentage)
    const scorePercentage = useMemo(() => {
        return item.result?.overallMatchPercentage ? Math.round(item.result.overallMatchPercentage) : null;
    }, [item.result]);

    // --- Industrial Guardrail: Warnings System ---
    const warnings: string[] = [];
    
    // Privacy Warning
    if (item.documentType === 'scanned' && !item.isRedacted && !isDone) {
        warnings.push("Dokument enthält evtl. noch Klarnamen (Anonymisierung prüfen).");
    }

    return {
        itemHasWarnings,
        reviewRecommended,
        scorePercentage,
        isProcessing,
        isDone,
        studentSections,
        warnings
    };
};
