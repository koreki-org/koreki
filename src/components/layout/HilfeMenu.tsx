import React from 'react';
import { BookOpen, HelpCircle, ListChecks, Bug } from 'lucide-react';
import { PopoverMenu, PopoverMenuItem } from '../ui/PopoverMenu';
import { oeffneHandbuch, PROBLEM_MELDEN_URL } from '@/lib/handbuch';
import { openExternal } from '@/lib/os-utils';

interface HilfeMenuProps {
    /** Oeffnet die Kurzanleitung in der App — sie bleibt der Weg, wenn kein Internet da ist. */
    onKurzanleitung: () => void;
}

/**
 * Das Fragezeichen in der Kopfleiste: ein kleines Menue statt eines Dialogs.
 *
 * Das Handbuch und „Problem melden“ oeffnen im Browser des Systems
 * (`openExternal`), nie im Koreki-Fenster — die laufende Korrektur lebt nur im
 * Arbeitsspeicher. Die Versionsnummer steht darunter, weil sie bei jeder
 * Fehlermeldung als Erstes gebraucht wird.
 */
export const HilfeMenu: React.FC<HilfeMenuProps> = ({ onKurzanleitung }) => {
    const eintraege: PopoverMenuItem[] = [
        {
            key: 'handbuch',
            label: 'Handbuch',
            icon: <BookOpen size={16} />,
            onSelect: () => { void oeffneHandbuch(); },
        },
        {
            key: 'kurzanleitung',
            label: 'Kurzanleitung',
            icon: <ListChecks size={16} />,
            onSelect: onKurzanleitung,
        },
        {
            key: 'problem',
            label: 'Problem melden',
            icon: <Bug size={16} />,
            onSelect: () => { void openExternal(PROBLEM_MELDEN_URL); },
        },
    ];

    return (
        <PopoverMenu
            trigger={<HelpCircle size={16} />}
            triggerAriaLabel="Hilfe"
            items={eintraege}
            align="right"
            widthClass="w-56"
            className="shrink-0"
            triggerClassName="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
            footer={`Version ${process.env.NEXT_PUBLIC_APP_VERSION ?? 'unbekannt'}`}
        />
    );
};

export default HilfeMenu;
