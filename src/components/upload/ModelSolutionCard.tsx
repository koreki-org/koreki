import React, { useState, useMemo, useCallback } from 'react';
import { FileText, FileUp, RefreshCw } from 'lucide-react';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { PointInput } from '@/components/ui/PointInput';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { cn } from '@/lib/utils';
import { groupTasksByMain, splitTextByTasks, joinTaskSections } from '@/lib/task-utils';

interface ModelSolutionCardProps {
    modelSolution: string;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onModelSolutionChange?: (newVal: string) => void;
    onTasksChange?: (newTasks: Task[]) => void;
    isLocked?: boolean;
}

export const ModelSolutionCard: React.FC<ModelSolutionCardProps> = ({
    modelSolution,
    tasksLayout,
    extractingLayout,
    onModelUpload,
    onModelSolutionChange,
    onTasksChange,
    isLocked = false
}) => {
    const [activeGroupName, setActiveGroupName] = useState<string>("");
    const modelInputRef = React.useRef<HTMLInputElement>(null);

    const hasModel = modelSolution || extractingLayout;
    const hasTaskStructure = tasksLayout.length > 0 && hasModel && !extractingLayout;

    const taskSections = useMemo(() => {
        if (!hasTaskStructure) return [];
        
        // --- INDUSTRIAL GUARDRAIL: Prioritize partitioned content from AI ---
        const hasPartitionedContent = tasksLayout.some(t => t.content && t.content.trim().length > 0);
        if (hasPartitionedContent) {
            return tasksLayout.map(t => t.content || "");
        }

        // Fallback to regex splitting only if tasks have no content
        return splitTextByTasks(modelSolution, tasksLayout);
    }, [modelSolution, tasksLayout, hasTaskStructure]);

    const groupedTasks = useMemo(() => {
        const groups = groupTasksByMain(tasksLayout);
        const groupNames = Object.keys(groups);
        if (groupNames.length > 0 && (!activeGroupName || !groups[activeGroupName])) {
            setActiveGroupName(groupNames[0]);
        }
        return groups;
    }, [tasksLayout, activeGroupName]);

    const groupNames = Object.keys(groupedTasks);

    const totalMaxPoints = useMemo(() =>
        tasksLayout.reduce((sum, t) => sum + Number(t.maxPoints || 0), 0),
        [tasksLayout]
    );

    const handleSectionChange = useCallback((idx: number, newText: string) => {
        const updatedTasks = [...tasksLayout];
        updatedTasks[idx] = { ...updatedTasks[idx], content: newText };
        
        if (onTasksChange) {
            onTasksChange(updatedTasks);
        }
        
        if (onModelSolutionChange) {
            onModelSolutionChange(joinTaskSections(updatedTasks.map(t => t.content || ""), updatedTasks));
        }
    }, [tasksLayout, onTasksChange, onModelSolutionChange]);

    return (
        <Card className="flex flex-col border-white/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100/50">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <FileText className="text-primary" size={24} />
                    Musterlösung
                </CardTitle>
                <div className="flex items-center gap-2">
                    {hasModel && (
                        <>
                            <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 flex items-center gap-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all"
                                onClick={() => modelInputRef.current?.click()}
                            >
                                <RefreshCw size={12} className={extractingLayout ? "animate-spin" : ""} />
                                <span>Ändern</span>
                            </Button>
                        </>
                    )}
                    <KorekiTooltip 
                        title="PRO TIPP"
                        content="Eine gute Musterlösung ist das Herzstück. Dokumentieren Sie hier alle Erwartungen und Punkte pro Teilaufgabe."
                        position="bottom"
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-grow pt-4">
                {!hasModel ? (
                    <div 
                        onClick={() => modelInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-slate-200/80 rounded-[1.8rem] bg-slate-50/30 hover:bg-white/80 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 text-center group/dropzone min-h-[350px]"
                    >
                        <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md transition-all duration-300">
                            <FileUp size={36} className="text-blue-500" />
                        </div>
                        <p className="font-semibold text-slate-700 group-hover/dropzone:text-blue-600 transition-colors">Musterlösung laden (Text (.txt), PDF, Bilder)</p>
                    </div>
                ) : hasTaskStructure ? (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Aufgabenstruktur</p>
                            
                            <div className="flex gap-2 overflow-x-auto pb-4 px-1 no-scrollbar">
                                {groupNames.map(name => (
                                    <Button
                                        key={name}
                                        variant={activeGroupName === name ? "default" : "secondary"}
                                        onClick={() => setActiveGroupName(name)}
                                        className={cn(
                                            "rounded-2xl px-6 py-2 h-auto text-xs font-bold transition-all shrink-0 border border-transparent",
                                            activeGroupName === name ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-100"
                                        )}
                                    >
                                        {name}
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {activeGroupName && groupedTasks[activeGroupName]?.map((task) => {
                                    const originalIdx = tasksLayout.findIndex(t => t.name === task.name);
                                    const content = taskSections[originalIdx];

                                    return (
                                        <div key={task.name} className="relative group p-1">
                                            <div className="flex items-center justify-between mb-3 px-2">
                                                <span className="text-sm font-bold text-slate-800 tracking-tight">{task.name}</span>
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
                                                onChange={(newVal) => handleSectionChange(originalIdx, newVal)}
                                                placeholder="Musterlösung hier eingeben..."
                                                className="w-full"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100/60 flex items-center justify-between bg-white/40 p-4 rounded-2xl">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Aufgaben</span>
                                    <span className="text-lg font-black text-slate-800">{tasksLayout.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Max. Punkte</span>
                                    <span className="text-lg font-black text-primary">{totalMaxPoints}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                {extractingLayout ? "Extraktion läuft..." : "Extrahiertes Dokument"}
                            </span>
                        </div>
                        <Textarea
                            value={modelSolution}
                            onChange={(e) => onModelSolutionChange && onModelSolutionChange(e.target.value)}
                            className={cn(
                                "flex-1 min-h-[350px] p-5 rounded-[1.5rem] bg-white/50 border-slate-200 shadow-inner font-mono text-sm resize-none",
                                extractingLayout && "opacity-50 pointer-events-none"
                            )}
                            placeholder={extractingLayout ? "Lese Inhalt..." : "Inhalt der Musterlösung hier bearbeiten..."}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
