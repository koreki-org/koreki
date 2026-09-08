import React from 'react';
import { FileText, Maximize2, Minimize2 } from 'lucide-react';
import { BatchFile, Task } from '../../../types';
import { cn } from '@/lib/utils';
import { BatchSolutionTaskCell } from './BatchSolutionTaskCell';

interface BatchSolutionPanelProps {
    item: BatchFile;
    showScan: boolean;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
    activeGroupName: string;
    groupedTasks: Record<string, Task[]>;
    tasksLayout: Task[];
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
                        className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-200"
                        title={focusedPanel === 'left' ? "Fokus beenden" : "Panel maximieren"}
                    >
                        {focusedPanel === 'left' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                )}
            </div>

            {showScan ? (
                /* Weiss wie die rechte Spalte: Beide Seiten liegen als Karten auf dem
                    grauen Behaelter. Vorher war hier bg-muted/30 — auf weissem Grund
                    eine leichte Toenung, auf dem neuen grauen Grund grau auf grau. */
                <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden relative shadow-sm h-[80vh] md:h-[600px] transition-all duration-300">
                    <div className="w-full h-full overflow-auto custom-scrollbar bg-background/50 flex flex-col items-center">
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
                                <span className="font-semibold text-foreground">Keine Scan-Vorschau aktiv</span>
                                <span className="text-xs text-muted-foreground">Du kannst deine Scans jederzeit nachträglich über den „Dateien verknüpfen“-Button ganz oben erneut laden.</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 space-y-6 max-h-[80vh] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {(activeGroupName && groupedTasks[activeGroupName] ? groupedTasks[activeGroupName] : (item.result?.tasks || [])).map((task) => (
                        <BatchSolutionTaskCell
                            key={task.name}
                            item={item}
                            idx={idx}
                            task={task}
                            tasksLayout={tasksLayout}
                            studentSections={studentSections}
                            onUpdateText={onUpdateText}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
