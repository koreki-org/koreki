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
                    "flex h-12 w-full items-center justify-between rounded-full border bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all outline-none",
                    isOpen 
                        ? "border-blue-500 ring-4 ring-blue-500/10" // Weicher, blauer Fokus-Ring
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="text-slate-400">{selectedOption.icon}</span>
                    )}
                    <span className={cn("truncate tracking-wide", !selectedOption && "text-slate-400 font-medium")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown 
                    className={cn(
                        "ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300", 
                        isOpen && "rotate-180 text-blue-500"
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
                        <div className="px-4 py-3 text-center text-xs font-medium text-slate-400">
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
                                            ? "bg-blue-50 text-blue-700" 
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {option.icon && (
                                            <span className={cn("shrink-0", isSelected ? "text-blue-500" : "text-slate-400")}>
                                                {option.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
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
