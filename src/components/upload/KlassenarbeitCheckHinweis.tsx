import React from 'react';
import { Button } from '@/components/ui/Button';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { oeffneHandbuch } from '@/lib/handbuch';

/**
 * Hinweis über der Musterlösung auf den Koreki-Check für Claude (21.11.2026).
 *
 * Der Check hilft, eine Klassenarbeit VOR dem Schreiben so aufzubauen, dass Koreki
 * sie gut korrigieren kann. Er gehört deshalb an den Anfang, solange noch keine
 * Musterlösung geladen ist — danach ist die Arbeit geschrieben, und der Hinweis
 * stünde nur im Weg.
 *
 * Das Handbuch erklärt Herunterladen, Einrichten und Grenzen; hier steht nur der
 * Einstieg. Zwei Zellen, damit der Hinweis im zweispaltigen Raster über der
 * Musterlösung steht und die beiden Karten darunter auf gleicher Höhe beginnen.
 */
export const KlassenarbeitCheckHinweis: React.FC = () => {
    const hatMusterloesung = useDashboardStore(d => !!d.modelSolution);
    if (hatMusterloesung) return null;

    return (
        <>
            <p className="-mb-5 px-1 text-xs text-muted-foreground">
                Klassenarbeit noch in Arbeit? Mit Claude prüfst du vorab, ob Koreki sie gut korrigieren kann.{' '}
                <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs align-baseline"
                    onClick={() => { void oeffneHandbuch('klassenarbeitPruefen'); }}
                >
                    Koreki-Check herunterladen
                </Button>
            </p>
            <div className="hidden md:block -mb-5" aria-hidden="true" />
        </>
    );
};
