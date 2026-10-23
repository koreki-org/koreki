import React from 'react';
import { cn } from '@/lib/utils';

interface LaufBalkenProps {
    /** Fertig / gesamt. Ohne Zahlen läuft der Balken nur durch: es läuft, Ende unbekannt. */
    fortschritt?: { fertig: number; gesamt: number; einheit: string };
    className?: string;
}

/**
 * Der Balken unter einer Lauf-Anzeige — im Stapel und in der Musterlösung.
 * ⏱️
 */
export const LaufBalken: React.FC<LaufBalkenProps> = ({ fortschritt, className }) => {
    if (!fortschritt) {
        return (
            <div className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)} role="progressbar" aria-label="Läuft">
                <div className="h-full bg-primary rounded-full animate-loading-bar" />
            </div>
        );
    }
    const { fertig, gesamt, einheit } = fortschritt;
    return (
        <div
            className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={gesamt}
            aria-valuenow={fertig}
            aria-label={`${fertig} von ${gesamt} ${einheit} fertig`}
        >
            <div className="h-full bg-primary" style={{ width: `${(fertig / gesamt) * 100}%` }} />
        </div>
    );
};
