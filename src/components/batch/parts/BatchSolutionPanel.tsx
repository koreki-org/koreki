import React from 'react';
import { FileText } from 'lucide-react';
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
    idx
}) => {
    return (
        <div className={cn("flex flex-col gap-4 animate-in fade-in duration-500 min-h-[400px]", 
            mobileViewMode === 'image' ? "hidden md:flex" : "flex", "md:flex flex-1")}>
            {showScan ? (
                <div className="flex-1 border border-border rounded-2xl bg-muted/30 overflow-hidden relative shadow-inner h-full min-h-[500px] transition-all duration-300">
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
                <div className="flex-1 space-y-6 max-h-[80vh] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Erkannte Schülerlösung</span>
                    </div>
                    {(activeGroupName && groupedTasks[activeGroupName] ? groupedTasks[activeGroupName] : (item.result?.tasks || [])).map((task) => {
                        const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                        let sectionText = sIdx !== -1 ? (studentSections[sIdx] || '') : '';
                        if (!sectionText && item.result) {
                            const aiTask = item.result.tasks.find(t => t.name === task.name || t.name?.toLowerCase() === task.name?.toLowerCase());
                            sectionText = aiTask?.content || '';
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
