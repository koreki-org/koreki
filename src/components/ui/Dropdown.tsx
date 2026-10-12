import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

/**
 * Zwei Groessen, weil dasselbe Feld an zwei sehr verschiedenen Orten steht: als
 * eigenstaendige Auswahl auf einer Seite (`default`) und als Formularfeld in
 * einem kleinen Kasten (`sm`).
 *
 * Bis zum 09.09.2026 gab es nur die grosse Pille. Im Anlern-Kasten der
 * Korrekturansicht stand sie mit 48px Hoehe und vollem Radius neben 28px hohen
 * Knoepfen mit 8px Radius — drei Hoehen und drei Radien in einer Box von rund
 * 130px. Die Aufrufstelle hatte das gesehen und `text-xs` uebergeben; die Klasse
 * landete auf dem umschliessenden `div` und erreichte den Knopf nie.
 *
 * `sm` liegt auf 32px und 12px — dem Mass der Aktionszeile, in der es steht.
 * Ein Zwischenschritt auf 36px/14px stand hier einen Entwurf lang, weil der
 * gewaehlte Erfahrungsschatz "Inhalt" sei und wie der Rueckmeldetext zu lesen
 * sein muesse. Am Bild widerlegt (09.09.2026): Die Zeile ist der Rueckmeldung
 * untergeordnet, und auf ihrem Mass zu liegen wiegt schwerer als die Theorie.
 */
type DropdownSize = 'default' | 'sm';

const SIZE: Record<DropdownSize, string> = {
    default: 'h-12 rounded-full px-5 text-sm',
    sm: 'h-8 rounded-md px-3 text-xs'
};

interface DropdownProps {
    value: string;
    onValueChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    /**
     * Layout des GESAMTEN Feldes (Breite, Ausrichtung). Die Klassen landen auf
     * dem umschliessenden Element, nicht auf dem Knopf — wie der Knopf AUSSIEHT,
     * sagt `size`.
     */
    className?: string;
    disabled?: boolean;
    size?: DropdownSize;
}

const Dropdown: React.FC<DropdownProps> = ({
    value,
    onValueChange,
    options,
    placeholder = 'Wählen...',
    className,
    disabled,
    size = 'default'
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
                    "flex w-full items-center justify-between border bg-card py-2 font-medium text-foreground transition-colors outline-none",
                    SIZE[size],
                    isOpen 
                        ? "border-primary" // Offen: der Rand sagt es. Ein Ring dazu war ein zweiter Rahmen um denselben Zustand.
                        /*
                         * Der Hover sitzt am RAND, nicht auf der Flaeche.
                         *
                         * Hier stand bis zum 09.09.2026 `hover:bg-muted/50`. Halbdurchsichtig:
                         * 96% Grau auf 50% Deckkraft, und darunter liegt nicht Weiss, sondern
                         * der Seitengrund mit 95% — macht rund 95,5%. Das Feld wurde beim
                         * Drueberfahren zum Hintergrund (gemeldet am 09.09.2026).
                         *
                         * Ein weisses Feld kann ueber Helligkeit ohnehin keinen Hover zeigen,
                         * es ist bereits das Hellste der Leiter. Der Rand kann es, und er
                         * kuendigt zugleich den geoeffneten Zustand an (dort `border-primary`).
                         */
                        : "border-border hover:border-foreground/30",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="text-muted-foreground">{selectedOption.icon}</span>
                    )}
                    <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
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

            {/* Aufgeklappte Liste: undurchsichtige Karte mit Haarlinie und Schatten */}
            {isOpen && (
                <div 
                    className={cn(
                        "absolute z-50 mt-1.5 w-full min-w-[12rem] rounded-xl border border-border bg-card p-1 shadow-xl",
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
                                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isSelected 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
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
