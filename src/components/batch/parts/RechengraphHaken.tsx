import React, { useEffect, useRef } from 'react';
import { Checkbox } from '../../ui/Checkbox';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { rechengraphStand, setzeAlleRechengraphen } from '@/lib/rechengraph-schalter';

/**
 * „Rechengraphen verwenden" neben „Korrigieren" — fuer alle Aufgaben auf einmal.
 *
 * Hat keinen eigenen Zustand: Er liest und setzt die Schalter der einzelnen
 * Aufgaben (`Task.rechengraphAus`). Sind sie gemischt, steht der Haken halb und
 * die Zahl daneben; ein Klick schaltet dann alle ein.
 */
export const RechengraphHaken: React.FC<{ disabled: boolean }> = ({ disabled }) => {
    const tasksLayout = useDashboardStore((s) => s.tasksLayout);
    const setTasksLayout = useDashboardStore((s) => s.setTasksLayout);
    const { mit, aktiv } = rechengraphStand(tasksLayout);
    const gemischt = aktiv > 0 && aktiv < mit;
    const haken = useRef<HTMLInputElement>(null);

    // `indeterminate` gibt es nur als Eigenschaft, nicht als Attribut.
    useEffect(() => {
        if (haken.current) haken.current.indeterminate = gemischt;
    }, [gemischt]);

    if (mit === 0) return null;

    return (
        <label
            className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none whitespace-nowrap px-1"
            title="Gilt für die nächste Korrektur. Einzelne Aufgaben schaltest du an der Musterlösung um."
        >
            <Checkbox
                ref={haken}
                checked={aktiv === mit}
                disabled={disabled}
                onChange={() => setTasksLayout(prev => setzeAlleRechengraphen(prev, aktiv < mit))}
            />
            Rechengraphen verwenden
            {gemischt && <span className="text-muted-foreground">({aktiv} von {mit})</span>}
        </label>
    );
};
