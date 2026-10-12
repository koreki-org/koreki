import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from './Input';
import { cn } from '@/lib/utils';

interface PointInputProps {
    value: number;
    maxPoints?: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    className?: string;
    /** Whether to show the "/ {maxPoints}" part. Default is false. */
    showMaxPoints?: boolean;
}

/**
 * PointInput
 * Eingabe der Punkte einer Aufgabe, in Schritten von 0,5.
 *
 * Seit dem 12.10.2026 EIN Bedienelement: [ − Wert + ] und daneben "/ max P".
 * Vorher steckte ein weisses Feld mit eigenem Rand in einem grauen Kasten mit
 * Rand und Schatten (vier Abgrenzungsmittel), die Pfeile waren 10 px gross, und
 * die Zahl stand in der Akzentfarbe — sie las sich wie ein Link statt wie ein
 * Wert. Die Hoehe (28 px) bleibt unter der Kopfzeile der Aufgabe, damit linke
 * und rechte Spalte der Pruefansicht auf gleicher Hoehe bleiben.
 */
export const PointInput: React.FC<PointInputProps> = ({
    value,
    maxPoints,
    onChange,
    disabled = false,
    className,
    showMaxPoints = false
}) => {
    const handleAdjust = (delta: number) => {
        if (disabled) return;
        const current = typeof value === 'number' ? value : 0;
        onChange(Math.max(0, current + delta));
    };

    const schritt = "h-full w-6 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:bg-foreground/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent";

    return (
        <div className={cn("inline-flex items-center gap-1.5", className)}>
            <div className={cn(
                "inline-flex items-center h-7 rounded-md border border-border bg-card overflow-hidden transition-colors",
                // Nur das Tippen in die Zahl faerbt den Rand — nicht der Klick auf − oder +.
                !disabled && "hover:border-foreground/30 [&:has(input:focus)]:border-primary",
                disabled && "opacity-60"
            )}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAdjust(-0.5)}
                    aria-label="Einen halben Punkt weniger"
                    className={schritt}
                >
                    <Minus size={12} />
                </button>
                <Input
                    type="number"
                    step="0.5"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    aria-label="Punkte"
                    className="w-8 h-full p-0 border-0 rounded-none bg-transparent text-center text-sm font-semibold tabular-nums text-foreground no-spinners focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAdjust(0.5)}
                    aria-label="Einen halben Punkt mehr"
                    className={schritt}
                >
                    <Plus size={12} />
                </button>
            </div>

            <span className="text-xs text-muted-foreground tabular-nums select-none whitespace-nowrap">
                {showMaxPoints && maxPoints !== undefined ? `/ ${maxPoints} P` : "P"}
            </span>
        </div>
    );
};
