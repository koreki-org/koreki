import type { Task } from '@/types';

/**
 * Der Stamm einer Hauptaufgabe.
 * 🌳
 *
 * Eine Klassenarbeit gliedert sich oft in Hauptaufgaben mit Teilaufgaben: Unter
 * „Aufgabe 3" steht zuerst die Ausgangslage („Der Agent stellt seine Web-UI nur
 * auf localhost:8080 bereit …"), danach folgen a) und b). Die Analyse legt nur
 * die Teilaufgaben an — der Stamm hatte bis zum 24.10.2026 keinen Platz. Er gilt
 * für mehr als eine Aufgabe, gehört also nicht in deren `content`, aber auch nicht
 * für ALLE, gehört also nicht in den gemeinsamen Rahmen. Er fiel zwischen beiden
 * Regeln durch und fehlte damit in der Musterlösung, die an die Korrektur geht —
 * nachgesehen an zwei echten Klassenarbeiten, bei beiden.
 *
 * WARUM AM TASK UND NICHT IN EINEM EIGENEN SPEICHER. Der gemeinsame Rahmen läuft als
 * eigener Wert durch elf Dateien — Store, Übernahme, Oberfläche, Export, Import —
 * und fehlt bereits im Sitzungsexport: Der Export schreibt ihn nicht, der
 * Import liest ihn (Stand 24.10.2026). Der Stamm hängt deshalb an den
 * Teilaufgaben und reist überall mit, wohin die Aufgabenliste reist. Gespeichert
 * steht er so bei jeder Teilaufgabe der Gruppe; gezeigt, bearbeitet und an die KI
 * geschickt wird er genau EINMAL. Geschrieben wird er nur über `setzeStamm`, das alle
 * Mitglieder gemeinsam ändert — damit kann er nicht auseinanderlaufen.
 */

/** Eine Aufgabe, wie die Analyse sie liefert — mit Rohfeldern für Hauptaufgabe und Stamm. */
export type AnalyseAufgabe = Omit<Task, 'hauptaufgabe'> & { hauptaufgabe?: unknown; stamm?: unknown };

/** Ältere Form der Analyse: Stämme als eigene Liste auf oberster Ebene. */
export interface AnalyseHauptaufgabe {
    name?: unknown;
    stamm?: unknown;
}

const text = (wert: unknown): string => (typeof wert === 'string' ? wert.trim() : '');

/**
 * Hängt die Stämme der Analyse an ihre Teilaufgaben.
 *
 * Die Analyse schreibt den Stamm bei der ERSTEN Teilaufgabe seiner Hauptaufgabe
 * (`stamm`), alle Teilaufgaben nennen ihre Hauptaufgabe (`hauptaufgabe`). WARUM
 * DORT (24.10.2026): Die Analyse läuft ohne Denkschritt und schreibt ihr JSON in
 * einem Zug von oben nach unten. Eine Stamm-Liste am Anfang verlangte, das ganze
 * Dokument vorab nach Stämmen abzusuchen — Stämme mit Zahlen fand sie, erzählende
 * Einleitungen ließ sie fallen. Bei der ersten Teilaufgabe steht der Stamm im
 * Dokument direkt darüber.
 *
 * Die ältere Liste `hauptaufgaben` wird weiter gelesen, falls ein Modell sie liefert.
 * Eine Hauptaufgabe ohne Stamm oder ein Verweis ins Leere bleibt folgenlos.
 */
export function uebernimmHauptaufgaben(tasks: AnalyseAufgabe[], hauptaufgaben?: unknown): Task[] {
    const staemme = new Map<string, string>();
    for (const t of tasks) {
        const name = text(t.hauptaufgabe);
        const stamm = text(t.stamm);
        if (name && stamm && !staemme.has(name)) staemme.set(name, stamm);
    }
    if (Array.isArray(hauptaufgaben)) {
        for (const h of hauptaufgaben as AnalyseHauptaufgabe[]) {
            const name = text(h?.name);
            const stamm = text(h?.stamm);
            if (name && stamm && !staemme.has(name)) staemme.set(name, stamm);
        }
    }
    return tasks.map(({ hauptaufgabe, stamm: _roh, ...rest }) => {
        const name = text(hauptaufgabe);
        const stamm = staemme.get(name);
        return stamm ? { ...rest, hauptaufgabe: { name, stamm } } : rest;
    });
}

/** Die Hauptaufgaben in der Reihenfolge ihres ersten Auftretens, jede einmal. */
export function hauptaufgabenVon(tasks: Task[]): { name: string; stamm: string }[] {
    const gesehen = new Set<string>();
    const liste: { name: string; stamm: string }[] = [];
    for (const t of tasks) {
        const h = t.hauptaufgabe;
        if (!h || gesehen.has(h.name)) continue;
        gesehen.add(h.name);
        liste.push({ name: h.name, stamm: h.stamm });
    }
    return liste;
}

/**
 * Legt für eine Gruppe von Teilaufgaben einen (zunächst leeren) Stamm an — für den
 * Fall, dass die Analyse ihn übersehen hat. Die Lehrkraft trägt ihn dann selbst ein.
 */
export function legeStammAn(tasks: Task[], gruppe: Task[], name: string): Task[] {
    const mitglieder = new Set(gruppe);
    return tasks.map(t => (mitglieder.has(t) ? { ...t, hauptaufgabe: { name, stamm: '' } } : t));
}

/** Ändert den Stamm einer Hauptaufgabe — bei ALLEN ihren Teilaufgaben zugleich. */
export function setzeStamm(tasks: Task[], name: string, stamm: string): Task[] {
    return tasks.map(t => (t.hauptaufgabe?.name === name ? { ...t, hauptaufgabe: { name, stamm } } : t));
}

/** Überschrift des Stamms in der zusammengesetzten Musterlösung. */
export const stammUeberschrift = (name: string) => `### ${name} – Ausgangslage ###`;
