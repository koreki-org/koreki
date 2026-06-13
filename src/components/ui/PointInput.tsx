import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
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
 * 🧠 Specialized UI component for entry of task points.
 * Now featuring "Koreki Premium Controls" for 0.5 step increments.
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

    return (
        <div className={cn(
            "flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/40 transition-all duration-300",
            !disabled && "focus-within:bg-primary/5 focus-within:border-primary/20 hover:border-border/60 shadow-sm",
            disabled && "opacity-60 bg-slate-100/50 border-slate-200 grayscale-[0.2]",
            className
        )}>
            <div className="flex items-center gap-1.5 shrink-0 order-1">
                <Input 
                    type="number" 
                    step="0.5"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-12 h-8 px-1 bg-background border border-border rounded-lg text-center text-xs font-black text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 no-spinners leading-none transition-all shadow-inner"
                />

                <div className="flex flex-col gap-0.5">
                    <button 
                        disabled={disabled}
                        type="button"
                        onClick={() => handleAdjust(0.5)}
                        className="p-0.5 hover:bg-primary/10 rounded-sm text-primary/60 hover:text-primary transition-colors disabled:opacity-0"
                    >
                        <ChevronUp size={10} strokeWidth={3} />
                    </button>
                    <button 
                        disabled={disabled}
                        type="button"
                        onClick={() => handleAdjust(-0.5)}
                        className="p-0.5 hover:bg-primary/10 rounded-sm text-primary/60 hover:text-primary transition-colors disabled:opacity-0"
                    >
                        <ChevronDown size={10} strokeWidth={3} />
                    </button>
                </div>
            </div>

            <span className="text-xs font-bold text-muted-foreground pr-1 select-none font-outfit uppercase tracking-wider order-2 whitespace-nowrap">
                {showMaxPoints && maxPoints !== undefined ? `/ ${maxPoints} P` : "P"}
            </span>
        </div>
    );
};
