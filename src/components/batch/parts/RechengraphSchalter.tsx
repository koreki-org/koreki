import React from 'react';
import { Checkbox } from '../../ui/Checkbox';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { hatRechengraph, rechengraphAktiv } from '@/lib/rechengraph-schalter';

interface RechengraphSchalterProps {
    /** Die Aufgabe im Layout, deren Graph-Fenster offen ist. */
    taskIdx?: number | null;
    disabled: boolean;
}

/**
 * „Rechengraph verwenden" im Graph-Fenster — eine Aufgabe ein- oder ausschalten.
 *
 * Steht im Fenster, nicht ueber der Aufgabe: Dort hat es Andreas als Unruhe an
 * jeder Aufgabe abgelehnt (26.11.2026). Ueber der Aufgabe sagt nur noch der graue
 * Funken-Knopf, dass der Graph aus ist.
 *
 * Liest und schreibt die Aufgabe selbst, damit die Fenster nur den Index
 * durchreichen muessen. Geschrieben wird funktional — der Bestand bleibt.
 */
export const RechengraphSchalter: React.FC<RechengraphSchalterProps> = ({ taskIdx, disabled }) => {
    const task = useDashboardStore((s) => (taskIdx == null ? undefined : s.tasksLayout[taskIdx]));
    const setTasksLayout = useDashboardStore((s) => s.setTasksLayout);
    if (taskIdx == null || !task || !hatRechengraph(task)) return null;

    return (
        <label
            className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none whitespace-nowrap"
            title="Aus: Die Korrektur bewertet diese Aufgabe ohne Rechengraph. Er bleibt gespeichert."
        >
            <Checkbox
                checked={rechengraphAktiv(task)}
                disabled={disabled}
                onChange={(e) => {
                    const an = e.target.checked;
                    setTasksLayout(prev => prev.map((t, i) => (i === taskIdx ? { ...t, rechengraphAus: !an } : t)));
                }}
            />
            Rechengraph verwenden
        </label>
    );
};
