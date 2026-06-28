import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface DropdownProps {
    value: string;
    onValueChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
    value,
    onValueChange,
    options,
    placeholder = 'Wählen...',
    className,
    disabled
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    // Schließt das Dropdown, wenn man daneben klickt
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div 
            ref={dropdownRef} 
            className={cn('relative inline-block w-full min-w-[200px]', className)}
        >
            {/* Trigger Button - angepasst ans Pill-Design */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-12 w-full items-center justify-between rounded-full border bg-white px-5 py-2 text-sm font-bold text-foreground shadow-sm transition-all outline-none",
                    isOpen 
                        ? "border-primary ring-4 ring-primary/10" // Weicher, blauer Fokus-Ring
                        : "border-border hover:border-border/80 hover:bg-muted/50",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="text-muted-foreground">{selectedOption.icon}</span>
                    )}
                    <span className={cn("truncate tracking-wide", !selectedOption && "text-muted-foreground font-medium")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown 
                    className={cn(
                        "ml-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300", 
                        isOpen && "rotate-180 text-primary"
                    )} 
                />
            </button>

            {/* Dropdown Menu - mit echtem Tailwind Glassmorphism */}
            {isOpen && (
                <div 
                    className={cn(
                        // Native Tailwind-Klassen für den milchigen Glass-Effekt + Fallback-Hintergrund
                        "absolute z-50 mt-2 w-full min-w-[12rem] rounded-2xl border border-white/50 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl",
                        "max-h-[300px] overflow-y-auto custom-scrollbar",
                        "animate-in fade-in zoom-in-95 duration-200 origin-top"
                    )}
                >
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                            Keine Optionen verfügbar
                        </div>
                    ) : (
                        options.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onValueChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        // Die einzelnen Optionen sind jetzt auch leicht abgerundet (rounded-xl)
                                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                                        isSelected 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {option.icon && (
                                            <span className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>
                                                {option.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
