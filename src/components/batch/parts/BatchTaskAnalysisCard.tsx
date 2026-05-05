import React from 'react';
import { Sparkles } from 'lucide-react';
import { PointInput } from '../../ui/PointInput';
import { Textarea } from '../../ui/Textarea';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';

interface BatchTaskAnalysisCardProps {
    item: BatchFile;
    idx: number;
    activeGroupName: string;
    groupedTasks: Record<string, any[]>;
    mobileViewMode: 'text' | 'image';
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
}

/**
 * BatchTaskAnalysisCard
 * 🧠 The core grading interface for each task.
 * Refined for High-Performance Industrial Review.
 */
export const BatchTaskAnalysisCard: React.FC<BatchTaskAnalysisCardProps> = ({
    item,
    idx,
    activeGroupName,
    groupedTasks,
    mobileViewMode,
    getConfidenceColor,
    handleReviewPointChange,
    handleReviewFeedbackChange
}) => {
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
                    </div>
                );
            })}
        </div>
    );
};
