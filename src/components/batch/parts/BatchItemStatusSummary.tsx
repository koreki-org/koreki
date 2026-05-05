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
                        item.documentType === 'scanned' ? "bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-100 ring-amber-500/10" : "bg-sky-50 text-sky-700 border-sky-200/50 hover:bg-sky-100 ring-sky-500/10")}>
                    {item.documentType === 'scanned' ? <><Camera size={14}/>{item.estimatedCredits} Credits</> : <><FileText size={14}/>Digital ({item.estimatedCredits} Credits)</>}
                </Badge>
            )}
            
            {item.isRedacted && (
                <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 text-xs font-black uppercase h-5 px-2 gap-1 shadow-none rounded-md font-outfit">
                    <Highlighter size={12} /> GESCHWÄRZT
                </Badge>
            )}
            {item.status === 'error' && (
                <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 rounded-full font-outfit" title={item.error || 'Fehler bei der Analyse'}>
                    <AlertCircle size={12} /> Fehler Details
                </Badge>
            )}
            {itemHasWarnings && (
                <Badge className="bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 animate-pulse rounded-full font-outfit">
                    <AlertCircle size={12} /> OCR prüfen!
                </Badge>
            )}
        </div>
    );
};
