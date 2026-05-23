import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, GraduationCap, X, Check, Loader2, ShieldCheck, Lock, AlertCircle, RefreshCw, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Textarea } from '../../ui/Textarea';
import { Button } from '@/components/ui/Button';
import { BatchFile, AppSettings } from '../../../types';
import { cn } from '@/lib/utils';
import { useGradingMemories } from '@/hooks/useGradingMemories';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { useAuth } from '@/hooks/useAuth';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { SecondOpinionDrawer } from './SecondOpinionDrawer';

interface BatchTaskAnalysisCardProps {
    item: BatchFile;
    idx: number;
    activeGroupName: string;
    groupedTasks: Record<string, any[]>;
    mobileViewMode: 'text' | 'image';
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
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
        handleReviewPointChange(idx, activeDoubleCheckTask.name, points);
        handleReviewFeedbackChange(idx, activeDoubleCheckTask.name, feedback);
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

        setShowAnonymizeDialog(true);
        setAnonymizing(true);
        setAnonymizeError(null);
        setAnonymizedText('');
        setAnonymizePayload({ taskName, originalText, points, notes, maxPoints });

        try {
            const response = await performAIRequest(
                'anonymize',
                { studentText: originalText },
                userData?.appMode === 'UNSET' ? undefined : userData?.appMode,
                settings || {} as any
            );

            if (response && response.anonymizedText) {
                setAnonymizedText(response.anonymizedText);
            } else {
                throw new Error('Ungültige Antwort von der Anonymisierungs-API.');
            }
        } catch (err: any) {
            console.error('[Anonymize] Error during stylistic anonymization:', err);
            setAnonymizeError(err.message || 'Fehler bei der stilistischen Anonymisierung. Bitte versuche es erneut.');
        } finally {
            setAnonymizing(false);
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

    const anonymizeModal = showAnonymizeDialog && typeof window !== 'undefined' && anonymizePayload
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-background border border-border/80 shadow-2xl rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-bold text-foreground font-outfit font-black">Datenschutzkonforme Vorschau</h3>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-none">Stilistische Anonymisierung vor dem Übernehmen in den Erfahrungsschatz</p>
                        </div>
                        <button 
                            onClick={handleCloseAnonymize}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            disabled={isPending}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content Panel */}
                    <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 min-h-[300px]">
                        
                        {/* Left Side: Original student answer (diagonal stripe to show raw data) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-outfit flex items-center gap-1">
                                    <Lock size={10} className="text-slate-400" /> Original (Sensibel)
                                </span>
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                    {anonymizePayload.taskName} 
                                    {anonymizePayload.maxPoints !== undefined && (
                                        <span className="opacity-75"> ({anonymizePayload.points} / {anonymizePayload.maxPoints} P)</span>
                                    )}
                                </div>
                            </div>
                            <div 
                                className="flex-1 min-h-[180px] p-4 rounded-xl border border-border/40 text-xs text-muted-foreground leading-relaxed overflow-y-auto font-inter bg-slate-50/50"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, var(--muted), var(--muted) 10px, rgba(0, 0, 0, 0.03) 10px, rgba(0, 0, 0, 0.03) 20px)'
                                }}
                            >
                                {anonymizePayload.originalText}
                            </div>
                        </div>

                        {/* Right Side: Anonymized answer preview */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-outfit flex items-center gap-1">
                                    <Sparkles size={10} /> Anonymisierte Schülerantwort
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setAnonymizedText(anonymizePayload.originalText)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all border border-transparent hover:border-indigo-100/50"
                                        title="Kopiert die unveränderte Originalantwort in das Bearbeitungsfeld (hilfreich bei Code/IT-Befehlen)"
                                        disabled={anonymizing}
                                    >
                                        <Copy size={10} /> Original übernehmen
                                    </button>
                                    {isSaaSService && (
                                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-indigo-100/50 dark:border-indigo-900/30">
                                            Kosten: 1 Credit
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {anonymizing ? (
                                <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center border border-dashed border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/10 rounded-xl p-6 space-y-3">
                                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Anonymisiere Schülerantwort...</p>
                                        <p className="text-[10px] text-slate-400 max-w-[200px]">PII-Daten werden bereinigt und Schreibstil wird neutralisiert.</p>
                                    </div>
                                </div>
                            ) : anonymizeError ? (
                                <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 rounded-xl p-6 space-y-3">
                                    <AlertCircle className="text-destructive" size={24} />
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-bold text-destructive">Fehler aufgetreten</p>
                                        <p className="text-[10px] text-muted-foreground max-w-[220px]">{anonymizeError}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRetryAnonymize}
                                        className="h-7 text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1"
                                    >
                                        <RefreshCw size={10} /> Erneut versuchen
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col gap-2 min-h-[180px]">
                                    <textarea
                                        value={anonymizedText}
                                        onChange={(e) => setAnonymizedText(e.target.value)}
                                        className="flex-1 w-full p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 bg-background text-xs text-foreground/90 font-inter leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-hidden resize-none"
                                        placeholder="Geringfügige Anpassungen vor dem Speichern..."
                                    />
                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground px-1">
                                        <ShieldCheck size={11} className="text-emerald-500" />
                                        <span>Freigegeben für Erfahrungsschatz (Enthält keine persönlichen Daten mehr).</span>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="border-t border-border/60 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
                        <div className="hidden sm:block">
                            {isSaaSService && (
                                <p className="text-[9px] text-slate-400 font-inter">
                                    * Wird bei erfolgreicher Generierung von deinem Guthaben abgezogen.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCloseAnonymize}
                                className="h-8 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                disabled={isPending}
                            >
                                Abbrechen
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleConfirmAnonymizeSave}
                                className="h-8 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 flex items-center gap-1.5 shadow-sm"
                                disabled={anonymizing || !!anonymizeError || !anonymizedText || isPending}
                            >
                                {isPending ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Check size={12} />
                                )}
                                Bestätigen & Anlernen
                            </Button>
                        </div>
                    </div>

                </div>
            </div>,
            document.body
        )
        : null;

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
                        <Textarea 
                            value={aiResult?.feedback || ''}
                            onChange={(e) => handleReviewFeedbackChange(idx, task.name || '', e.target.value)}
                            className="w-full min-h-[150px] p-3 rounded-xl bg-muted/20 border-transparent focus-visible:border-primary/30 focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-foreground/80 leading-relaxed transition-all resize-y shadow-inner font-inter"
                            placeholder="Feedback ..."
                        />

                        {/* LOOP CLOSING FEEDBACK ACTION (On-The-Fly GradingMemory Appender) */}
                        {aiResult && (
                            <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
                                {savingTaskId === task.name ? (
                                    <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100/50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider font-outfit">In Erfahrungsschatz übernehmen</span>
                                            <button 
                                                onClick={() => setSavingTaskId(null)} 
                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                                disabled={isPending}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        {memories.length === 0 ? (
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-inter">
                                                Es wurden noch keine Erfahrungsschätze erstellt. Bitte richte erst einen über das Menü ein.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-bold text-slate-500 uppercase font-outfit">Ziel-Profil</label>
                                                    <select
                                                        value={targetMemoryId}
                                                        onChange={(e) => setTargetMemoryId(e.target.value)}
                                                        className="w-full text-xs bg-background border border-border/60 rounded-lg p-1.5 focus:border-indigo-500 focus:ring-0 focus:outline-hidden transition-all text-slate-800 font-medium font-inter"
                                                        disabled={isPending}
                                                    >
                                                        {memories.map((m) => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setSavingTaskId(null)}
                                                        className="h-7 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
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
                                                        className="h-7 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 flex items-center gap-1.5 shadow-sm"
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Check size={12} />
                                                        )}
                                                        {isSaaSService ? 'Anlernen (1 Credit)' : 'Anlernen'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 mt-1">
                                        <button
                                            onClick={() => {
                                                setSavingTaskId(task.name);
                                                if (activeMemoryId) setTargetMemoryId(activeMemoryId);
                                            }}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors group/btn py-1 px-1.5 hover:bg-indigo-50/50 rounded-lg self-start"
                                        >
                                            <GraduationCap size={13} className="text-indigo-500 group-hover/btn:scale-110 transition-transform" />
                                            In Erfahrungsschatz übernehmen
                                        </button>
                                        <button
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
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-primary transition-colors group/btn py-1 px-1.5 hover:bg-primary/5 rounded-lg self-start"
                                        >
                                            <Sparkles size={13} className="text-indigo-500 group-hover/btn:text-primary group-hover/btn:scale-110 transition-all animate-pulse" />
                                            KI-Zweitmeinung
                                        </button>
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
