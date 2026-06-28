import React from 'react';
import { AlertTriangle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';

interface BatchDoneHeaderProps {
    item: BatchFile;
    idx: number;
    showScan: boolean;
    onToggleScan: (idx: number) => void;
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
}

/**
 * BatchDoneHeader
 * 🏮 Industrial Navigation & Status Header
 */
export const BatchDoneHeader: React.FC<BatchDoneHeaderProps> = ({
    item,
    idx,
    showScan,
    onToggleScan,
    groupNames,
    activeGroupName,
    onSetActiveGroupName
}) => {
    const lowConfidenceTasks = item.result?.tasks.filter(t => (t.confidence || 0) < 90) || [];
    
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 border-b border-border mb-4 sm:mb-6 gap-3 w-full overflow-hidden">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar max-w-full">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 shrink-0">
                        <Sparkles size={14} className="text-primary hidden sm:block" />
                        <span className="hidden sm:inline">KI-Korrektur Review</span>
                        <span className="sm:hidden">KI-Review</span>
                    </span>
                    {item.documentType === 'scanned' && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleScan(idx);
                            }}
                            className={cn("h-8 px-4 text-xs font-bold gap-2 transition-all rounded-lg shrink-0 shadow-sm", 
                                showScan ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-background text-foreground border-border hover:bg-muted")}
                        >
                            <ImageIcon size={14} /> {showScan ? "Scan aus" : "Scan ein"}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 px-1 border-b border-border/50 mb-6 mt-2 w-full">
                {/* LEFT SIDE: Task Navigation */}
                <div className="flex gap-2 overflow-x-auto px-2 py-1.5 -mx-2 no-scrollbar scrollbar-hide flex-1">
                    {groupNames.map(name => (
                        <Button
                            key={name}
                            variant={activeGroupName === name ? "default" : "secondary"}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetActiveGroupName(name);
                            }}
                            className={cn(
                                "rounded-xl px-4 py-2 h-9 text-xs font-bold transition-all shrink-0 border border-transparent gap-2",
                                activeGroupName === name ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-muted-foreground hover:bg-muted border-border"
                            )}
                        >
                            {name}
                        </Button>
                    ))}
                </div>

                {/* RIGHT SIDE: Specific Review Recommendation */}
                {lowConfidenceTasks.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-700 shrink-0 border-l border-border pl-4 h-8">
                        <Badge variant="secondary" className="hidden lg:flex bg-warning/10 text-warning border-warning/20 h-8 px-3 text-xxs font-black uppercase tracking-tight gap-1.5 shadow-sm rounded-lg">
                            <AlertTriangle size={12} className="text-warning" /> Review empfohlen!
                        </Badge>
                        {/* RESTORATION: Specifically linkable task button */}
                        {lowConfidenceTasks.slice(0, 1).map(t => (
                            <Button 
                                key={`warn-btn-${t.name}`}
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // 🏮 INDUSTRIAL LOGIC (Wrapped for clarity)
                                    const match = t.name?.match(/^(.*?\d+)/);
                                    const mainGroup = match ? match[1].trim() : (t.name || "");
                                    onSetActiveGroupName(mainGroup);
                                    
                                    setTimeout(() => {
                                        const safeTaskName = t.name?.replace(/\s+/g, '-').toLowerCase();
                                        const el = document.getElementById(`task-card-${idx}-${safeTaskName}`);
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                }}
                                className="h-8 px-4 text-xs font-bold text-muted-foreground border-border hover:bg-warning/10 hover:text-warning hover:border-warning/20 transition-all rounded-lg"
                            >
                                {t.name}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
