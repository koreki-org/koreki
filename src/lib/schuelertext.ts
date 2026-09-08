import type { Task } from '@/types';
import { hasOcrWarnings } from './task-utils';

/**
 * Der Schuelertext, wie ihn die Korrektur bekommt.
 * ✍️
 *
 * Koreki setzt ihn selbst aus den Aufgaben zusammen und trennt sie mit
 * `### Name ###`. Bauen und Lesen stehen zusammen in dieser Datei: Ein Format,
 * das an einer Stelle geschrieben und an einer anderen gelesen wird, laeuft
 * auseinander, sobald jemand nur eine der beiden Stellen anfasst.
 */

const kopf = (name: string) => `### ${name} ###`;

/** Die Aufgaben zu EINEM Text zusammensetzen — die Form, die zur KI geht. */
export function baueSchuelertext(tasks: Task[]): string {
    return tasks.map(t => `${kopf(t.name ?? '')}\n${t.content || ''}`).join('\n\n');
}

/**
 * Der Abschnitt einer Aufgabe — oder `undefined`, wenn der Text nicht in dieser
 * Form vorliegt.
 *
 * Das `undefined` traegt die Last: Liegen einer Arbeit keine Aufgaben bei, geht
 * der rohe Text der Texterkennung hinaus, ganz ohne Koepfe. Wer dann einen
 * leeren Abschnitt zurueckgaebe, behauptete, die Aufgabe sei sauber.
 */
export function abschnittDerAufgabe(schuelertext: string, name: string): string | undefined {
    const marke = kopf(name);
    const start = schuelertext.indexOf(marke);
    if (start === -1) return undefined;

    const rest = schuelertext.slice(start + marke.length);
    const naechster = rest.search(/^### .+ ###$/m);
    return naechster === -1 ? rest : rest.slice(0, naechster);
}

/**
 * Stand in dem Text, der fuer diese Aufgabe ABGESCHICKT wurde, noch ein
 * OCR-Marker `(?)`?
 *
 * Das ist die Frage, auf die es ankommt — und sie wurde bis zum 08.09.2026
 * falsch gestellt: Geprueft wurde `content` in der ANTWORT des Modells, ein
 * Feld, das die Korrektur-Anweisung gar nicht abfragt. Die Vertrauensbremse
 * griff deshalb nur dann, wenn ein Modell den Schuelertext von sich aus
 * mitschickte — also zufaellig.
 *
 * Umgekehrt gilt jetzt auch das Erwuenschte: Hat die Lehrkraft den Lesefehler
 * VOR dem Korrekturlauf repariert, geht sauberer Text hinaus und es gibt nichts
 * zu bremsen.
 *
 * Ohne Aufgaben-Koepfe zaehlt der ganze Text. Dann ist nicht feststellbar,
 * welche Aufgabe betroffen ist, und die vorsichtige Antwort ist die richtige.
 */
export function hatOcrMarkerFuerAufgabe(schuelertext: string | undefined, name?: string): boolean {
    if (!schuelertext) return false;
    const abschnitt = name ? abschnittDerAufgabe(schuelertext, name) : undefined;
    return hasOcrWarnings(abschnitt ?? schuelertext);
}
