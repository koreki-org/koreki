import React from 'react';
import { Camera, FileText, FileQuestion, Highlighter, AlertCircle } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';
import { zeigtCredits } from '@/lib/env-context';
import { istVollstaendigGeschwaerzt } from '@/lib/privacy-utils';

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
 *
 * Das Typ-Abzeichen hat DREI Zustaende, nicht zwei. Bis zum 09.11.2026 zeigte
 * es „Digital" fuer alles, was nicht `'scanned'` war — auch fuer `'unknown'`,
 * also fuer eine Arbeit, deren Typ noch niemand gewaehlt hat. Das war lange
 * folgenlos, weil der Typ-Dialog immer etwas schrieb (auch beim „Abbrechen").
 * Seit Abbrechen wirklich abbricht, bleiben ungetypte Arbeiten stehen — und ein
 * Abzeichen, das dann „Digital" behauptet, ist schlicht falsch: Ein Scan wuerde
 * ohne Texterkennung gelesen und ergaebe leeren oder wirren Text.
 *
 * `undefined` ist NICHT dasselbe wie `'unknown'`: Moodle-Arbeiten kommen ohne
 * Feld und sind echter Digitaltext. Nur das ausdrueckliche `'unknown'` meint
 * „noch nicht entschieden".
 *
 * Die Schrift bleibt `text-foreground`, nicht `text-muted-foreground`: Im Koreki
 * Design System heisst Grau DEAKTIVIERT — und dieses Abzeichen ist das einzige,
 * das man anklicken MUSS. Grau ist hier nur der Grund, weil weder die Farbe von
 * „Scan" noch die von „Digital" in Frage kommt: Beide waeren eine Aussage, und
 * eine Aussage gibt es gerade nicht.
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
                        item.documentType === 'scanned' ? "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 ring-warning/10"
                            : item.documentType === 'unknown' ? "bg-muted text-foreground border-border hover:bg-foreground/5 ring-border/50"
                            : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 ring-primary/10")}
                    title={item.documentType === 'unknown' ? 'Noch nicht entschieden — klicken, um zwischen Scan und digitalem Text zu wechseln' : undefined}>
                    {item.documentType === 'scanned'
                        ? <><Camera size={14}/>{zeigtCredits() ? `${item.estimatedCredits} Credits` : 'Scan'}</>
                        : item.documentType === 'unknown'
                        ? <><FileQuestion size={14}/>Typ wählen</>
                        : <><FileText size={14}/>Digital{zeigtCredits() ? ` (${item.estimatedCredits} Credits)` : ''}</>}
                </Badge>
            )}

            {item.isRedacted && (istVollstaendigGeschwaerzt(item) ? (
                <Badge className="bg-success/10 text-success border-transparent h-6 px-2 gap-1">
                    <Highlighter size={12} /> Geschwärzt
                </Badge>
            ) : (
                <Badge className="bg-warning/10 text-warning border-transparent h-6 px-2 gap-1">
                    <Highlighter size={12} /> Teilweise geschwärzt
                </Badge>
            ))}
            {item.status === 'error' && (
                <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 rounded-full" title={item.error || 'Fehler bei der Analyse'}>
                    <AlertCircle size={12} /> Fehler Details
                </Badge>
            )}
            {itemHasWarnings && (
                <Badge className="bg-warning/10 text-warning border border-warning/20 text-xs font-bold h-6 px-3 shadow-none gap-1.5 shrink-0 rounded-full">
                    <AlertCircle size={12} /> OCR prüfen!
                </Badge>
            )}
        </div>
    );
};
