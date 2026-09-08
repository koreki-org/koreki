import React from 'react';
import { Sparkles, GraduationCap, X, Check, Loader2, Lock, AlertCircle, RefreshCw, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Button } from '@/components/ui/Button';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { BatchFile, AppSettings, GradingMemory, Task } from '../../../types';
import { cn } from '@/lib/utils';
import { VertrauensChip } from './VertrauensChip';
import { useTaskReviewActions } from '@/hooks/useTaskReviewActions';
import { useSecondOpinion } from '@/hooks/useSecondOpinion';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { useAuth } from '@/hooks/useAuth';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { SecondOpinionDrawer } from './SecondOpinionDrawer';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { AnonymizeModal } from './AnonymizeModal';
import { toErrorMessage } from '../../../lib/error-message';
import { meldeErfolg, meldeFehler, meldeHinweis } from '@/lib/notify';

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
 * 🧠 The core grading interface for each task.
 * Refined for High-Performance Industrial Review.
 * UPGRADE: Direct loop-closing feedback channel into GradingMemory (On-the-Fly Calibration)
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
    const {
        appMode,
        memories, activeMemoryId, targetMemoryId, setTargetMemoryId,
        savingTaskId, setSavingTaskId, isPending,
        showAnonymizeDialog, anonymizing, anonymizedText, setAnonymizedText,
        anonymizeError, anonymizePayload,
        handleStartAnonymize, handleRetryAnonymize, handleConfirmAnonymizeSave, handleCloseAnonymize,
        isSaaSService
    } = useTaskReviewActions({ settings });

    const {
        showSecondOpinionDrawer, setShowSecondOpinionDrawer,
        activeDoubleCheckTask, setActiveDoubleCheckTask,
        handleApplySecondOpinion, handleSubmitSecondOpinion
    } = useSecondOpinion({
        idx, settings, tasksLayout, appMode,
        handleReviewPointChange, handleReviewFeedbackChange, handleReviewPointAndFeedbackChange
    });

    const anonymizeModal = showAnonymizeDialog && typeof window !== 'undefined' && anonymizePayload ? (
        <AnonymizeModal
            isOpen={showAnonymizeDialog}
            onClose={handleCloseAnonymize}
            originalText={anonymizePayload.originalText}
            anonymizedText={anonymizedText}
            setAnonymizedText={setAnonymizedText}
            anonymizing={anonymizing}
            anonymizeError={anonymizeError}
            isPending={isPending}
            points={anonymizePayload.points}
            maxPoints={anonymizePayload.maxPoints}
            onRetryAnonymize={handleRetryAnonymize}
            onConfirmSave={handleConfirmAnonymizeSave}
            isSaaSService={isSaaSService}
        />
    ) : null;

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
                {(activeGroupName && groupedTasks[activeGroupName] ? groupedTasks[activeGroupName] : (item.result?.tasks || [])).map((task) => {
                const aiResult = item.result?.tasks?.find(t =>
                    t.name === task.name || 
                    t.name?.toLowerCase() === task.name?.toLowerCase() ||
                    task.name?.toLowerCase().includes(t.name?.toLowerCase() || '') ||
                    t.name?.toLowerCase().includes(task.name?.toLowerCase() || '')
                );
                const confidence = aiResult?.confidence;
                const taskName = task.name || '';
                const safeTaskName = taskName.replace(/\s+/g, '-').toLowerCase();
                
                return (
                    <div 
                        id={`task-card-${idx}-${safeTaskName}`} 
                        key={task.name} 
                        className="space-y-3 group/card"
                    >
                        {/* Kopfzeile IN der Komponente: sonst zwei Zeilen gegen eine links. */}
                        <EditableMathArea
                            leftAction={<>
                                <span className="text-xs font-bold text-foreground font-outfit whitespace-nowrap">
                                    <span className="inline sm:hidden">{taskName.replace(/Aufgabes*/i, 'A.')}</span>
                                    <span className="hidden sm:inline">{task.name}</span>
                                </span>
                                <VertrauensChip vertrauen={confidence} getConfidenceColor={getConfidenceColor} />
                                <div className="ml-auto pl-2">
                                    <PointInput
                                        value={Number(aiResult?.pointsObtained ?? 0)}
                                        maxPoints={Number(task.maxPoints || 0)}
                                        onChange={(val) => handleReviewPointChange(idx, task.name || '', val)}
                                        showMaxPoints={true}
                                    />
                                </div>
                            </>}
                            value={aiResult?.feedback || ''} aiNotes={aiResult?.correctionNotes}
                            onChange={(newVal) => handleReviewFeedbackChange(idx, task.name || '', newVal)}
                            placeholder="Feedback ..."
                            className="w-full"
                        />
                        {aiResult?.sandboxBypassed && (
                            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold animate-in fade-in duration-200">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung — bitte manuell gegenprüfen!</span>
                            </div>
                        )}

                        {/* LOOP CLOSING FEEDBACK ACTION (On-The-Fly GradingMemory Appender) */}
                        {aiResult && (
                            <div className="pt-1 border-t border-border/40 flex flex-col gap-2">
                                {savingTaskId === task.name ? (
                                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider font-outfit">In Erfahrungsschatz übernehmen</span>
                                            <Button 
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSavingTaskId(null)} 
                                                className="text-muted-foreground hover:text-foreground transition-colors h-6 w-6 p-0"
                                                disabled={isPending}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>
                                        {memories.length === 0 ? (
                                            <p className="text-xs text-muted-foreground leading-relaxed font-inter">
                                                Es wurden noch keine Erfahrungsschätze erstellt. Bitte richte erst einen über das Menü ein.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase font-outfit">Ziel-Profil</label>
                                                    <select
                                                        value={targetMemoryId}
                                                        onChange={(e) => setTargetMemoryId(e.target.value)}
                                                        className="w-full text-xs bg-card border border-border rounded-lg p-1.5 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden transition-all text-foreground font-medium font-inter"
                                                        disabled={isPending}
                                                    >
                                                        {memories.map((m) => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <KorekiTooltip 
                                                        title="Datenschutz & Anonymisierung"
                                                        content="Vor dem Speichern wird die Antwort automatisch per KI anonymisiert. Personenbezogene Daten werden bereinigt, während der fachliche Kern unverändert bleibt."
                                                        position="top"
                                                        align="left"
                                                        iconSize={14}
                                                        buttonClassName="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                                    />
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setSavingTaskId(null)}
                                                        className="h-7 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg"
                                                        disabled={isPending}
                                                    >
                                                        Abbrechen
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const sIdx = (tasksLayout || []).findIndex(t => t.name === task.name);
                                                            let studentAnswer = '';
                                                            if (item.status === 'done' && item.result) {
                                                                const aiTask = item.result?.tasks?.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                                                                if (aiTask && aiTask.content) {
                                                                    studentAnswer = aiTask.content;
                                                                }
                                                            }
                                                            if (!studentAnswer) {
                                                                studentAnswer = sIdx !== -1 ? (studentSections?.[sIdx] || '') : '';
                                                            }
                                                            handleStartAnonymize(
                                                                taskName,
                                                                studentAnswer,
                                                                Number(aiResult?.pointsObtained ?? 0),
                                                                aiResult?.feedback || '',
                                                                // `maxPoints` ist auf `Task` string|number; undefined bleibt undefined,
                                                    // damit sich am Verhalten nichts aendert.
                                                    task.maxPoints === undefined ? undefined : Number(task.maxPoints)
                                                            );
                                                        }}
                                                        className="h-7 text-xs font-black bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg px-3 flex items-center gap-1.5 shadow-sm"
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Check size={12} />
                                                        )}
                                                        {isSaaSService ? 'Anlernen (1 C)' : 'Anlernen'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 mt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const sIdx = (tasksLayout || []).findIndex(t => t.name === task.name);
                                                let studentAnswer = '';
                                                if (item.status === 'done' && item.result) {
                                                    const aiTask = item.result?.tasks?.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                                                    if (aiTask && aiTask.content) {
                                                        studentAnswer = aiTask.content;
                                                    }
                                                }
                                                if (!studentAnswer) {
                                                    studentAnswer = sIdx !== -1 ? (studentSections?.[sIdx] || '') : '';
                                                }
                                                
                                                setActiveDoubleCheckTask({
                                                    name: taskName,
                                                    studentText: studentAnswer,
                                                    maxPoints: Number(task.maxPoints || 0),
                                                    currentPoints: Number(aiResult?.pointsObtained ?? 0),
                                                    currentFeedback: aiResult?.feedback || ''
                                                });
                                                setShowSecondOpinionDrawer(true);
                                            }}
                                            className="h-8 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg flex items-center gap-1.5"
                                        >
                                            <Sparkles size={13} className="text-primary group-hover/btn:scale-110 transition-all animate-pulse" />
                                            KI-Zweitmeinung
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSavingTaskId(taskName);
                                                if (activeMemoryId) setTargetMemoryId(activeMemoryId);
                                            }}
                                            className="h-8 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg flex items-center gap-1.5"
                                        >
                                            <GraduationCap size={13} className="text-primary group-hover/btn:scale-110 transition-transform" />
                                            In Erfahrungsschatz übernehmen
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            </div>
            {anonymizeModal}
            <SecondOpinionDrawer
                isOpen={showSecondOpinionDrawer}
                onClose={() => {
                    setShowSecondOpinionDrawer(false);
                    setActiveDoubleCheckTask(null);
                }}
                taskName={activeDoubleCheckTask?.name || ''}
                studentText={activeDoubleCheckTask?.studentText || ''}
                currentPoints={activeDoubleCheckTask?.currentPoints ?? 0}
                maxPoints={activeDoubleCheckTask?.maxPoints ?? 0}
                currentFeedback={activeDoubleCheckTask?.currentFeedback || ''}
                onApply={handleApplySecondOpinion}
                onSubmit={handleSubmitSecondOpinion}
                isSaaSService={true}
            />
        </div>
    );
};
