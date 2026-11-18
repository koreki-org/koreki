import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { DemoArt } from '@/lib/demo/demoHandschrift';

interface DemoHintBannerProps {
    isOpen: boolean;
    art: DemoArt;
    onDismiss: () => void;
}

/**
 * Hinweis nach dem Laden der Demo.
 *
 * Ohne ihn befuellt der Demo-Klick die Oberflaeche lautlos — fuer Erstbesucher waere
 * dann unklar, dass es sich um Beispieldaten und nicht um ihre eigenen handelt.
 */
export const DemoHintBanner: React.FC<DemoHintBannerProps> = ({ isOpen, art, onDismiss }) => {
    if (!isOpen) return null;

    return (
        <div className="mb-6 flex items-center gap-3 bg-primary/5 border border-primary/10 text-primary p-4 rounded-2xl shadow-sm">
            <Sparkles size={18} className="shrink-0" />
            <span className="flex-1 text-xs sm:text-sm font-semibold">
                Demo geladen: Beispielprojekt „Solaranlage für die Schule“ mit Musterlösung und zwei Beispiel-Arbeiten. Das sind keine echten Daten —{' '}
                {art === 'handschrift'
                    ? 'klicke auf „Bilderkennung“, vergleiche den erkannten Text mit dem Blatt und starte dann „Korrigieren“.'
                    : 'klicke einfach auf „Korrigieren“, um die KI-Korrektur live zu sehen.'}
            </span>
            <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="shrink-0 h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg"
                aria-label="Hinweis schließen"
            >
                <X size={16} />
            </Button>
        </div>
    );
};
