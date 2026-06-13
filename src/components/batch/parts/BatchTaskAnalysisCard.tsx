import React from 'react';
import { Sparkles, GraduationCap, X, Check, Loader2, Lock, AlertCircle, RefreshCw, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Button } from '@/components/ui/Button';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { BatchFile, AppSettings } from '../../../types';
import { cn } from '@/lib/utils';
import { useGradingMemories } from '@/hooks/useGradingMemories';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { useAuth } from '@/hooks/useAuth';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { SecondOpinionDrawer } from './SecondOpinionDrawer';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { AnonymizeModal } from './AnonymizeModal';

interface BatchTaskAnalysisCardProps {
    item: BatchFile;
    idx: number;
    activeGroupName: string;
    groupedTasks: Record<string, any[]>;
    mobileViewMode: 'text' | 'image';
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    handleReviewPointAndFeedbackChange?: (idx: number, name: string, pts: number, fb: string) => void;
    tasksLayout?: any[];
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
    const [savingTaskId, setSavingTaskId] = React.useState<string | null>(null);
    const [targetMemoryId, setTargetMemoryId] = React.useState<string>('');
    const [isPending, setIsPending] = React.useState(false);

    // Load available memories and sync selected ID
    const { memories, activeMemoryId, refreshMemories } = useGradingMemories();
    const { userData } = useAuth();
    
    const [showSecondOpinionDrawer, setShowSecondOpinionDrawer] = React.useState(false);
    const [activeDoubleCheckTask, setActiveDoubleCheckTask] = React.useState<{
        name: string;
        studentText: string;
        maxPoints: number;
        currentPoints: number;
        currentFeedback: string;
    } | null>(null);

    const handleApplySecondOpinion = (points: number, feedback: string) => {
        if (!activeDoubleCheckTask) return;
        if (handleReviewPointAndFeedbackChange) {
            handleReviewPointAndFeedbackChange(idx, activeDoubleCheckTask.name, points, feedback);
        } else {
            handleReviewPointChange(idx, activeDoubleCheckTask.name, points);
            handleReviewFeedbackChange(idx, activeDoubleCheckTask.name, feedback);
        }
    };

    const handleSubmitSecondOpinion = async (doubt: string, chatHistory?: any[]) => {
        if (!activeDoubleCheckTask) return;
        const sIdx = (tasksLayout || []).findIndex(t => t.name === activeDoubleCheckTask.name);
        const instructions = sIdx !== -1 ? (tasksLayout[sIdx].instructions || '') : '';
        const solution = sIdx !== -1 ? (tasksLayout[sIdx].sampleSolution || '') : '';

        return await performAIRequest(
            'second-opinion',
            {
                taskName: activeDoubleCheckTask.name,
                studentText: activeDoubleCheckTask.studentText,
                currentPoints: activeDoubleCheckTask.currentPoints,
                maxPoints: activeDoubleCheckTask.maxPoints,
                currentFeedback: activeDoubleCheckTask.currentFeedback,
                teacherDoubt: doubt,
                taskInstructions: instructions,
                sampleSolution: solution,
                chatHistory
            },
            userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
            settings || {} as any
        );
    };

    const [showAnonymizeDialog, setShowAnonymizeDialog] = React.useState(false);
    const [anonymizing, setAnonymizing] = React.useState(false);
    const [anonymizedText, setAnonymizedText] = React.useState('');
    const [anonymizeError, setAnonymizeError] = React.useState<string | null>(null);
    const [anonymizePayload, setAnonymizePayload] = React.useState<{
        taskName: string;
        originalText: string;
        points: number;
        notes: string;
        maxPoints?: number;
    } | null>(null);

    React.useEffect(() => {
        if (activeMemoryId) {
            setTargetMemoryId(activeMemoryId);
        } else if (memories.length > 0) {
            setTargetMemoryId(memories[0].id || '');
        }
    }, [activeMemoryId, memories]);

    const handleStartAnonymize = async (taskName: string, originalText: string, points: number, notes: string, maxPoints?: number) => {
        if (!targetMemoryId) {
            alert('Bitte wähle zuerst einen Ziel-Erfahrungsschatz aus.');
            return;
        }
        if (!originalText.trim()) {
            alert('Keine Schülerlösung für diese Aufgabe gefunden.');
            return;
        }
        if (!notes.trim()) {
            alert('Bitte trage zuerst eine Begründung im Feedback-Feld ein.');
            return;
        }

        setIsPending(true);
        setAnonymizeError(null);
        setAnonymizedText('');

        try {
            const response = await performAIRequest(
                'anonymize',
                { studentText: originalText },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                settings || {} as any
            );

            if (response && response.anonymizedText) {
                const cleanAnon = response.anonymizedText.trim();
                const cleanOrig = originalText.trim();

                if (cleanAnon === cleanOrig) {
                    // Smart Bypass: No anonymization needed! Save directly
                    await handleSaveToMemory(taskName, cleanOrig, points, notes, maxPoints);
                    return;
                }

                // Otherwise: Open simplified preview modal
                setAnonymizePayload({ taskName, originalText, points, notes, maxPoints });
                setAnonymizedText(cleanAnon);
                setAnonymizing(false);
                setShowAnonymizeDialog(true);
            } else {
                throw new Error('Ungültige Antwort von der Anonymisierungs-API.');
            }
        } catch (err: any) {
            console.error('[Anonymize] Error during stylistic anonymization:', err);
            // On error: show the dialog with error state so user can retry or save original
            setAnonymizePayload({ taskName, originalText, points, notes, maxPoints });
            setAnonymizedText(originalText);
            setAnonymizeError(err.message || 'Fehler bei der stilistischen Anonymisierung. Bitte versuche es erneut.');
            setAnonymizing(false);
            setShowAnonymizeDialog(true);
        } finally {
            setIsPending(false);
        }
    };

    const handleRetryAnonymize = async () => {
        if (!anonymizePayload) return;
        setAnonymizing(true);
        setAnonymizeError(null);
        setAnonymizedText('');
        try {
            const response = await performAIRequest(
                'anonymize',
                { studentText: anonymizePayload.originalText },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                settings || {} as any
            );

            if (response && response.anonymizedText) {
                setAnonymizedText(response.anonymizedText);
            } else {
                throw new Error('Ungültige Antwort von der Anonymisierungs-API.');
            }
        } catch (err: any) {
            console.error('[Anonymize] Error during stylistic anonymization retry:', err);
            setAnonymizeError(err.message || 'Fehler bei der stilistischen Anonymisierung. Bitte versuche es erneut.');
        } finally {
            setAnonymizing(false);
        }
    };

    const handleConfirmAnonymizeSave = async () => {
        if (!anonymizePayload || !anonymizedText) return;
        
        await handleSaveToMemory(
            anonymizePayload.taskName,
            anonymizedText,
            anonymizePayload.points,
            anonymizePayload.notes,
            anonymizePayload.maxPoints
        );
        setShowAnonymizeDialog(false);
    };

    const handleCloseAnonymize = () => {
        if (isPending) return;
        setShowAnonymizeDialog(false);
        setAnonymizePayload(null);
    };

    const handleSaveToMemory = async (taskName: string, studentText: string, points: number, notes: string, maxPoints?: number) => {
        if (!targetMemoryId) {
            alert('Bitte wähle zuerst einen Ziel-Erfahrungsschatz aus.');
            return;
        }
        if (!studentText.trim()) {
            alert('Keine Schülerlösung für diese Aufgabe gefunden.');
            return;
        }
        if (!notes.trim()) {
            alert('Bitte trage zuerst eine Begründung im Feedback-Feld ein.');
            return;
        }

        setIsPending(true);
        try {
            if (isDesktopTarget()) {
                // --- TAURI CLIENT-SIDE LOCAL STORAGE SYNC ---
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    try {
                        const list = JSON.parse(stored);
                        const memIdx = list.findIndex((m: any) => m.id === targetMemoryId);
                        if (memIdx !== -1) {
                            const newCase = {
                                id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                studentText: studentText.trim(),
                                taskName: taskName,
                                expectedCorrection: {
                                    pointsObtained: points,
                                    maxPoints: maxPoints,
                                    correctionNotes: notes.trim()
                                }
                            };
                            list[memIdx].cases = [...(list[memIdx].cases || []), newCase];
                            localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                            
                            // Propagate active cases instantly
                            const activeId = localStorage.getItem('koreki_active_grading_memory_id');
                            if (activeId === targetMemoryId) {
                                localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(list[memIdx].cases));
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse local memories JSON', e);
                    }
                }
                
                await refreshMemories();
                setSavingTaskId(null);
                alert('Erfolgreich in den lokalen Erfahrungsschatz aufgenommen! 🎓');
            } else {
                // --- SAAS VPS CLOUD DB SYNC ---
                const res = await apiClient.post('/api/user/grading-memories/append', {
                    gradingMemoryId: targetMemoryId,
                    studentText: studentText.trim(),
                    taskName: taskName,
                    expectedCorrection: {
                        pointsObtained: points,
                        maxPoints: maxPoints,
                        correctionNotes: notes.trim()
                    }
                });

                if (res.ok) {
                    await refreshMemories();
                    setSavingTaskId(null);
                    alert('Erfolgreich in den Erfahrungsschatz aufgenommen! 🎓');
                } else {
                    const errData = await res.json();
                    alert(errData.message || 'Fehler beim Speichern in den Erfahrungsschatz.');
                }
            }
        } catch (err) {
            console.error('[BatchTaskAnalysisCard:Append] Unexpected error:', err);
            alert('Netzwerkfehler beim Anlernen des Falls.');
        } finally {
            setIsPending(false);
        }
    };

    const isSaaSService = !isLocalInstance() && userData?.appMode === 'STANDARD';

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
        <div className={cn("flex flex-col gap-4 h-[80vh] md:h-[600px] animate-in slide-in-from-right-4 duration-500 flex-1", 
            mobileViewMode === 'text' ? "hidden md:flex" : "flex", "md:flex")}>
            <div className="flex items-center justify-between gap-2 mb-2 w-full shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary/60" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bearbeitbare Einschätzung</span>
                </div>
                {onToggleFocus && (
                    <button
                        onClick={() => onToggleFocus(focusedPanel === 'right' ? null : 'right')}
                        className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-primary transition-all duration-200"
                        title={focusedPanel === 'right' ? "Fokus beenden" : "Panel maximieren"}
                    >
                        {focusedPanel === 'right' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {(activeGroupName && groupedTasks[activeGroupName] ? groupedTasks[activeGroupName] : (item.result?.tasks || [])).map((task) => {
                const aiResult = item.result?.tasks.find(t => 
                    t.name === task.name || 
                    t.name?.toLowerCase() === task.name?.toLowerCase() ||
                    task.name?.toLowerCase().includes(t.name?.toLowerCase() || '') ||
                    t.name?.toLowerCase().includes(task.name?.toLowerCase() || '')
                );
                const confidence = aiResult?.confidence || 0;
                const safeTaskName = task.name.replace(/\s+/g, '-').toLowerCase();
                
                return (
                    <div 
                        id={`task-card-${idx}-${safeTaskName}`} 
                        key={task.name} 
                        className="bg-background rounded-2xl border border-border/60 shadow-glass p-4 sm:p-5 space-y-4 hover:border-primary/40 transition-all group/card"
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5 sm:gap-3">
                                <span className="text-xs font-bold text-foreground font-outfit whitespace-nowrap">
                                    <span className="inline sm:hidden">{task.name.replace(/Aufgabe\s*/i, 'A.')}</span>
                                    <span className="hidden sm:inline">{task.name}</span>
                                </span>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-black uppercase tracking-tight whitespace-nowrap",
                                    confidence >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                    confidence >= 50 ? "bg-orange-50 text-orange-600 border-orange-200" :
                                    "bg-destructive/10 text-destructive border-destructive/20"
                                )}>
                                    <div className={cn("w-2 h-2 rounded-full", getConfidenceColor(confidence))}></div>
                                    <span className="hidden sm:inline">Ki-Vertrauen: {confidence}%</span>
                                    <span className="sm:hidden">KI: {confidence}%</span>
                                </div>
                            </div>
                            <PointInput 
                                value={Number(aiResult?.pointsObtained ?? 0)}
                                maxPoints={Number(task.maxPoints || 0)}
                                onChange={(val) => handleReviewPointChange(idx, task.name || '', val)}
                                showMaxPoints={true}
                            />
                        </div>

                        <EditableMathArea
                            value={aiResult?.feedback || ''}
                            onChange={(newVal) => handleReviewFeedbackChange(idx, task.name || '', newVal)}
                            placeholder="Feedback ..."
                            className="w-full"
                        />

                        {/* LOOP CLOSING FEEDBACK ACTION (On-The-Fly GradingMemory Appender) */}
                        {aiResult && (
                            <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
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
                                                        className="w-full text-xs bg-background border border-border rounded-lg p-1.5 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden transition-all text-foreground font-medium font-inter"
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
                                                                const aiTask = item.result.tasks.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                                                                if (aiTask && aiTask.content) {
                                                                    studentAnswer = aiTask.content;
                                                                }
                                                            }
                                                            if (!studentAnswer) {
                                                                studentAnswer = sIdx !== -1 ? (studentSections?.[sIdx] || '') : '';
                                                            }
                                                            handleStartAnonymize(
                                                                task.name,
                                                                studentAnswer,
                                                                Number(aiResult?.pointsObtained ?? 0),
                                                                aiResult?.feedback || '',
                                                                task.maxPoints
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
                                                    const aiTask = item.result.tasks.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                                                    if (aiTask && aiTask.content) {
                                                        studentAnswer = aiTask.content;
                                                    }
                                                }
                                                if (!studentAnswer) {
                                                    studentAnswer = sIdx !== -1 ? (studentSections?.[sIdx] || '') : '';
                                                }
                                                
                                                setActiveDoubleCheckTask({
                                                    name: task.name,
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
                                                setSavingTaskId(task.name);
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
