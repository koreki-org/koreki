import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';

/**
 * Kopf einer Arbeit auf der ganzen Flaeche: zurueck zu "Alle Arbeiten" und zur
 * vorigen/naechsten Arbeit (17.11.2026). Jede Arbeit hat diese Ansicht, egal in
 * welchem Zustand — deshalb wird durch ALLE geblaettert.
 */
export const FokusNavigation: React.FC = () => {
    const arbeiten = useBatchStore(s => s.batchFiles);
    const aktuell = useBatchStore(s => s.aufgeklappteArbeit);
    const wechsle = useWechsleAnsicht();

    const pos = aktuell ?? -1;
    const vorher = pos > 0 ? pos - 1 : null;
    const nachher = pos >= 0 && pos < arbeiten.length - 1 ? pos + 1 : null;

    // Zurueck in den Stapel, und dort zu der Arbeit, von der man kommt.
    const zurueck = () => {
        wechsle('alle');
        setTimeout(() => document.getElementById(`arbeit-${aktuell}`)?.scrollIntoView({ block: 'center' }), 50);
    };

    return (
        <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={zurueck} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                <ArrowLeft size={14} /> Alle Arbeiten
            </Button>
            <Button variant="ghost" size="icon" disabled={vorher === null} onClick={() => vorher !== null && wechsle(vorher)}
                aria-label="Vorige Arbeit" title="Vorige Arbeit" className="h-8 w-8 text-muted-foreground">
                <ChevronLeft size={16} />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">{pos + 1} / {arbeiten.length}</span>
            <Button variant="ghost" size="icon" disabled={nachher === null} onClick={() => nachher !== null && wechsle(nachher)}
                aria-label="Nächste Arbeit" title="Nächste Arbeit" className="h-8 w-8 text-muted-foreground">
                <ChevronRight size={16} />
            </Button>
        </div>
    );
};
