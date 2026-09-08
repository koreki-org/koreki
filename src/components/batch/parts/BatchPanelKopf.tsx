import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Die Ueberschrift einer Spalte der Korrekturansicht.
 * 🔎
 *
 * Am 08.09.2026 aus `BatchSolutionPanel` und `BatchTaskAnalysisCard`
 * herausgeloest — sie stand dort zweimal fast wortgleich. Seit die Aufgaben in
 * einem gemeinsamen Raster liegen, gehoert sie ohnehin EINMAL nach oben und
 * nicht je Aufgabe.
 */

interface BatchPanelKopfProps {
    icon: React.ReactNode;
    /** Sichtbare Beschriftung, z. B. "Erkannte Schülerlösung". */
    titel: string;
    /** Welche Spalte dieser Kopf ueberschreibt. */
    seite: 'left' | 'right';
    focusedPanel?: 'left' | 'right' | null;
    onToggleFocus?: (panel: 'left' | 'right' | null) => void;
}

export const BatchPanelKopf: React.FC<BatchPanelKopfProps> = ({
    icon, titel, seite, focusedPanel, onToggleFocus
}) => {
    const fokussiert = focusedPanel === seite;

    return (
        <div className="flex items-center justify-between gap-2 mb-2 w-full shrink-0">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-outfit">{titel}</span>
            </div>
            {onToggleFocus && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleFocus(fokussiert ? null : seite)}
                    className="hidden md:inline-flex h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-all duration-200"
                    title={fokussiert ? "Fokus beenden" : "Panel maximieren"}
                >
                    {fokussiert ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </Button>
            )}
        </div>
    );
};
