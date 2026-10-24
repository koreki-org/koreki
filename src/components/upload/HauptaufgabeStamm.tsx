import React from 'react';
import type { Task, TasksLayoutSetter } from '@/types';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { Button } from '@/components/ui/Button';
import { hauptaufgabenVon, setzeStamm, legeStammAn } from '@/lib/hauptaufgaben';
import { composeModelSolution } from '@/lib/task-utils';

/**
 * Der Stamm der gewählten Hauptaufgabe — einmal, direkt unter der Aufgaben-Leiste.
 * 🌳
 *
 * Er gehört zur Hauptaufgabe, nicht zu einer Teilaufgabe, und steht deshalb über
 * deren Tabs statt in jedem davon. Wechselt die Lehrkraft von 1a zu 1b, bleibt er
 * stehen; bearbeitet sie ihn, ändert `setzeStamm` ihn für alle Teilaufgaben zugleich.
 * Hat eine Hauptaufgabe mit Teilaufgaben keinen Stamm, bietet ein dezenter Knopf an,
 * einen einzutragen — die Analyse kann ihn übersehen, die Lehrkraft muss ihn dann
 * nachtragen können. Aufgaben ohne Teilaufgaben bleiben wie zuvor.
 */
interface HauptaufgabeStammProps {
    /** Die Teilaufgaben der gewählten Hauptaufgabe. */
    gruppe: Task[];
    /** Bezeichnung der gewählten Hauptaufgabe (Tab-Beschriftung). */
    gruppenName: string;
    tasksLayout: Task[];
    modelSolutionContext: string;
    gesperrt: boolean;
    onTasksChange?: TasksLayoutSetter;
    onModelSolutionChange?: (neu: string) => void;
}

export const HauptaufgabeStamm: React.FC<HauptaufgabeStammProps> = ({
    gruppe, gruppenName, tasksLayout, modelSolutionContext, gesperrt, onTasksChange, onModelSolutionChange
}) => {
    const staemme = hauptaufgabenVon(gruppe);
    const uebernehme = (neu: Task[]) => {
        onTasksChange?.(neu);
        onModelSolutionChange?.(composeModelSolution(modelSolutionContext, neu.map(t => t.content || ''), neu));
    };
    const aendere = (name: string, stamm: string) => uebernehme(setzeStamm(tasksLayout, name, stamm));

    if (staemme.length === 0) {
        if (gruppe.length < 2 || gesperrt) return null;
        return (
            <Button variant="ghost" size="sm" className="self-start mb-2 h-8 text-xs text-muted-foreground"
                onClick={() => uebernehme(legeStammAn(tasksLayout, gruppe, gruppenName))}>
                + Ausgangslage für {gruppenName} hinzufügen
            </Button>
        );
    }

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
