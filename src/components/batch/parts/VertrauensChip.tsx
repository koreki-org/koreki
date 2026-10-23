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
    // Fehlt der Wert, gibt es nichts zu melden — kein "0 %", kein "n. a.".
    if (vertrauen === undefined) return null;

    // Vom 12.10. bis 23.10.2026 schwieg der Chip bei sicheren Werten ganz. Das
    // war zu still: Die Lehrkraft vermisste den Wert und hielt ihn fuer
    // verschwunden. Jetzt steht er leise in Grau da — sichtbar, aber ohne
    // Farbe, weil es nichts zu tun gibt. Laut wird es erst unter der Schwelle.
    if (vertrauen >= VERTRAUEN_SCHWELLE) {
        return (
            <span
                title="So sicher war sich die KI nach eigener Einschätzung — keine gemessene Trefferquote."
                className="text-xs text-muted-foreground tabular-nums whitespace-nowrap"
            >
                KI-Vertrauen {vertrauen} %
            </span>
        );
    }

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
