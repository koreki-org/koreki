import React from 'react';
import { cn } from '@/lib/utils';
import { VERTRAUEN_SCHWELLE } from '@/lib/vertrauen';

interface VertrauensChipProps {
    /** Der Wert, den das Modell genannt hat — oder nichts. */
    vertrauen?: number;
    getConfidenceColor: (conf?: number) => string;
}

/**
 * Wie sicher sich die KI bei dieser Aufgabe war.
 * 🎯
 *
 * Nennt das Modell keinen Wert, steht hier grau "n. a." — nie ein rotes "0 %".
 * Die Begruendung wohnt in [lib/vertrauen](../../../lib/vertrauen.ts).
 *
 * Steht seit dem 08.09.2026 als eigene Komponente da: In der Analyse-Karte war
 * der Chip elf Zeilen mitten in einer Schleife, und die Karte liegt weit ueber
 * der Groessengrenze fuer `components/`.
 */
export const VertrauensChip: React.FC<VertrauensChipProps> = ({ vertrauen, getConfidenceColor }) => {
    const genannt = vertrauen !== undefined;
    const text = genannt ? `${vertrauen}%` : 'n. a.';

    return (
        <div
            title={genannt ? undefined : 'Die KI hat für diese Aufgabe keinen Vertrauenswert genannt.'}
            className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-black uppercase tracking-tight whitespace-nowrap",
                !genannt ? "bg-muted text-muted-foreground border-border" :
                vertrauen >= VERTRAUEN_SCHWELLE ? "bg-success/10 text-success border-success/20" :
                vertrauen >= 50 ? "bg-warning/10 text-warning border-warning/20" :
                "bg-destructive/10 text-destructive border-destructive/20"
            )}
        >
            <div className={cn("w-2 h-2 rounded-full", getConfidenceColor(vertrauen))} />
            <span className="hidden sm:inline">Ki-Vertrauen: {text}</span>
            <span className="sm:hidden">KI: {text}</span>
        </div>
    );
};
