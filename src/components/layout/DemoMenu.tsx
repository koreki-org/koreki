import React from 'react';
import { FileText, PenLine } from 'lucide-react';
import { PopoverMenu } from '../ui/PopoverMenu';
import type { DemoArt } from '@/lib/demo/demoHandschrift';

interface DemoMenuProps {
    onDemo: (art: DemoArt) => void;
    /** Was man anklickt — die Zeile der Seitenleiste oder der Knopf auf dem Startbild. */
    trigger: React.ReactNode;
    className?: string;
    triggerClassName?: string;
    align?: 'left' | 'right' | 'center';
}

/**
 * Die Demo gibt es in zwei Fassungen (18.11.2026): getippt — laeuft mit jeder KI,
 * geht sofort zur Korrektur — und handschriftlich, mit Bilderkennung und dem
 * Pruefen des erkannten Texts davor. Beide Stellen, die eine Demo laden, fragen
 * hierueber, damit sie nicht auseinanderlaufen.
 */
export const DemoMenu: React.FC<DemoMenuProps> = ({ onDemo, trigger, className, triggerClassName, align = 'left' }) => (
    <PopoverMenu
        trigger={trigger}
        className={className}
        triggerClassName={triggerClassName}
        align={align}
        widthClass="w-60"
        items={[
            { key: 'getippt', label: 'Getippte Arbeiten', icon: <FileText size={14} />, onSelect: () => onDemo('getippt') },
            { key: 'handschrift', label: 'Handschriftliche Scans', icon: <PenLine size={14} />, onSelect: () => onDemo('handschrift') },
        ]}
    />
);
