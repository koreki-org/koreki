import React from 'react';
import { Camera, FileText, Highlighter, AlertCircle } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';

interface BatchItemStatusSummaryProps {
    item: BatchFile;
    isDone: boolean;
    onToggleType: (idx: number) => void;
    idx: number;
    itemHasWarnings: boolean;
}

/**
 * BatchItemStatusSummary
 * 🏮 Industrial Badge Group for file status and credits.
 */
export const BatchItemStatusSummary: React.FC<BatchItemStatusSummaryProps> = ({
    item, isDone, onToggleType, idx, itemHasWarnings
}) => {
    return (
        <div className="flex items-center gap-2">
            {!item.ocrDone && (
                <Badge 
                    variant="secondary" 
                    onClick={() => !isDone && onToggleType(idx)} 
                    className={cn("h-7 px-3 text-xs transition-all font-bold gap-2 ring-1 shadow-sm whitespace-nowrap shrink-0", 
                        !isDone && "cursor-pointer hover:opacity-80 transition-opacity",
                        item.documentType === 'scanned' ? "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 ring-warning/10" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 ring-primary/10")}>
                    {item.documentType === 'scanned' ? <><Camera size={14}/>{item.estimatedCredits} Credits</> : <><FileText size={14}/>Digital ({item.estimatedCredits} Credits)</>}
                </Badge>
            )}
            
            {item.isRedacted && (
                <Badge className="bg-success/10 text-success border-success/20 text-xs font-black uppercase h-5 px-2 gap-1 shadow-none rounded-md font-outfit">
                    <Highlighter size={12} /> GESCHWÄRZT
                </Badge>
            )}
            {item.status === 'error' && (
                <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 rounded-full font-outfit" title={item.error || 'Fehler bei der Analyse'}>
                    <AlertCircle size={12} /> Fehler Details
                </Badge>
            )}
            {itemHasWarnings && (
                <Badge className="bg-warning/10 text-warning border border-warning/20 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 animate-pulse rounded-full font-outfit">
                    <AlertCircle size={12} /> OCR prüfen!
                </Badge>
            )}
        </div>
    );
};
