import React from 'react';
import { Pin } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { cn } from '@/lib/utils';

/**
 * Stecknadel neben den Aufgaben-Reitern einer Arbeit.
 *
 * Aus (Standard): Jede neue Arbeit beginnt beim ersten Reiter — schuelerweise
 * pruefen. An: Der Reiter bleibt beim Blaettern stehen — aufgabenweise pruefen.
 * Die Wahl liegt im Store und gilt fuer alle Arbeiten (s. `aufgaben-reiter.ts`).
 */
export const ReiterNadel: React.FC<{ anzahlReiter: number }> = ({ anzahlReiter }) => {
    const behalten = useBatchStore((s) => s.aufgabeBehalten);
    const setBehalten = useBatchStore((s) => s.setAufgabeBehalten);
    if (anzahlReiter < 2) return null;

    const text = behalten
        ? 'Aufgabe wird beim Blättern behalten — klicken, damit jede Arbeit bei der ersten Aufgabe beginnt'
        : 'Aufgabe beim Blättern behalten (aufgabenweise prüfen)';
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Aufgabe beim Blättern behalten"
            aria-pressed={behalten}
            title={text}
            onClick={(e) => { e.stopPropagation(); setBehalten(!behalten); }}
            className={cn('h-8 w-8 shrink-0 rounded-md', behalten ? 'text-primary bg-primary/10 hover:bg-primary/15' : 'text-muted-foreground')}
        >
            <Pin size={14} className={cn(behalten && 'fill-current')} />
        </Button>
    );
};
