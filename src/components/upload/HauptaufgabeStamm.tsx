import React from 'react';
import type { Task, TasksLayoutSetter } from '@/types';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { hauptaufgabenVon, setzeStamm } from '@/lib/hauptaufgaben';
import { composeModelSolution } from '@/lib/task-utils';

/**
 * Der Stamm der gewählten Hauptaufgabe — einmal, direkt unter der Aufgaben-Leiste.
 * 🌳
 *
 * Er gehört zur Hauptaufgabe, nicht zu einer Teilaufgabe, und steht deshalb über
 * deren Tabs statt in jedem davon. Wechselt die Lehrkraft von 1a zu 1b, bleibt er
 * stehen; bearbeitet sie ihn, ändert `setzeStamm` ihn für alle Teilaufgaben zugleich.
 * Ohne Stamm erscheint nichts — Arbeiten ohne Hauptaufgaben sehen aus wie zuvor.
 */
interface HauptaufgabeStammProps {
    /** Die Teilaufgaben der gewählten Hauptaufgabe. */
    gruppe: Task[];
    tasksLayout: Task[];
    modelSolutionContext: string;
    gesperrt: boolean;
    onTasksChange?: TasksLayoutSetter;
    onModelSolutionChange?: (neu: string) => void;
}

export const HauptaufgabeStamm: React.FC<HauptaufgabeStammProps> = ({
    gruppe, tasksLayout, modelSolutionContext, gesperrt, onTasksChange, onModelSolutionChange
}) => {
    const staemme = hauptaufgabenVon(gruppe);
    if (staemme.length === 0) return null;

    const aendere = (name: string, stamm: string) => {
        const neu = setzeStamm(tasksLayout, name, stamm);
        onTasksChange?.(neu);
        onModelSolutionChange?.(composeModelSolution(modelSolutionContext, neu.map(t => t.content || ''), neu));
    };

    return (
        <div className="flex flex-col gap-2 mb-2">
            {staemme.map(h => (
                <EditableMathArea
                    key={h.name}
                    leftAction={<>
                        <p className="text-xs font-medium text-muted-foreground">Ausgangslage {h.name}</p>
                        <span className="text-xs text-muted-foreground/70">— gilt für alle Teilaufgaben</span>
                    </>}
                    value={h.stamm}
                    onChange={(wert) => aendere(h.name, wert)}
                    gesperrt={gesperrt}
                    className="w-full"
                />
            ))}
        </div>
    );
};
