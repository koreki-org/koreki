import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useBatchStore } from '@/hooks/store/useBatchStore';

/**
 * Kopf der Pruefansicht: zurueck zum Ueberblick und zur vorigen/naechsten
 * fertigen Arbeit (17.11.2026).
 *
 * Gewechselt wird nur zwischen FERTIGEN Arbeiten: Eine offene Arbeit hat keine
 * Pruefansicht, ein Sprung dorthin wuerde wortlos zurueck in den Stapel fallen.
 */
export const FokusNavigation: React.FC = () => {
    const arbeiten = useBatchStore(s => s.batchFiles);
    const aktuell = useBatchStore(s => s.aufgeklappteArbeit);
    const setze = useBatchStore(s => s.setAufgeklappteArbeit);

    const fertige = arbeiten.flatMap((f, i) => (f.status === 'done' ? [i] : []));
    const pos = aktuell === null ? -1 : fertige.indexOf(aktuell);
    const vorher = pos > 0 ? fertige[pos - 1] : null;
    const nachher = pos >= 0 && pos < fertige.length - 1 ? fertige[pos + 1] : null;

    // Zurueck in den Stapel, und dort zu der Arbeit, von der man kommt.
    const zurueck = () => {
        setze(null);
        setTimeout(() => document.getElementById(`arbeit-${aktuell}`)?.scrollIntoView({ block: 'center' }), 50);
    };

    return (
        <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={zurueck} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                <ArrowLeft size={14} /> Alle Arbeiten
            </Button>
            <Button variant="ghost" size="icon" disabled={vorher === null} onClick={() => vorher !== null && setze(vorher)}
                aria-label="Vorige Arbeit" title="Vorige Arbeit" className="h-8 w-8 text-muted-foreground">
                <ChevronLeft size={16} />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">{pos + 1} / {fertige.length}</span>
            <Button variant="ghost" size="icon" disabled={nachher === null} onClick={() => nachher !== null && setze(nachher)}
                aria-label="Nächste Arbeit" title="Nächste Arbeit" className="h-8 w-8 text-muted-foreground">
                <ChevronRight size={16} />
            </Button>
        </div>
    );
};
