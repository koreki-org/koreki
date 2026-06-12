import React from 'react';
import { FileText, Maximize2, Minimize2 } from 'lucide-react';
import { BatchFile, Task } from '../../../types';
import { cn } from '@/lib/utils';
import { EditableMathArea } from '../../ui/EditableMathArea';

interface BatchSolutionPanelProps {
    item: BatchFile;
    showScan: boolean;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
    activeGroupName: string;
    groupedTasks: Record<string, any[]>;
    tasksLayout: any[];
    studentSections: string[];
    onUpdateText?: (idx: number, text: string, tasks?: Task[]) => void;
    idx: number;
    focusedPanel?: 'left' | 'right' | null;
    onToggleFocus?: (panel: 'left' | 'right' | null) => void;
}

/**
 * BatchSolutionPanel
 * 🔎 Displays student solution (Text or Scan/Preview)
 */
export const BatchSolutionPanel: React.FC<BatchSolutionPanelProps> = ({
    item,
    showScan,
    mobileViewMode,
    previewUrl,
    activeGroupName,
    groupedTasks,
    tasksLayout,
    studentSections,
    onUpdateText,
    idx,
    focusedPanel,
    onToggleFocus
}) => {
    return (
        <div className={cn("flex flex-col gap-4 animate-in fade-in duration-500 min-h-[400px] flex-1", 
            mobileViewMode === 'image' ? "hidden md:flex" : "flex", "md:flex")}>
            
            {/* Static Header with Focus controls */}
            <div className="flex items-center justify-between gap-2 mb-2 w-full shrink-0">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {showScan ? "Original-Scan der Schülerlösung" : "Erkannte Schülerlösung"}
                    </span>
                </div>
                {onToggleFocus && (
                    <button
                        onClick={() => onToggleFocus(focusedPanel === 'left' ? null : 'left')}
                        className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-primary transition-all duration-200"
                        title={focusedPanel === 'left' ? "Fokus beenden" : "Panel maximieren"}
                    >
                        {focusedPanel === 'left' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                )}
            </div>

            {showScan ? (
                <div className="flex-1 border border-border rounded-2xl bg-muted/30 overflow-hidden relative shadow-inner h-[80vh] md:h-[600px] transition-all duration-300">
                    <div className="w-full h-full overflow-auto custom-scrollbar bg-background/50 flex flex-col items-center">
                        {item.isRedacted && item.redactedDataUrls && item.redactedDataUrls.length > 0 ? (
                            item.redactedDataUrls.map((url, pIdx) => (
                                <img key={pIdx} src={url} alt={`Geschwärzter Scan Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                            ))
                        ) : item.previewDataUrls && item.previewDataUrls.length > 0 ? (
                            item.previewDataUrls.map((url, pIdx) => (
                                <img key={pIdx} src={url} alt={`Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                            ))
                        ) : (
                            <img src={previewUrl || ''} alt="Scan Vorschau" className="min-w-full object-contain p-1" />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-6 h-[80vh] md:h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {(activeGroupName && groupedTasks[activeGroupName] ? groupedTasks[activeGroupName] : (item.result?.tasks || [])).map((task) => {
                        const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                        let sectionText = '';
                        
                        // Priority 1: Edited text stored in the AI Result (item.result.tasks)
                        if (item.status === 'done' && item.result) {
                            const aiTask = item.result.tasks.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                            if (aiTask && aiTask.content) {
                                sectionText = aiTask.content;
                            }
                        }
                        
                        // Priority 2: Original OCR split from studentSections
                        if (!sectionText) {
                            sectionText = sIdx !== -1 ? (studentSections[sIdx] || '') : '';
                        }
                        return (
                            <div key={task.id || task.name || task.idx}>
                                <EditableMathArea
                                    value={sectionText}
                                    onChange={(newText) => {
                                        if (onUpdateText) {
                                            const baseTasks = (item.status === 'done' && item.result) ? item.result.tasks : (item.tasks || []);
                                            const updatedTasks = [...baseTasks];
                                            const taskIdxInItem = updatedTasks.findIndex(t => t.name === task.name);
                                            if (taskIdxInItem !== -1) {
                                                updatedTasks[taskIdxInItem] = { ...updatedTasks[taskIdxInItem], content: newText };
                                            } else {
                                                updatedTasks.push({ name: task.name, content: newText, maxPoints: task.maxPoints });
                                            }
                                            onUpdateText(idx, "", updatedTasks);
                                        }
                                    }}
                                    placeholder="Schülerantwort..."
                                    className="w-full"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
