import React from 'react';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { schaetzeRestzeit, formatiereRestzeit, type LaufArt } from '@/lib/restzeit';

const BEZEICHNUNG: Record<LaufArt, string> = {
    texterkennung: 'Texterkennung',
    korrektur: 'Korrektur',
};

/**
 * Zaehler, Balken und Restzeit eines laufenden Stapellaufs.
 * ⏱️
 *
 * Erscheint nur bei mehr als einem Blatt: Bei einem einzelnen gaebe es nie eine
 * Restzeit, und die Zeile zeigt ihren Ladekreisel ohnehin selbst.
 */
export const LaufFortschritt: React.FC = () => {
    const lauf = useBatchStore((state) => state.laufFortschritt);
    if (!lauf || lauf.gesamt < 2) return null;

    const offen = lauf.gesamt - lauf.fertig;
    const aktuell = Math.min(lauf.fertig + 1, lauf.gesamt);
    const restzeit = schaetzeRestzeit(lauf.dauernMs, offen);
    const anteil = (lauf.fertig / lauf.gesamt) * 100;

    return (
        <div className="px-6 pb-6" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm mb-2">
                <span className="font-medium text-foreground">
                    {BEZEICHNUNG[lauf.art]}: Blatt {aktuell} von {lauf.gesamt}
                </span>
                <span className="text-muted-foreground">
                    {restzeit === null ? 'Restzeit wird berechnet …' : formatiereRestzeit(restzeit)}
                </span>
            </div>
            <div
                className="h-1.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={lauf.gesamt}
                aria-valuenow={lauf.fertig}
                aria-label={`${lauf.fertig} von ${lauf.gesamt} Blättern fertig`}
            >
                <div className="h-full bg-primary" style={{ width: `${anteil}%` }} />
            </div>
        </div>
    );
};
