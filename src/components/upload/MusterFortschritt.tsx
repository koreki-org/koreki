import React, { useEffect, useState } from 'react';
import { useBatchStore, type MusterFortschritt as Lauf } from '@/hooks/store/useBatchStore';
import { formatiereLaufzeit } from '@/lib/restzeit';

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
    const [jetzt, setJetzt] = useState(() => Date.now());
    // Die Uhr haengt am Beginn, nicht am ganzen Zustand: jede erkannte Seite
    // erneuert das Objekt, die Uhr soll dabei weiterlaufen.
    const seit = lauf?.seit;

    useEffect(() => {
        if (seit === undefined) return;
        setJetzt(Date.now());
        const uhr = setInterval(() => setJetzt(Date.now()), 1000);
        return () => clearInterval(uhr);
    }, [seit]);

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
                <span className="text-muted-foreground tabular-nums">{formatiereLaufzeit(jetzt - lauf.seit)}</span>
            </div>
            {seiten && seiten.gesamt > 1 ? (
                <div
                    className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={seiten.gesamt}
                    aria-valuenow={seiten.fertig}
                    aria-label={`${seiten.fertig} von ${seiten.gesamt} Seiten erkannt`}
                >
                    <div className="h-full bg-primary" style={{ width: `${(seiten.fertig / seiten.gesamt) * 100}%` }} />
                </div>
            ) : (
                // Ohne Seiten gibt es nichts zu zaehlen: der Balken zeigt nur, dass es laeuft.
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label="Läuft">
                    <div className="h-full bg-primary rounded-full animate-loading-bar" />
                </div>
            )}
        </div>
    );
};
