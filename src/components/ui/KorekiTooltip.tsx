import React, { useState } from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import { HandbuchStelle, oeffneHandbuch } from '@/lib/handbuch';

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
    /** Zeigt unten „Mehr im Handbuch“ und springt an diese Stelle (im Browser). */
    handbuch?: HandbuchStelle;
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
    align = 'right',
    handbuch
}) => {
    const [isVisible, setIsVisible] = useState(false);

    // Dynamic positioning classes
    const positionClasses = position === 'top' 
        ? 'bottom-full pb-3 origin-bottom'
        : 'top-full pt-3 origin-top';

    const alignClasses = align === 'left'
        ? 'left-0'
        : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'right-0';

    return (
        /*
          * Hover am Rahmen, nicht am Knopf: Mit einem Link in der Blase muss die
          * Maus vom Knopf in die Blase wandern koennen, ohne dass sie zugeht.
          * Deshalb liegt der Abstand zwischen beiden als Polster (`pt-3`) IN der
          * Blasen-Huelle statt als Rand (`mt-3`) davor — die Strecke gehoert dann
          * zur Huelle und zaehlt als „drueber“.
          */
        <div
            className={cn("relative flex items-center", className)}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <Button
                variant="ghost"
                size="icon"
                aria-label={title}
                onClick={() => setIsVisible(!isVisible)}
                className={cn("h-8 w-8 text-muted-foreground hover:text-primary transition-colors p-0", buttonClassName)}
            >
                <HelpCircle size={iconSize} />
            </Button>
            
            {/*
              * `font-sans font-normal` an der Blase: Sie steht im DOM dort, wo ihr
              * Fragezeichen steht — und das steht oft in einem `CardTitle`, also in
              * einem `h3`. Von dort erbte der ganze Hilfetext Outfit 700, die
              * Markenschrift in Ueberschriftenstaerke (gemessen am Tooltip der
              * Musterloesung, 11.11.2026). Das Design System haelt Outfit den
              * Ueberschriften vor, Geist dem Text. Die Blase setzt beides deshalb
              * selbst, statt es zu erben: Sie soll ueberall gleich aussehen, gleich
              * wo ihr Ausloeser haengt.
              */}
            {isVisible && (
                <div className={cn("absolute z-[100]", alignClasses, widthClass, positionClasses)}>
                    <div className="bg-white/95 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-2xl text-sm font-sans font-normal animate-overlay-in">
                        <p className="text-primary font-medium text-xs mb-2">
                            {title}
                        </p>
                        <div className="text-muted-foreground leading-relaxed text-xs">
                            {content}
                        </div>
                        {footer && (
                            <div className="mt-3 pt-2 border-t border-border/30">
                                {footer}
                            </div>
                        )}
                        {handbuch && (
                            <Button
                                variant="link"
                                size="xs"
                                onClick={(e) => {
                                    // Die Blase sitzt oft in einem Kartenkopf, der auf Klick auf- und zuklappt.
                                    e.stopPropagation();
                                    void oeffneHandbuch(handbuch);
                                }}
                                className="mt-3 h-auto px-0 gap-1.5 text-xs font-medium"
                            >
                                Mehr im Handbuch <ExternalLink size={12} />
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
