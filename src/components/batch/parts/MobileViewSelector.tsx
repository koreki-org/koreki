import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/Button';

interface MobileViewSelectorProps {
    mobileViewMode: 'text' | 'image';
    onSetMobileViewMode: (mode: 'text' | 'image') => void;
    isDone: boolean;
}

/**
 * MobileViewSelector
 * 📱 Segmented Control for split-screen switching on small devices.
 */
export const MobileViewSelector: React.FC<MobileViewSelectorProps> = ({
    mobileViewMode, onSetMobileViewMode, isDone
}) => {
    return (
        <div className="flex sm:hidden bg-muted/20 p-1 mt-4 rounded-xl border border-border/50 shrink-0 shadow-inner">
            <Button 
                variant="ghost" 
                onClick={() => onSetMobileViewMode('text')} 
                className={cn("flex-1 h-auto py-2 text-[10px] font-black rounded-lg transition-all", 
                    mobileViewMode === 'text' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >
                {isDone ? "TEXT" : "TEXT"}
            </Button>
            <Button 
                variant="ghost" 
                onClick={() => onSetMobileViewMode('image')} 
                className={cn("flex-1 h-auto py-2 text-[10px] font-black rounded-lg transition-all", 
                    mobileViewMode === 'image' ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
            >
                {isDone ? "KORREKTUR" : "SCAN"}
            </Button>
        </div>
    );
};
