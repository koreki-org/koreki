import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface PopoverMenuItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    onSelect: () => void;
}

interface PopoverMenuProps {
    /** Trigger-Inhalt (z.B. Badge). Wird in einen fokussierbaren Button gewrappt. */
    trigger: React.ReactNode;
    items: PopoverMenuItem[];
    align?: 'left' | 'right' | 'center';
    widthClass?: string;
    className?: string;
    triggerClassName?: string;
    emptyLabel?: string;
}

/**
 * PopoverMenu
 * Generisches, leichtgewichtiges Anker-Popover für kurze Aktions-Listen
 * ("N Treffer → Sprung-Aktion"). Orientiert an KorekiTooltip.tsx (Glass-Panel,
 * Align-Logik) und Dropdown.tsx (Click-Outside-Handling, Options-Styling).
 * Kein Portal/Modal-Overlay (Z-9999 bleibt echten Modals vorbehalten) - läuft
 * inline mit z-[100].
 */
export const PopoverMenu: React.FC<PopoverMenuProps> = ({
    trigger,
    items,
    align = 'right',
    widthClass = 'w-64',
    className,
    triggerClassName,
    emptyLabel = 'Keine Einträge',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeAndRefocus = () => {
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const alignClasses = align === 'left' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

    return (
        <div
            ref={containerRef}
            className={cn('relative inline-flex', className)}
            onKeyDown={(e) => {
                if (e.key === 'Escape' && isOpen) {
                    e.stopPropagation();
                    closeAndRefocus();
                }
            }}
        >
            <Button
                ref={triggerRef}
                type="button"
                variant="ghost"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
                // Neutralisiert Button-Eigenoptik (Padding/Hover-Fläche/Press-Scale) -
                // der Trigger-Inhalt (z.B. Badge) bleibt die sichtbare Oberfläche,
                // Button liefert nur Fokus-Ring/A11y-Semantik.
                className={cn('h-auto p-0 rounded-lg hover:bg-transparent active:scale-100', triggerClassName)}
            >
                {trigger}
            </Button>

            {isOpen && (
                <div
                    role="menu"
                    className={cn(
                        'absolute z-[100] top-full mt-2 rounded-hero border border-border/50 bg-white/95 backdrop-blur-md p-1.5 shadow-2xl',
                        'max-h-[280px] overflow-y-auto custom-scrollbar',
                        'animate-in fade-in slide-in-from-top-2 duration-200 origin-top',
                        alignClasses,
                        widthClass
                    )}
                >
                    {items.length === 0 ? (
                        <div className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                            {emptyLabel}
                        </div>
                    ) : (
                        items.map(item => (
                            <Button
                                key={item.key}
                                type="button"
                                variant="ghost"
                                role="menuitem"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.onSelect();
                                    closeAndRefocus();
                                }}
                                // Listen-Eintrag statt Toolbar-Button: volle Breite, linksbündig,
                                // Sentence-Case (Dropdown.tsx-Options-Konvention), kein Press-Scale.
                                className={cn(
                                    'w-full h-auto justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground truncate normal-case active:scale-100',
                                    item.className
                                )}
                            >
                                {item.icon && <span className="shrink-0">{item.icon}</span>}
                                <span className="truncate">{item.label}</span>
                            </Button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PopoverMenu;
