import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { brauchtPruefung } from '@/lib/vertrauen';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';
import type { BatchFile } from '../../types';

/**
 * Die Arbeiten des Stapels als Liste in der Seitenleiste — das Gegenstueck zu
 * "Letzte Elemente" bei Claude (17.11.2026).
 *
 * Ein Klick oeffnet die Arbeit auf der ganzen Flaeche.
 * Der Punkt sagt dasselbe wie die Zeile im Stapel: gruen fertig, gelb
 * "Bitte prüfen", rot Fehler, grau noch offen.
 */
const punktFarbe = (f: BatchFile): string => {
    if (f.status === 'error') return 'bg-destructive';
    if (f.status !== 'done') return 'bg-muted-foreground/40';
    return f.result?.tasks?.some(t => brauchtPruefung(t.confidence)) ? 'bg-warning' : 'bg-success';
};

export const SeitenleisteArbeiten: React.FC = () => {
    const arbeiten = useBatchStore(s => s.batchFiles);
    const aufgeklappt = useBatchStore(s => s.aufgeklappteArbeit);
    const wechsle = useWechsleAnsicht();
    if (arbeiten.length === 0) return null;

    return (
        <>
            <p className="px-3 pt-4 pb-1 text-xs text-muted-foreground">Arbeiten</p>
            {arbeiten.map((f, idx) => (
                <Button
                    key={idx}
                    variant="ghost"
                    onClick={() => wechsle(idx)}
                    className={cn("h-8 w-full justify-start gap-2.5 px-3 text-sm font-normal", aufgeklappt === idx && "bg-primary/10 text-primary")}
                >
                    {f.status === 'processing'
                        ? <Loader2 size={12} className="animate-spin text-primary shrink-0" />
                        : <span className={cn("w-2 h-2 rounded-full shrink-0", punktFarbe(f))} aria-hidden="true" />}
                    <span className="truncate">{f.name}</span>
                    {f.grade && <span className="ml-auto text-xs text-muted-foreground">{f.grade}</span>}
                </Button>
            ))}
        </>
    );
};
