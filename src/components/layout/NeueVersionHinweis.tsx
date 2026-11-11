import React, { useEffect } from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { isKeycloakAuth } from '@/lib/env-context';
import { betriebsart, pruefeAufNeueVersion, useNeueVersionStore } from '@/lib/neue-version';

/**
 * Pille in der Kopfleiste, sobald es eine neuere freigegebene Version gibt.
 *
 * Bewusst nur ein Hinweis: der Klick oeffnet die Einstellungen, wo erklaert
 * wird, wie aktualisiert wird und mit welcher Folge. Ohne neue Version rendert
 * die Pille nichts — keine Dauer-Anzeige "aktuell", die niemand braucht.
 *
 * Wer sie sieht: auf dem Desktop jeder; in Community nur, wer aktualisieren
 * kann — der Admin. Ohne Anmeldung (Single) ist das jeder, mit Keycloak (Multi)
 * nur die Rolle ADMIN. Lehrkraefte in Multi koennen am Server nichts tun.
 */
export const NeueVersionHinweis: React.FC<{ onOeffnen: () => void; istAdmin: boolean }> = ({ onOeffnen, istAdmin }) => {
    const zustand = useNeueVersionStore((s) => s.zustand);
    const art = betriebsart();
    const sichtbar = art === 'desktop' || (art === 'community' && (istAdmin || !isKeycloakAuth()));

    useEffect(() => {
        if (sichtbar) void pruefeAufNeueVersion();
    }, [sichtbar]);

    if (!sichtbar || zustand.art === 'unbekannt' || zustand.art === 'aktuell') return null;

    return (
        <Button
            variant="erfolg"
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
