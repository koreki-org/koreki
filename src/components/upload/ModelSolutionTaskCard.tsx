import React from 'react';
import { Loader2, Sparkles, Layers, Trash2, Link2Off, HelpCircle, AlertCircle, ShieldCheck, ShieldAlert, Clock, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { PointInput } from '@/components/ui/PointInput';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { cn } from '@/lib/utils';
import { composeModelSolution } from '@/lib/task-utils';
import { Task, AppSettings } from '../../types';

/**
 * Eine Aufgabe in der Musterloesungs-Ansicht.
 *
 * Lag als 190-zeiliger Rumpf im `.map` der ModelSolutionCard. Die Karte war
 * dort bereits in sich geschlossen — sie hing nur an den Bezeichnern der
 * Elternkomponente statt an eigenen Props. Achtzehn davon sind es; das ist
 * viel, aber es macht sichtbar, wovon die Karte tatsaechlich abhaengt.
 */
export interface ModelSolutionTaskCardProps {
    task: Task;
    originalIdx: number;
    content: string;
    settings?: AppSettings;
    isLocked: boolean;
    isBatchGenerating: boolean;
    batchStatus: Record<number, 'waiting' | 'generating' | 'success' | 'error'>;
    eligibleTaskIndices: number[];
    generatingGraphForTask: number | null;
    tasksLayout: Task[];
    taskSections: string[];
    modelSolutionContext: string;
    onModelSolutionChange?: (newVal: string) => void;
    onTasksChange?: (newTasks: Task[] | ((prevTasks: Task[]) => Task[])) => void;
    onSectionChange: (idx: number, newText: string) => void;
    setEditingGraphTaskIdx: (idx: number | null) => void;
    setShowEngineSelectionTaskIdx: (idx: number | null) => void;
}

export const ModelSolutionTaskCard: React.FC<ModelSolutionTaskCardProps> = ({
    task,
    originalIdx,
    content,
    settings,
    isLocked,
    isBatchGenerating,
    batchStatus,
    eligibleTaskIndices,
    generatingGraphForTask,
    tasksLayout,
    taskSections,
    modelSolutionContext,
    onModelSolutionChange,
    onTasksChange,
    onSectionChange,
    setEditingGraphTaskIdx,
    setShowEngineSelectionTaskIdx
}) => {
                                    const isCustomSkill = !!(task.taskType && task.taskType.startsWith('custom-skill-'));
                                    const customSkillData = isCustomSkill && task.taskType ? settings?.customSkills?.[task.taskType] : null;
                                    const isCalcTrace = !!task.targetGoal || 
                                                        !!customSkillData?.isCalcTrace || 
                                                        task.taskType === 'calc-trace' || 
                                                        (!task.gradingGraph && task.predictedPluginDomain === 'math');

                                    const templateName = isCustomSkill 
                                        ? customSkillData?.name || "Vorlage"
                                        : null;

                                    const shouldSuggestGraph = !!task.suggestGraph;

                                    const batchState = batchStatus[originalIdx];
                                    const isGeneratingThisTask = generatingGraphForTask === originalIdx || batchState === 'generating';
                                    const validation = task.gradingGraph?.validation || (task.targetGoal as any)?.validation;
                                    const valError = validation?.error;

                                    // Das Schild bedeutet "durchgerechnet und bestanden" — sonst nichts.
                                    //
                                    // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand
                                    // `validation?.isValid ?? true`. Zwei Wege fuehrten damit
                                    // zu einem gruenen "Verifiziert (Dry-Run bestanden)", ohne
                                    // dass je etwas gerechnet wurde:
                                    //
                                    //   - Gar keine Validierung (ein von Hand geschriebener oder
                                    //     importierter Graph) -> `?? true` behauptete Erfolg.
                                    //   - Eine RECHENKETTE: fuer sie gibt es kein Trockenlauf-
                                    //     Verfahren, `validateCalcTraceDeterminism` stimmt
                                    //     bedingungslos zu. Ihr `isValid: true` sagt nur, dass
                                    //     die Struktur gelesen wurde.
                                    //
                                    // `dryRunChecked` unterscheidet genau das, seit
                                    // generate-calc-trace es nicht mehr faelschlich auf `true`
                                    // setzt. Ohne Trockenlauf gibt es jetzt ein neutrales
                                    // Zeichen statt eines gruenen Schildes.
                                    const wurdeDurchgerechnet = validation?.dryRunChecked === true;
                                    const isValid = wurdeDurchgerechnet && validation?.isValid === true;
                                    const istUngeprueft = !wurdeDurchgerechnet;

                                    const statusIcon = (() => {
                                        if (isGeneratingThisTask) {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0" title="Wird generiert...">
                                                    <Loader2 size={12} className="animate-spin" />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'waiting') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 animate-pulse" title="In Warteschlange...">
                                                    <Clock size={12} />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'error') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive flex items-center justify-center shrink-0" title="Fehler bei der Generierung">
                                                    <AlertCircle size={12} className="animate-bounce" />
                                                </div>
                                            );
                                        }
                                        if (task.gradingGraph || task.targetGoal) {
                                            // Weder bestanden noch durchgefallen: nichts gerechnet.
                                            if (istUngeprueft) {
                                                return (
                                                    <div
                                                        className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0"
                                                        title={isCalcTrace
                                                            ? 'Struktur gelesen — für Rechenketten gibt es keinen Dry-Run'
                                                            : 'Nicht durchgerechnet'}
                                                    >
                                                        <Shield size={14} />
                                                    </div>
                                                );
                                            }
                                            if (isValid) {
                                                return (
                                                    <div className={cn(
                                                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border",
                                                            isCalcTrace 
                                                                ? "bg-primary/10 border-primary/20 text-primary" 
                                                            : "bg-success/5 border border-success/20 text-success"
                                                    )} title="Verifiziert (Dry-Run bestanden)">
                                                        <ShieldCheck size={14} />
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="h-7 w-7 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive flex items-center justify-center shrink-0" title={`Dry-Run Validierungsfehler: ${valError || 'Fehler'}`}>
                                                        <ShieldAlert size={14} />
                                                    </div>
                                                );
                                            }
                                        }
                                        return null;
                                    })();

                                    const onToggleSuggestGraph = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (isLocked || isBatchGenerating) return;
                                        const updatedTasks = [...tasksLayout];
                                        updatedTasks[originalIdx] = {
                                            ...updatedTasks[originalIdx],
                                            suggestGraph: !updatedTasks[originalIdx].suggestGraph
                                        };
                                        onTasksChange?.(updatedTasks);
                                    };

                                    const graphActionNode = (
                                        <div className={cn(
                                            "flex items-center gap-1.5 transition-all duration-300",
                                            task.suggestGraph && !task.gradingGraph && !task.targetGoal ? "opacity-95 scale-105" : "opacity-40 hover:opacity-100"
                                        )}>
                                            {statusIcon}
                                            <button
                                                type="button"
                                                disabled={isGeneratingThisTask || batchState === 'waiting'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (task.gradingGraph || task.targetGoal) {
                                                        setEditingGraphTaskIdx(originalIdx);
                                                    } else {
                                                        setShowEngineSelectionTaskIdx(originalIdx);
                                                    }
                                                }}
                                                title={isLocked 
                                                    ? (isCalcTrace ? "Rechenkette ansehen (Schreibgeschützt)" : "Bewertungs-Graph ansehen (Schreibgeschützt)") 
                                                    : ((task.gradingGraph || task.targetGoal) 
                                                        ? (isCustomSkill ? `Vorlage "${templateName}" bearbeiten` : (isCalcTrace ? "Rechenkette bearbeiten" : "Bewertungs-Graph bearbeiten")) 
                                                        : (shouldSuggestGraph 
                                                            ? "Bewertungs-Struktur erstellen oder zuweisen (KI-Empfehlung)" 
                                                            : "Bewertungs-Struktur erstellen oder zuweisen"))
                                                }
                                                className={cn(
                                                    "h-7 w-7 rounded-lg transition-all flex items-center justify-center shrink-0 border select-none cursor-pointer focus:outline-none relative",
                                                    (task.gradingGraph || task.targetGoal) 
                                                        ? (isCustomSkill 
                                                            ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/30" 
                                                            : (isCalcTrace 
                                                                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/30" 
                                                                : "bg-success/5 border border-success/20 text-success hover:bg-success/10 hover:border-success/30"))
                                                        : (shouldSuggestGraph
                                                            ? "bg-primary/5 border-primary/20 text-primary hover:text-primary hover:border-primary/50 shadow-sm shadow-primary/10"
                                                            : "border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50")
                                                )}
                                            >
                                                <Sparkles size={12} className={cn("shrink-0", (task.gradingGraph || task.targetGoal || shouldSuggestGraph) && "animate-pulse")} />
                                                {shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && !isGeneratingThisTask && batchState !== 'waiting' && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                                    </span>
                                                )}
                                            </button>
                                            {shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && !isGeneratingThisTask && (
                                                <button
                                                    type="button"
                                                    onClick={onToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Aus dem Auto-Pilot ausschließen"
                                                    className="h-6 w-6 rounded-md bg-primary/5 border border-primary/20 text-primary hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
                                                >
                                                    <ToggleRight size={12} />
                                                </button>
                                            )}
                                            {!shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && eligibleTaskIndices.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={onToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Zum Vorevaluierungs-Durchlauf hinzufügen"
                                                    className="h-6 w-6 rounded-md bg-muted/40 border border-dashed border-border text-muted-foreground/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
                                                >
                                                    <ToggleLeft size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );


                                    return (
                                        <div key={`task-${originalIdx}`} className="relative group p-1">
                                            <div className="flex items-center justify-between mb-3 px-2">
                                                <input
                                                    type="text"
                                                    value={task.name}
                                                    onChange={(e) => {
                                                        const newName = e.target.value;
                                                        const updatedTasks = [...tasksLayout];
                                                        updatedTasks[originalIdx] = {
                                                            ...updatedTasks[originalIdx],
                                                            name: newName
                                                        };
                                                        onTasksChange?.(updatedTasks);
                                                        if (onModelSolutionChange) {
                                                            onModelSolutionChange(composeModelSolution(modelSolutionContext, updatedTasks.map(t => t.content || ""), updatedTasks));
                                                        }
                                                    }}
                                                    disabled={isLocked}
                                                    placeholder="Name der Aufgabe"
                                                    className="text-sm font-bold text-foreground tracking-tight bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 focus:outline-none transition-all duration-200 w-32 md:w-48 px-1 py-0.5 rounded-sm truncate"
                                                />
                                                <PointInput 
                                                    value={Number(task.maxPoints || 0)}
                                                    onChange={(val) => {
                                                        const updatedTasks = [...tasksLayout];
                                                        updatedTasks[originalIdx] = { ...updatedTasks[originalIdx], maxPoints: val };
                                                        onTasksChange?.(updatedTasks);
                                                    }}
                                                    disabled={isLocked}
                                                />
                                            </div>
                                            <EditableMathArea
                                                value={content || ''}
                                                onChange={(newVal) => onSectionChange(originalIdx, newVal)}
                                                placeholder="Musterlösung hier eingeben..."
                                                className="w-full"
                                                leftAction={graphActionNode}
                                            />
                                        </div>
                                    );
};
