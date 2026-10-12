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
    // Seit dem 12.10.2026 spricht der Chip nur noch, wenn es etwas zu tun gibt
    // (koreki-design-system §2: "Bitte prüfen" statt Konfidenz). Ein sicheres
    // "100 %" an jeder Aufgabe war Rauschen; fehlt der Wert, gibt es nichts zu melden.
    if (vertrauen === undefined || vertrauen >= VERTRAUEN_SCHWELLE) return null;

    return (
        <div
            title={`Die KI war sich bei dieser Aufgabe unsicher (${vertrauen} %).`}
            className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                // Unter 50 bleibt es rot: Eine genannte Null kommt auch aus
                // `mapMissingTask` — dort wurde tatsaechlich nichts ausgewertet.
                vertrauen < 50 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
            )}
        >
            <div className={cn("w-1.5 h-1.5 rounded-full", getConfidenceColor(vertrauen))} />
            Bitte prüfen
        </div>
    );
};
