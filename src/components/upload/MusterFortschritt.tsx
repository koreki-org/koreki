import React from 'react';
import { useBatchStore, type MusterFortschritt as Lauf } from '@/hooks/store/useBatchStore';
import { useLaufzeit } from '@/hooks/useLaufzeit';
import { LaufBalken } from '@/components/ui/LaufBalken';

const beschreibe = (lauf: Lauf): string => {
    if (lauf.schritt === 'aufgaben') return 'Aufgaben werden erkannt …';
    if (!lauf.seiten) return 'Texterkennung …';
    const aktuell = Math.min(lauf.seiten.fertig + 1, lauf.seiten.gesamt);
    return `Texterkennung: Seite ${aktuell} von ${lauf.seiten.gesamt}`;
};

/**
 * Was beim Analysieren der Musterloesung gerade laeuft, und seit wann.
 * ⏱️
 *
 * Gegenstueck zu `batch/parts/LaufFortschritt`: gleiche Stelle (unter dem
 * Kartenkopf), gleicher Aufbau. Statt der Restzeit steht hier die Laufzeit,
 * weil die Aufgabenerkennung ein einzelner Aufruf ist — siehe `MusterFortschritt`
 * im Batch-Store. Der Balken zaehlt Seiten, wo es welche gibt, und laeuft sonst nur durch.
 */
export const MusterFortschritt: React.FC = () => {
    const lauf = useBatchStore((state) => state.musterFortschritt);
    const laufzeit = useLaufzeit(lauf?.seit);

    // Digitaler Text wird ohne KI ausgelesen; bis die Aufgabenerkennung
    // beginnt, vergeht nur ein Augenblick.
    if (!lauf) {
        return <p className="text-xs font-medium text-muted-foreground px-1 mb-2">Text wird gelesen …</p>;
    }

    const seiten = lauf.seiten;
    return (
        <div className="px-1 mb-3" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-foreground">{beschreibe(lauf)}</span>
                <span className="text-muted-foreground tabular-nums">{laufzeit}</span>
            </div>
            <LaufBalken
                className="mt-2"
                fortschritt={seiten && seiten.gesamt > 1 ? { ...seiten, einheit: 'Seiten' } : undefined}
            />
        </div>
    );
};
