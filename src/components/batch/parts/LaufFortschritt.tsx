import React from 'react';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useLaufzeit } from '@/hooks/useLaufzeit';
import { LaufBalken } from '@/components/ui/LaufBalken';
import { schaetzeRestzeit, formatiereRestzeit, type LaufArt } from '@/lib/restzeit';

const BEZEICHNUNG: Record<LaufArt, string> = {
    texterkennung: 'Texterkennung',
    korrektur: 'Korrektur',
};

/**
 * Zaehler, Balken und Zeit eines laufenden Stapellaufs.
 * ⏱️
 *
 * Ab zwei Blaettern steht rechts die Restzeit, hochgerechnet aus den fertigen
 * Blaettern. Bei einem einzelnen gibt es nichts hochzurechnen — dort steht wie
 * in der Musterloesung, seit wann es laeuft (Entscheidung vom 23.10.2026: die
 * Anzeige verschwand vorher bei einem Blatt ganz, und das wirkte wie ein Fehler).
 */
export const LaufFortschritt: React.FC = () => {
    const lauf = useBatchStore((state) => state.laufFortschritt);
    const laufzeit = useLaufzeit(lauf?.seit);
    if (!lauf || lauf.gesamt < 1) return null;

    const einzeln = lauf.gesamt === 1;
    const aktuell = Math.min(lauf.fertig + 1, lauf.gesamt);
    const restzeit = schaetzeRestzeit(lauf.dauernMs, lauf.gesamt - lauf.fertig);
    const zeit = einzeln ? laufzeit
        : restzeit === null ? 'Restzeit wird berechnet …' : formatiereRestzeit(restzeit);

    return (
        <div className="px-6 pb-6" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm mb-2">
                <span className="font-medium text-foreground">
                    {BEZEICHNUNG[lauf.art]}: Blatt {aktuell} von {lauf.gesamt}
                </span>
                <span className="text-muted-foreground tabular-nums">{zeit}</span>
            </div>
            <LaufBalken fortschritt={einzeln ? undefined : { fertig: lauf.fertig, gesamt: lauf.gesamt, einheit: 'Blättern' }} />
        </div>
    );
};
