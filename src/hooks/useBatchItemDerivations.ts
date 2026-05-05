import { useMemo } from 'react';
import { BatchFile, Task } from '../types';
import { hasOcrWarnings, splitTextByTasks } from '../lib/task-utils';

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
        
        // Priority 1: Current text markers in tasks or fileText
        const textHasMarkers = (item.tasks && item.tasks.some(t => hasOcrWarnings(t.content || ''))) || 
                               hasOcrWarnings(item.fileText || '');
        
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

    // Check if correction review is recommended (Industrial logic: confidence < 90%)
    const reviewRecommended = useMemo(() => {
        return item.result?.tasks.some(t => (t.confidence || 0) < 90) || false;
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
