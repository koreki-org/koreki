import React from 'react';
import { Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { BatchFile, AppSettings, Task } from '../../../types';
import { cn } from '@/lib/utils';
import { useTaskReviewActions } from '@/hooks/useTaskReviewActions';
import { useSecondOpinion } from '@/hooks/useSecondOpinion';
import { BatchTaskAnalysisCell } from './BatchTaskAnalysisCell';
import { SecondOpinionDrawer } from './SecondOpinionDrawer';
import { AnonymizeModal } from './AnonymizeModal';

interface BatchTaskAnalysisCardProps {
    item: BatchFile;
    idx: number;
    activeGroupName: string;
    groupedTasks: Record<string, Task[]>;
    mobileViewMode: 'text' | 'image';
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    handleReviewPointAndFeedbackChange?: (idx: number, name: string, pts: number, fb: string) => void;
    tasksLayout?: Task[];
    studentSections?: string[];
    settings?: AppSettings;
    focusedPanel?: 'left' | 'right' | null;
    onToggleFocus?: (panel: 'left' | 'right' | null) => void;
}

/**
 * BatchTaskAnalysisCard
 * 🧠 Die rechte Spalte der Korrekturansicht: Ueberschrift, Aufgabenliste, Dialoge.
 *
 * Traegt seit dem 08.09.2026 keinen eigenen Zustand mehr — der liegt in
 * `useTaskReviewActions` und `useSecondOpinion`, und die Einschaetzung je
 * Aufgabe in `BatchTaskAnalysisCell`. Vorher: 569 Zeilen und 13 Hook-Aufrufe
 * gegen eine Grenze von 10.
 */
export const BatchTaskAnalysisCard: React.FC<BatchTaskAnalysisCardProps> = ({
    item,
    idx,
    activeGroupName,
    groupedTasks,
    mobileViewMode,
    getConfidenceColor,
    handleReviewPointChange,
    handleReviewFeedbackChange,
    handleReviewPointAndFeedbackChange,
    tasksLayout = [],
    studentSections = [],
    settings,
    focusedPanel,
    onToggleFocus
}) => {
    const aktionen = useTaskReviewActions({ settings });
    const zweitmeinung = useSecondOpinion({
        idx, settings, tasksLayout, appMode: aktionen.appMode,
        handleReviewPointChange, handleReviewFeedbackChange, handleReviewPointAndFeedbackChange
    });

    const aufgaben = activeGroupName && groupedTasks[activeGroupName]
        ? groupedTasks[activeGroupName]
        : (item.result?.tasks || []);

    const { anonymizePayload } = aktionen;

    return (
        <div className={cn("flex flex-col gap-4 max-h-[80vh] md:max-h-[600px] animate-in slide-in-from-right-4 duration-500 flex-1",
            mobileViewMode === 'text' ? "hidden md:flex" : "flex", "md:flex")}>
            <div className="flex items-center justify-between gap-2 mb-2 w-full shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary/60" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bearbeitbare Einschätzung</span>
                </div>
                {onToggleFocus && (
                    <button
                        onClick={() => onToggleFocus(focusedPanel === 'right' ? null : 'right')}
                        className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-muted  text-muted-foreground hover:text-primary transition-all duration-200"
                        title={focusedPanel === 'right' ? "Fokus beenden" : "Panel maximieren"}
                    >
                        {focusedPanel === 'right' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {aufgaben.map((task) => (
                    <BatchTaskAnalysisCell
                        key={task.name}
                        item={item}
                        idx={idx}
                        task={task}
                        tasksLayout={tasksLayout}
                        studentSections={studentSections}
                        getConfidenceColor={getConfidenceColor}
                        handleReviewPointChange={handleReviewPointChange}
                        handleReviewFeedbackChange={handleReviewFeedbackChange}
                        aktionen={aktionen}
                        zweitmeinung={zweitmeinung}
                    />
                ))}
            </div>
            {aktionen.showAnonymizeDialog && typeof window !== 'undefined' && anonymizePayload && (
                <AnonymizeModal
                    isOpen={aktionen.showAnonymizeDialog}
                    onClose={aktionen.handleCloseAnonymize}
                    originalText={anonymizePayload.originalText}
                    anonymizedText={aktionen.anonymizedText}
                    setAnonymizedText={aktionen.setAnonymizedText}
                    anonymizing={aktionen.anonymizing}
                    anonymizeError={aktionen.anonymizeError}
                    isPending={aktionen.isPending}
                    points={anonymizePayload.points}
                    maxPoints={anonymizePayload.maxPoints}
                    onRetryAnonymize={aktionen.handleRetryAnonymize}
                    onConfirmSave={aktionen.handleConfirmAnonymizeSave}
                    isSaaSService={aktionen.isSaaSService}
                />
            )}
            <SecondOpinionDrawer
                isOpen={zweitmeinung.showSecondOpinionDrawer}
                onClose={() => {
                    zweitmeinung.setShowSecondOpinionDrawer(false);
                    zweitmeinung.setActiveDoubleCheckTask(null);
                }}
                taskName={zweitmeinung.activeDoubleCheckTask?.name || ''}
                studentText={zweitmeinung.activeDoubleCheckTask?.studentText || ''}
                currentPoints={zweitmeinung.activeDoubleCheckTask?.currentPoints ?? 0}
                maxPoints={zweitmeinung.activeDoubleCheckTask?.maxPoints ?? 0}
                currentFeedback={zweitmeinung.activeDoubleCheckTask?.currentFeedback || ''}
                onApply={zweitmeinung.handleApplySecondOpinion}
                onSubmit={zweitmeinung.handleSubmitSecondOpinion}
                isSaaSService={true}
            />
        </div>
    );
};
