import React from 'react';
import { Sparkles, GraduationCap, X, Check, Loader2 } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Textarea } from '../../ui/Textarea';
import { Button } from '@/components/ui/Button';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';
import { useGradingMemories } from '@/hooks/useGradingMemories';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';

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
    studentSections = []
}) => {
    const [savingTaskId, setSavingTaskId] = React.useState<string | null>(null);
    const [targetMemoryId, setTargetMemoryId] = React.useState<string>('');
    const [isPending, setIsPending] = React.useState(false);

    // Load available memories and sync selected ID
    const { memories, activeMemoryId, refreshMemories } = useGradingMemories();

    React.useEffect(() => {
        if (activeMemoryId) {
            setTargetMemoryId(activeMemoryId);
        } else if (memories.length > 0) {
            setTargetMemoryId(memories[0].id || '');
        }
    }, [activeMemoryId, memories]);

    const handleSaveToMemory = async (taskName: string, studentText: string, points: number, notes: string) => {
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
                                expectedCorrection: {
                                    pointsObtained: points,
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
                    expectedCorrection: {
                        pointsObtained: points,
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

    return (
        <div className={cn("flex flex-col gap-4 max-h-[80vh] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-right-4 duration-500 flex-1", 
            mobileViewMode === 'text' ? "hidden md:flex" : "flex", "md:flex")}>
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary/60" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bearbeitbare Einschätzung</span>
            </div>
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-foreground font-outfit">{task.name}</span>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-tight",
                                    confidence >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                    confidence >= 50 ? "bg-orange-50 text-orange-600 border-orange-200" :
                                    "bg-destructive/10 text-destructive border-destructive/20"
                                )}>
                                    <div className={cn("w-2 h-2 rounded-full", getConfidenceColor(confidence))}></div>
                                    Ki-Vertrauen: {confidence}%
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
                            className="w-full min-h-[90px] p-3 rounded-xl bg-muted/20 border-transparent focus-visible:border-primary/30 focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-foreground/80 leading-relaxed transition-all resize-none shadow-inner font-inter"
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
                                                            handleSaveToMemory(
                                                                task.name,
                                                                studentAnswer,
                                                                Number(aiResult?.pointsObtained ?? 0),
                                                                aiResult?.feedback || ''
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
                                                        Anlernen
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
