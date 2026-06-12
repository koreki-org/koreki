import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface KorekiTooltipProps {
    title: string;
    content: React.ReactNode;
    footer?: React.ReactNode;
    position?: 'top' | 'bottom';
    iconSize?: number;
    className?: string;
    buttonClassName?: string;
    widthClass?: string; // Optional width override (e.g. w-72, w-80, w-96)
    align?: 'left' | 'right' | 'center';
}

/**
 * Koreki Premium Tooltip Component
 * Kapselt das einheitliche Look & Feel (Glassmorphismus, Outfit-Font, Indigo-Accent)
 * für Hilfetexte in der gesamten App.
 */
export const KorekiTooltip: React.FC<KorekiTooltipProps> = ({
    title,
    content,
    footer,
    position = 'bottom',
    iconSize = 18,
    className,
    buttonClassName,
    widthClass = 'w-64',
    align = 'right'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    // Dynamic positioning classes
    const positionClasses = position === 'top' 
        ? 'bottom-full mb-3 origin-bottom slide-in-from-bottom-2' 
        : 'top-full mt-3 origin-top slide-in-from-top-2';

    const alignClasses = align === 'left'
        ? 'left-0'
        : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'right-0';

    return (
        <div className={cn("relative flex items-center", className)}>
            <Button
                variant="ghost"
                size="icon"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                className={cn("h-8 w-8 text-muted-foreground hover:text-indigo-600 transition-colors p-0", buttonClassName)}
            >
                <HelpCircle size={iconSize} />
            </Button>
            
            {isVisible && (
                <div className={cn(
                    "absolute bg-white/95 backdrop-blur-md border border-indigo-200 p-4 rounded-[1.5rem] shadow-2xl z-[100] text-sm animate-in fade-in duration-200",
                    alignClasses,
                    widthClass,
                    positionClasses
                )}>
                    <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-2 font-outfit">
                        {title}
                    </p>
                    <div className="text-slate-600 leading-relaxed text-[11px]">
                        {content}
                    </div>
                    {footer && (
                        <div className="mt-3 pt-2 border-t border-indigo-100/50">
                            {footer}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
