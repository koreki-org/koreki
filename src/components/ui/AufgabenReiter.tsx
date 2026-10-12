import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface AufgabenReiterProps {
    namen: string[];
    aktiv: string;
    onWaehle: (name: string) => void;
    /** Reiter, deren Aufgaben etwas zu pruefen haben, tragen eine Warnmarke. */
    warnung?: (name: string) => boolean;
    className?: string;
}

/**
 * Die Aufgaben-Reiter ("Aufgabe 1 · Aufgabe 2 · …") als ein Umschalter.
 *
 * Steht an drei Stellen: Musterlösung, offene Arbeit, Prüfansicht. Bis zum
 * 12.10.2026 war jede eine eigene Kopie, und nach dem Umbau der Prüfansicht sah
 * die Musterlösung sofort anders aus als die Arbeit daneben. Deshalb EIN
 * Baustein.
 */
export const AufgabenReiter: React.FC<AufgabenReiterProps> = ({ namen, aktiv, onWaehle, warnung, className }) => (
    <div className={cn("flex w-fit max-w-full gap-1 overflow-x-auto p-1 rounded-lg bg-foreground/5 no-scrollbar scrollbar-hide", className)}>
        {namen.map(name => (
            <Button
                key={name}
                variant="ghost"
                onClick={(e) => {
                    e.stopPropagation();
                    onWaehle(name);
                }}
                className={cn(
                    "px-4 h-8 text-sm shrink-0 rounded-md gap-1.5",
                    aktiv === name
                        ? "bg-card text-foreground shadow-sm hover:bg-card"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                {name}
                {warnung?.(name) && <AlertCircle size={12} className="text-destructive" />}
            </Button>
        ))}
    </div>
);
