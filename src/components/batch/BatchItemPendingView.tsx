import React from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EditableMathArea } from '../ui/EditableMathArea';
import { BatchFile, Task } from '../../types';
import { hasOcrWarnings } from '../../lib/task-utils';
import { cn } from '@/lib/utils';

interface BatchItemPendingViewProps {
    item: BatchFile;
    idx: number;
    tasksLayout: any[];
    studentSections: string[];
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
    groupedTasks: Record<string, any[]>;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
}

/**
 * BatchItemPendingView
 * 📝🏮🛡️
 * Handles the OCR verification and manual text correction UI.
 * Isolated from the review logic to ensure maximum maintainability.
 */
export const BatchItemPendingView: React.FC<BatchItemPendingViewProps> = ({
    item,
    idx,
    tasksLayout,
    studentSections,
    onUpdateText,
    groupNames,
    activeGroupName,
    onSetActiveGroupName,
    groupedTasks,
    mobileViewMode,
    previewUrl
}) => {
    return (
        <div className={cn("grid grid-cols-1 gap-4 sm:gap-8 h-fit", item.documentType === 'scanned' && "md:grid-cols-2")}>
            {/* OCR Verification View */}
            <div className={cn("flex flex-col gap-4 min-h-[300px] md:min-h-[400px] md:h-[600px]", (mobileViewMode === 'image' && item.documentType === 'scanned') ? "hidden md:flex" : "flex", "md:flex")}>
                <div className="flex-1 space-y-4 w-full flex flex-col min-h-0">
                    {/* RESTORATION: Image 2 Header Title */}
                    <div className="flex items-center gap-2 mb-3 px-1 pt-4 shrink-0">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest font-outfit">OCR Verifizierung</span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto px-2 py-1.5 -mx-2 no-scrollbar border-b border-border/50 mb-4 w-full max-w-full shrink-0">
                        {groupNames.map(name => {
                            const subtasks = groupedTasks[name];
                            const groupHasWarnings = subtasks.some(task => {
                                const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                                return hasOcrWarnings(studentSections[sIdx] || '');
                            });

                            return (
                                <Button
                                    key={name}
                                    variant={activeGroupName === name ? "default" : "secondary"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetActiveGroupName(name);
                                    }}
                                    className={cn(
                                        "rounded-xl px-4 py-2 h-auto text-xs font-bold transition-all shrink-0 border border-transparent gap-2 font-outfit",
                                        activeGroupName === name ? "bg-primary text-white shadow-md scale-105" : "bg-background text-muted-foreground hover:bg-muted border-border"
                                    )}
                                >
                                    {name}
                                    {groupHasWarnings && <AlertCircle size={12} className="text-destructive animate-pulse" />}
                                </Button>
                            );
                        })}
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-500">
                        {activeGroupName && groupedTasks[activeGroupName]?.map((task) => {
                            const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                            const sectionText = studentSections[sIdx] || '';
                            const sectionHasUncertainty = hasOcrWarnings(sectionText);

                            return (
                                <div key={task.name} className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm group">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 group-focus-within:bg-primary/5 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-bold text-foreground truncate font-outfit">{task.name}</span>
                                            {sectionHasUncertainty && (
                                                <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold h-5 px-2 shadow-none gap-1 shrink-0 animate-pulse font-outfit">
                                                    <AlertCircle size={10} /> OCR prüfen!
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-primary/10 text-primary border-none text-xs font-black h-5 px-2 rounded-lg shrink-0 font-outfit">
                                                {task.maxPoints} P
                                            </Badge>
                                        </div>
                                    </div>
                                    <EditableMathArea
                                        value={sectionText}
                                        onChange={(text) => {
                                            const updatedTasks = [...(item.tasks || [])];
                                            const taskIdxInItem = updatedTasks.findIndex(t => t.name === task.name);
                                            if (taskIdxInItem !== -1) {
                                                updatedTasks[taskIdxInItem] = { ...updatedTasks[taskIdxInItem], content: text };
                                            } else {
                                                updatedTasks.push({ name: task.name, content: text, maxPoints: task.maxPoints });
                                            }
                                            onUpdateText(idx, "", updatedTasks);
                                        }}
                                        placeholder="Schülerantwort..."
                                        className="w-full"
                                        initialEditMode={sectionHasUncertainty}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Scan column (Pending) */}
            {item.documentType === 'scanned' && (
                <div className={cn(
                    "border border-border rounded-2xl bg-muted/20 overflow-hidden relative group/img h-[80vh] md:h-[600px] shadow-inner",
                    mobileViewMode === 'text' ? "hidden md:block" : "block", "md:block"
                )}>
                    <div className="w-full h-full overflow-auto custom-scrollbar bg-muted/10 flex flex-col items-center">
                        {item.isRedacted && item.redactedDataUrls && item.redactedDataUrls.length > 0 ? (
                            item.redactedDataUrls.map((url, pIdx) => (
                                <img key={pIdx} src={url} alt={`Geschwärzter Scan Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                            ))
                        ) : item.previewDataUrls && item.previewDataUrls.length > 0 ? (
                            item.previewDataUrls.map((url, pIdx) => (
                                <img key={pIdx} src={url} alt={`Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                            ))
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Scan Vorschau" className="min-w-full object-contain p-1" />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-sm text-center h-full w-full max-w-xs m-auto space-y-2">
                                <FileText size={40} className="stroke-1 opacity-60 text-muted-foreground" />
                                <span className="font-semibold text-muted-foreground">Keine Scan-Vorschau aktiv</span>
                                <span className="text-xs text-muted-foreground">Du kannst deine Scans jederzeit nachträglich über den „Dateien verknüpfen“-Button ganz oben erneut laden.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
