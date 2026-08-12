import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

/**
 * JSON-Ansicht des Bewertungsgraphen.
 *
 * Erster von vier Reitern, die aus GradingGraphModal herausgeloest werden. Die
 * Reiter teilen sich keinen Zustand untereinander — sie bekommen, was sie
 * anzeigen, und melden Aenderungen nach oben. Genau deshalb lassen sie sich
 * einzeln bewegen und einzeln pruefen.
 */
interface GraphJsonPanelProps {
    jsonText: string;
    /** Meldung des Parsers, oder null wenn der Text gueltig ist. */
    jsonError: string | null;
    isLocked: boolean;
    onJsonChange: (value: string) => void;
}

export const GraphJsonPanel: React.FC<GraphJsonPanelProps> = ({
    jsonText,
    jsonError,
    isLocked,
    onJsonChange
}) => (
    <div className="flex-grow flex flex-col overflow-hidden bg-foreground border-l border-border animate-in slide-in-from-left-4 duration-300">
        <div className="px-6 py-2 border-b border-background/10 bg-foreground flex justify-between items-center shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-background/60 font-mono">raw_graph_config.json</span>
            {jsonError ? (
                <span className="text-xs font-bold text-destructive flex items-center gap-1">
                    <AlertCircle size={10} /> Syntax-Fehler!
                </span>
            ) : (
                <span className="text-xs font-bold text-success flex items-center gap-1">
                    <Check size={10} /> Validiert
                </span>
            )}
        </div>
        <Textarea
            value={jsonText}
            readOnly={isLocked}
            onChange={(e) => onJsonChange(e.target.value)}
            className="flex-grow p-6 bg-foreground text-background/80 font-mono text-xs outline-hidden border-none resize-none overflow-y-auto leading-relaxed"
        />
        {jsonError && (
            <div className="p-3 bg-destructive/15 border-t border-destructive/30 text-xs font-bold text-destructive leading-relaxed font-mono">
                {jsonError}
            </div>
        )}
    </div>
);
