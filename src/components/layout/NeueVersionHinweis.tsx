import React, { useEffect } from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { isDesktopTarget } from '@/lib/env-context';
import { pruefeAufNeueVersion, useDesktopUpdateStore } from '@/lib/desktop-update';

/**
 * Pille in der Kopfleiste, sobald es eine neuere Desktop-Version gibt.
 *
 * Bewusst nur ein Hinweis: der Klick oeffnet die Einstellungen, wo die
 * Aktualisierung mit ihrer Folge (Neustart, geladene Arbeiten weg) erklaert
 * wird. Ohne neue Version rendert die Pille nichts — keine Dauer-Anzeige
 * "aktuell", die niemand braucht.
 */
export const NeueVersionHinweis: React.FC<{ onOeffnen: () => void }> = ({ onOeffnen }) => {
    const zustand = useDesktopUpdateStore((s) => s.zustand);

    useEffect(() => {
        void pruefeAufNeueVersion();
    }, []);

    if (!isDesktopTarget() || zustand.art === 'unbekannt' || zustand.art === 'aktuell') return null;

    return (
        <Button
            variant="chip"
            size="xs"
            onClick={onOeffnen}
            className="rounded-full shrink-0"
            title={`Koreki ${zustand.version} ist verfügbar`}
        >
            <ArrowDownCircle size={14} />
            Neue Version
        </Button>
    );
};
