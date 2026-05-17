import React from 'react';
import { 
    CheckCircle, AlertCircle, AlertTriangle, ChevronDown, Scissors, 
    Trash2, Highlighter, Loader2, RotateCcw
} from 'lucide-react';
import { BatchFile, Task, AppSettings } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { cn } from '@/lib/utils';
import { useBatchItemDerivations } from '../../hooks/useBatchItemDerivations';
import { BatchItemPendingView } from './BatchItemPendingView';
import { BatchItemDoneView } from './BatchItemDoneView';
import { BatchItemStatusSummary } from './parts/BatchItemStatusSummary';
import { MobileViewSelector } from './parts/MobileViewSelector';
import { useOllamaToken } from '@/hooks/useOllamaToken';

interface BatchFileListItemProps {
    item: BatchFile;
    idx: number;
    currentProcessingIndex: number | null;
    loading: boolean;
    expandedIdx: number | null;
    onToggleExpand: (idx: number | null) => void;
    onToggleSelect: (idx: number) => void;
    onToggleType: (idx: number) => void;
    onRemoveFile: (idx: number) => void;
    onSplit: (idx: number) => void;
    onRedact: (idx: number) => void;
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    previewUrl: string | null;
    showScan: boolean;
    onToggleScan: (idx: number) => void;
    mobileViewMode: 'text' | 'image';
    onSetMobileViewMode: (mode: 'text' | 'image') => void;
    tasksLayout: any[];
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
    groupedTasks: Record<string, any[]>;
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    onProcessSingleFile?: (idx: number) => void;
    settings?: AppSettings;
}

/**
 * BatchFileListItem (Industrial Shell)
 * 🏢🏮🛡️
 * Orchestrates the display of a single file in the batch processing queue.
 * Thin Shell Architecture - Delegated to sub-components.
 */
export const BatchFileListItem: React.FC<BatchFileListItemProps> = (props) => {
    const {
        item, idx, currentProcessingIndex, loading, expandedIdx, onToggleExpand,
        onToggleSelect, onToggleType, onRemoveFile, onSplit, onRedact, 
        mobileViewMode, onSetMobileViewMode, onProcessSingleFile
    } = props;

    const { 
        itemHasWarnings, reviewRecommended, scorePercentage, isProcessing, isDone, studentSections, warnings 
    } = useBatchItemDerivations(props);
    const isExpanded = expandedIdx === idx;
    const { streamedText } = useOllamaToken(isProcessing && idx === currentProcessingIndex, idx);


    return (
        <div className={cn(
            "group rounded-2xl border transition-all duration-300",
            idx === currentProcessingIndex ? "bg-primary/5 border-primary/20 ring-2 ring-primary/10 shadow-md" : (isDone ? "bg-emerald-50/10 border-emerald-100 hover:border-emerald-200 hover:shadow-md" : "bg-background/80 border-border hover:border-primary/20 hover:shadow-md"),
            isExpanded ? "shadow-lg bg-background" : "",
            (itemHasWarnings || (warnings && warnings.length > 0)) && "border-orange-300 bg-orange-50/20 ring-1 ring-orange-100 shadow-sm"
        )}>
            {/* ITEM HEADER */}
            <div className="flex items-center justify-between p-2 sm:p-3 gap-2 sm:gap-4 relative">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 flex items-center gap-2 w-5 justify-center">
                        {isProcessing ? (
                            <Loader2 size={16} className="animate-spin text-primary" />
                        ) : isDone ? (
                            /* Industrial Success State */
                            <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                        ) : item.status === 'pending' ? (
                            loading && item.documentType === 'scanned' && !item.ocrDone ? (
                                <Loader2 size={14} className="animate-spin text-slate-300" />
                            ) : (
                                <Checkbox 
                                    checked={item.selected !== false} 
                                    disabled={loading && !item.ocrDone} 
                                    onChange={() => onToggleSelect(idx)} 
                                    className={cn(
                                        "w-5 h-5 rounded-md m-0 transition-all",
                                        item.ocrDone && "border-primary bg-primary/5 accent-primary ring-offset-primary/10"
                                    )} 
                                />
                            )
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 max-w-full overflow-hidden">
                        {item.status === 'error' && <AlertCircle size={20} className="text-destructive shrink-0 animate-pulse" />}
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate tracking-tight text-sm sm:text-base font-outfit">{item.name}</span>
                            {isProcessing && streamedText && (
                                <div className="text-[10px] text-primary font-mono truncate max-w-[200px] animate-pulse">
                                    KI schreibt: {streamedText.substring(streamedText.length - 40)}
                                </div>
                            )}
                        </div>


                        
                        <BatchItemStatusSummary item={item} isDone={isDone} onToggleType={onToggleType} idx={idx} itemHasWarnings={itemHasWarnings} />
                        
                        {item.status === 'error' && onProcessSingleFile && !isProcessing && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); onProcessSingleFile(idx); }}
                                className="h-7 px-3 bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white transition-all rounded-full flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider"
                            >
                                <RotateCcw size={12} />
                                Korrektur neu starten
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!isProcessing && item.status === 'pending' && (
                        <>
                            {item.pageCount && item.pageCount > 1 && <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onSplit(idx); }} className="h-8 w-8 text-sky-600 border-sky-100 bg-sky-50 hover:bg-sky-600 hover:text-white transition-all"><Scissors size={14}/></Button>}
                            {item.documentType === 'scanned' && <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onRedact(idx); }} className="h-8 w-8 text-primary border-primary/20 bg-primary/5 hover:bg-primary hover:text-white transition-all rounded-lg"><Highlighter size={14}/></Button>}
                        </>
                    )}
                    {isDone && (
                        <div className="flex items-center gap-2">
                            {reviewRecommended && (
                                <Badge className="hidden sm:flex bg-amber-50 text-amber-700 border-amber-200 h-7 px-3 text-[10px] font-black uppercase tracking-tight gap-1.5 shadow-sm animate-pulse rounded-lg">
                                    <AlertTriangle size={12} className="text-amber-600" /> Review
                                </Badge>
                            )}
                            <div className="flex items-center gap-3">
                                {scorePercentage !== null && <span className="text-[10px] sm:text-xs font-black text-muted-foreground">{scorePercentage}%</span>}
                                <Badge className="bg-emerald-500 text-white h-7 px-3 text-xs font-black tracking-tight shadow-sm border-0 rounded-lg">{item.grade}</Badge>
                            </div>
                        </div>
                    )}
                    {!isProcessing && <Button variant="ghost" size="icon" onClick={() => onRemoveFile(idx)} className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-all rounded-lg"><Trash2 size={14}/></Button>}
                    {(item.fileText || item.tasks) && <Button variant="ghost" size="icon" onClick={() => onToggleExpand(isExpanded ? null : idx)} aria-label="Details" className="h-8 w-8 text-muted-foreground transition-transform duration-300 rounded-lg" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}><ChevronDown size={18} /></Button>}
                </div>
            </div>

            {/* EXPANDED CONTENT AREA */}
            {isExpanded && (item.fileText || item.tasks) && (
                <div className="p-4 pt-0 border-t border-border bg-muted/5 animate-in slide-in-from-top-2">
                    <MobileViewSelector mobileViewMode={mobileViewMode} onSetMobileViewMode={onSetMobileViewMode} isDone={isDone} />
                    
                    {isDone ? (
                        <BatchItemDoneView {...props} studentSections={studentSections} />
                    ) : (
                        <BatchItemPendingView {...props} studentSections={studentSections} />
                    )}
                </div>
            )}
        </div>
    );
};
