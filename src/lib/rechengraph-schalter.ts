import { Task } from './logic';

/**
 * Rechengraphen abschalten, ohne sie zu loeschen.
 *
 * ANLASS (26.11.2026). Ein an der Musterloesung gebildeter Graph (Bewertungs-
 * Graph oder Rechenkette) lief bei jeder Korrektur mit. Abwaehlen ging nur per
 * Loeschen — unwiderruflich, und wer vergleichen wollte, musste ihn danach neu
 * bilden lassen.
 *
 * Die EINE Wahrheit ist `Task.rechengraphAus` an der Aufgabe. Der Haken unter
 * „Alle Arbeiten" setzt nur diese Felder (`setzeAlleRechengraphen`); einen
 * eigenen, globalen Zustand gibt es nicht — sonst koennte oben „aus" und an der
 * Aufgabe „an" stehen.
 */

/** Hat die Aufgabe einen Rechengraphen, den die Korrektur benutzen wuerde? */
export function hatRechengraph(task: Task): boolean {
    return !!task.gradingGraph || !!task.targetGoal || !!task.calcTrace;
}

/** Benutzt die naechste Korrektur den Rechengraphen dieser Aufgabe? */
export function rechengraphAktiv(task: Task): boolean {
    return hatRechengraph(task) && !task.rechengraphAus;
}

/**
 * Das Layout, das an die Korrektur geht: abgeschaltete Graphen fehlen.
 *
 * Die Aufgabe sieht danach so aus wie nach „Löschen" im Graph-Fenster
 * (`ModelSolutionCard`, `onDeleteGraph`): Typ `default`, kein Graph, keine
 * Rechenkette. Damit greift an KEINER der Stellen, die einen Graphen auswerten
 * (Rechenlauf, Zuordnung, Prompt-Bericht), eine Sonderregel — sie sehen ihn
 * schlicht nicht. Der gespeicherte Graph bleibt im Zustand unberuehrt.
 */
export function layoutFuerKorrektur(layout: Task[]): Task[] {
    return layout.map(task => {
        if (!task.rechengraphAus || !hatRechengraph(task)) return task;
        return { ...task, taskType: 'default', gradingGraph: undefined, targetGoal: undefined, calcTrace: undefined };
    });
}

export interface RechengraphStand {
    /** Aufgaben mit Rechengraph. */
    mit: number;
    /** Davon eingeschaltet. */
    aktiv: number;
}

export function rechengraphStand(layout: Task[]): RechengraphStand {
    const mit = layout.filter(hatRechengraph);
    return { mit: mit.length, aktiv: mit.filter(rechengraphAktiv).length };
}

/** Alle Rechengraphen an- oder ausschalten. Aufgaben ohne Graph bleiben, wie sie sind. */
export function setzeAlleRechengraphen(layout: Task[], an: boolean): Task[] {
    return layout.map(task => hatRechengraph(task) ? { ...task, rechengraphAus: !an } : task);
}
