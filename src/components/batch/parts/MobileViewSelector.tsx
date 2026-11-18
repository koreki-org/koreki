import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/Button';

interface MobileViewSelectorProps {
    mobileViewMode: 'text' | 'image';
    onSetMobileViewMode: (mode: 'text' | 'image') => void;
    isDone: boolean;
}

/**
 * Umschalter zwischen den beiden Spalten auf dem Handy, wo sie nicht nebeneinander passen.
 * Beschriftet wie die Spalten selbst — „Text“ und „Vorschlag“ bzw. „Scan“ —, in
 * Satzschreibung (bis 18.11.2026 stand hier „TEXT / KORREKTUR“ in Versalien).
 */
export const MobileViewSelector: React.FC<MobileViewSelectorProps> = ({
    mobileViewMode, onSetMobileViewMode, isDone
}) => {
    return (
        <div className="flex md:hidden bg-muted p-1 mb-3 rounded-lg shrink-0">
            <Button 
                variant="ghost" 
                onClick={() => onSetMobileViewMode('text')} 
                className={cn("flex-1 h-auto py-1.5 text-xs font-medium rounded-md transition-colors", 
                    mobileViewMode === 'text' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
                Text
            </Button>
            <Button 
                variant="ghost" 
                onClick={() => onSetMobileViewMode('image')} 
                className={cn("flex-1 h-auto py-1.5 text-xs font-medium rounded-md transition-colors", 
                    mobileViewMode === 'image' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
                {isDone ? "Vorschlag" : "Scan"}
            </Button>
        </div>
    );
};
