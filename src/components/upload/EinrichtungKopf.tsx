import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';

/**
 * Kopfzeile der Einrichtung, sobald schon etwas geladen ist (17.11.2026).
 *
 * Hier stand bis 21.11.2026 „Neu beginnen“: Damals oeffnete „Neue Korrektur“
 * nur die Einrichtung, und verworfen wurde erst hier. Seitdem verhaelt sich
 * „Neue Korrektur“ wie „Neu“ in Word und fragt selbst (`useNeueKorrektur`) —
 * ein zweiter Weg zum Neuanfang waere einer zu viel.
 */
export const EinrichtungKopf: React.FC = () => {
    const anzahl = useBatchStore(s => s.batchFiles.length);
    const hatMusterloesung = useDashboardStore(d => !!d.modelSolution);
    const wechsle = useWechsleAnsicht();
    if (anzahl === 0 && !hatMusterloesung) return null;

    return (
        <div className="md:col-span-2 -mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold mr-auto">Einrichtung</h2>
            {anzahl > 0 && hatMusterloesung && (
                <Button variant="outline" size="sm" onClick={() => wechsle('alle')} className="gap-1.5">
                    Weiter zu Alle Arbeiten <ArrowRight size={14} />
                </Button>
            )}
        </div>
    );
};
