import React from 'react';
import { Sparkles, GraduationCap, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Button } from '@/components/ui/Button';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import Dropdown from '@/components/ui/Dropdown';
import { BatchFile, Task } from '../../../types';
import { VertrauensChip } from './VertrauensChip';
import { useTaskReviewActions } from '@/hooks/useTaskReviewActions';
import { useSecondOpinion } from '@/hooks/useSecondOpinion';
import { schuelerAntwort } from '@/lib/schueler-antwort';

/**
 * Die Einschaetzung ZU EINER Aufgabe.
 * 🧠
 *
 * Am 08.09.2026 aus `BatchTaskAnalysisCard` herausgeloest, damit linke und
 * rechte Spalte der Korrekturansicht sich je Aufgabe ausrichten koennen: Dafuer
 * muss ein gemeinsames Raster ueber die Aufgaben laufen und pro Aufgabe zwei
 * Zellen erzeugen, statt zweier Listen nebeneinander.
 *
 * Die Zelle haelt bewusst KEINEN eigenen Zustand. Er kommt gebuendelt aus den
 * beiden Hooks, die genau einmal oberhalb der Aufgabenliste aufgerufen werden —
 * `useGradingMemories` darin ruft eine API ohne Cache auf, eine Instanz pro
 * Aufgabe waere ein Abruf pro Aufgabe.
 */

interface BatchTaskAnalysisCellProps {
    item: BatchFile;
    idx: number;
    task: Task;
    tasksLayout: Task[];
    studentSections: string[];
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    /** Zustand aus dem gemeinsamen Hook — nicht je Zelle neu aufgebaut. */
    aktionen: ReturnType<typeof useTaskReviewActions>;
    zweitmeinung: ReturnType<typeof useSecondOpinion>;
}

export const BatchTaskAnalysisCell: React.FC<BatchTaskAnalysisCellProps> = ({
    item,
    idx,
    task,
    tasksLayout,
    studentSections,
    getConfidenceColor,
    handleReviewPointChange,
    handleReviewFeedbackChange,
    aktionen,
    zweitmeinung
}) => {
    const {
        memories, activeMemoryId, targetMemoryId, setTargetMemoryId,
        savingTaskId, setSavingTaskId, isPending, handleStartAnonymize, isSaaSService
    } = aktionen;
    const { setShowSecondOpinionDrawer, setActiveDoubleCheckTask } = zweitmeinung;

    const aiResult = item.result?.tasks?.find(t =>
        t.name === task.name ||
        t.name?.toLowerCase() === task.name?.toLowerCase() ||
        task.name?.toLowerCase().includes(t.name?.toLowerCase() || '') ||
        t.name?.toLowerCase().includes(task.name?.toLowerCase() || '')
    );
    const confidence = aiResult?.confidence;
    const taskName = task.name || '';
    const safeTaskName = taskName.replace(/\s+/g, '-').toLowerCase();
    /** `maxPoints` ist auf `Task` string|number; undefined bleibt undefined. */
    const maxPoints = task.maxPoints === undefined ? undefined : Number(task.maxPoints);

    return (
        <div id={`task-card-${idx}-${safeTaskName}`} className="space-y-3 group/card">
            {/* Kopfzeile IN der Komponente: sonst zwei Zeilen gegen eine links. */}
            <EditableMathArea
                leftAction={<>
                    <span className="text-xs font-bold text-foreground font-outfit whitespace-nowrap">
                        <span className="inline sm:hidden">{taskName.replace(/Aufgabe\s*/i, 'A.')}</span>
                        <span className="hidden sm:inline">{taskName}</span>
                    </span>
                    <VertrauensChip vertrauen={confidence} getConfidenceColor={getConfidenceColor} />
                    <div className="ml-auto pl-2">
                        <PointInput
                            value={Number(aiResult?.pointsObtained ?? 0)}
                            maxPoints={Number(task.maxPoints || 0)}
                            onChange={(val) => handleReviewPointChange(idx, taskName, val)}
                            showMaxPoints={true}
                        />
                    </div>
                </>}
                value={aiResult?.feedback || ''} aiNotes={aiResult?.correctionNotes}
                onChange={(newVal) => handleReviewFeedbackChange(idx, taskName, newVal)}
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
                    {savingTaskId === taskName ? (
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
                                        <Dropdown
                                            value={targetMemoryId}
                                            onValueChange={setTargetMemoryId}
                                            options={memories.map(m => ({ value: m.id || '', label: m.name }))}
                                            disabled={isPending}
                                            className="w-full text-xs"
                                        />
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
                                            onClick={() => handleStartAnonymize(
                                                taskName,
                                                schuelerAntwort(item, task, tasksLayout, studentSections),
                                                Number(aiResult?.pointsObtained ?? 0),
                                                aiResult?.feedback || '',
                                                maxPoints
                                            )}
                                            className="h-7 text-xs font-black bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg px-3 flex items-center gap-1.5 shadow-sm"
                                            disabled={isPending}
                                        >
                                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
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
                                    setActiveDoubleCheckTask({
                                        name: taskName,
                                        studentText: schuelerAntwort(item, task, tasksLayout, studentSections),
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
};
