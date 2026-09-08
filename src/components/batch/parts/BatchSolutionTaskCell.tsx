import React from 'react';
import { BatchFile, Task } from '../../../types';
import { EditableMathArea } from '../../ui/EditableMathArea';
import { schuelerAntwort } from '@/lib/schueler-antwort';

/**
 * Die erkannte Schuelerloesung ZU EINER Aufgabe.
 * 🔎
 *
 * Am 08.09.2026 aus `BatchSolutionPanel` herausgeloest — Gegenstueck zu
 * `BatchTaskAnalysisCell`. Beide Zellen werden vom gemeinsamen Raster paarweise
 * gerendert, damit dieselbe Aufgabe links und rechts auf gleicher Hoehe steht.
 */

interface BatchSolutionTaskCellProps {
    item: BatchFile;
    idx: number;
    task: Task;
    tasksLayout: Task[];
    studentSections: string[];
    onUpdateText?: (idx: number, text: string, tasks?: Task[]) => void;
}

export const BatchSolutionTaskCell: React.FC<BatchSolutionTaskCellProps> = ({
    item,
    idx,
    task,
    tasksLayout,
    studentSections,
    onUpdateText
}) => {
    const sectionText = schuelerAntwort(item, task, tasksLayout, studentSections);

    /**
     * Die Aenderung geht in die Aufgabenliste des Ergebnisses, nicht in einen
     * eigenen Textspeicher: Der zweite Parameter bleibt bewusst leer, weil der
     * Gesamttext hier nicht mehr die Wahrheit ist — die Aufgaben sind es.
     */
    const uebernehmen = (newText: string) => {
        if (!onUpdateText) return;
        const baseTasks = (item.status === 'done' && item.result) ? (item.result.tasks || []) : (item.tasks || []);
        const updatedTasks = [...baseTasks];
        const taskIdxInItem = updatedTasks.findIndex(t => t.name === task.name);
        if (taskIdxInItem !== -1) {
            updatedTasks[taskIdxInItem] = { ...updatedTasks[taskIdxInItem], content: newText };
        } else {
            updatedTasks.push({ name: task.name, content: newText, maxPoints: task.maxPoints });
        }
        onUpdateText(idx, "", updatedTasks);
    };

    return (
        <EditableMathArea
            leftAction={<span className="text-xs font-bold text-foreground truncate font-outfit">{task.name}</span>}
            value={sectionText}
            onChange={uebernehmen}
            placeholder="Schülerantwort..."
            className="w-full"
        />
    );
};
