import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';

interface EinrichtungKopfProps {
    /** "Neue Korrektur" aus app.tsx — fragt vor dem Verwerfen nach. */
    onNeuBeginnen?: () => void;
}

/**
 * Kopfzeile der Einrichtung, sobald schon etwas geladen ist (17.11.2026).
 *
 * "Neue Korrektur" in der Seitenleiste zeigt die Einrichtung, verwirft aber
 * nichts — sonst waere die Musterloesung waehrend des Pruefens nicht mehr
 * einsehbar, und weitere Arbeiten liessen sich nicht nachladen. Verworfen wird
 * erst hier, mit Rueckfrage.
 */
export const EinrichtungKopf: React.FC<EinrichtungKopfProps> = ({ onNeuBeginnen }) => {
    const anzahl = useBatchStore(s => s.batchFiles.length);
    const hatMusterloesung = useDashboardStore(d => !!d.modelSolution);
    const wechsle = useWechsleAnsicht();
    if (anzahl === 0 && !hatMusterloesung) return null;

    return (
        <div className="md:col-span-2 -mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold mr-auto">Einrichtung</h2>
            {onNeuBeginnen && (
                <Button variant="ghost" size="sm" onClick={onNeuBeginnen} className="gap-1.5 text-muted-foreground">
                    <RotateCcw size={14} /> Neu beginnen
                </Button>
            )}
            {anzahl > 0 && hatMusterloesung && (
                <Button variant="outline" size="sm" onClick={() => wechsle('alle')} className="gap-1.5">
                    Weiter zu Alle Arbeiten <ArrowRight size={14} />
                </Button>
            )}
        </div>
    );
};
