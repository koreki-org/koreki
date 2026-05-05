import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

// --- Context & Types ---
interface TabsContextProps {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

// --- 1. Der Haupt-Wrapper ---
export const Tabs: React.FC<{
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}> = ({ defaultValue, value: controlledValue, onValueChange, children, className }) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const handleValueChange = (newValue: string) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn('w-full', className)}>{children}</div>
        </TabsContext.Provider>
    );
};

// --- 2. Die Pillen-Leiste (Container) ---
// ANPASSUNG: Freier, nicht-eingeschränkter Container, gap hinzugefügt
export const TabsList: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div 
            role="tablist"
            className={cn(
                // Flex-Row mit sauberem Abstand, kein grauer Hintergrund, keine eckigen Boxen!
                'flex items-center gap-3 mb-10', 
                className
            )}
        >
            {children}
        </div>
    );
};

// --- 3. Die einzelnen Buttons ---
// ANPASSUNG: Exakt wie "Aufgabe 1", "Aufgabe 2"
export const TabsTrigger: React.FC<{
    value: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}> = ({ value, children, className, disabled }) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const isActive = context.value === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => context.onValueChange(value)}
            className={cn(
                // BASIS: Absolut rund (rounded-full), fette Schrift, sauberes Padding
                'inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 outline-none select-none',
                
                // ZUSTÄNDE (Exakt nach deinem Bild-Vorbild):
                isActive 
                    ? 'bg-[#5b6cf9] text-white shadow-md scale-105 z-10' // Der aktive "Aufgabe 1" Look (Kräftiges Blau/Lila, weiße Schrift)
                    : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent shadow-sm', // Der inaktive Look (Weiß, graue Schrift)
                className
            )}
        >
            {children}
        </button>
    );
};

// --- 4. Der Inhalts-Bereich ---
export const TabsContent: React.FC<{
    value: string;
    children: React.ReactNode;
    className?: string;
}> = ({ value, children, className }) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');

    if (context.value !== value) return null;

    return (
        <div 
            role="tabpanel" 
            className={cn(
                'animate-fade-in outline-none',
                className
            )}
        >
            {children}
        </div>
    );
};
