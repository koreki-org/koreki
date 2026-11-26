import { Task } from '../types';
import { OCR_MARKE_MUSTER } from './task-utils';

/**
 * Alle Unsicherheits-Marken „(?)" einer Arbeit auf einmal entfernen.
 *
 * ANLASS (26.11.2026). Die Bilderkennung setzt die Marke „lieber einmal zu viel
 * als einmal zu wenig" (Vision-Prompt). Oft ist der Text trotzdem richtig
 * gelesen, und die Lehrkraft musste jede Marke einzeln im Textfeld loeschen.
 *
 * Entfernt wird NUR die Marke: Das Wort davor bleibt stehen, andere Marken
 * ([GESTRICHEN], [EINTRAGUNG], [UNLESERLICH]) bleiben unberuehrt. Die Marke wird
 * ueber `OCR_MARKE_MUSTER` erkannt — dieselbe Definition wie in Anzeige,
 * Vertrauensbremse und Zuordnung, also auch „( ? )" mit Leerzeichen.
 */

/**
 * Ein Lauf aus einer oder mehreren Marken samt Leerzeichen davor, dazwischen
 * und danach. Nur Leerzeichen und Tabs — ein Zeilenumbruch gehoert zum Text
 * und bleibt stehen.
 */
const MARKEN_LAUF = new RegExp(
    String.raw`([ \t]*)(?:${OCR_MARKE_MUSTER}[ \t]*)*${OCR_MARKE_MUSTER}([ \t]*)`,
    'g',
);

const ALLE_MARKEN = new RegExp(OCR_MARKE_MUSTER, 'g');

/** Wie viele Marken stehen im Text? */
export function zaehleOcrMarken(text: string): number {
    return text.match(ALLE_MARKEN)?.length ?? 0;
}

/**
 * Den Text ohne Marken. Die Leerzeichen um die Marke werden so behandelt, dass
 * kein doppeltes Leerzeichen und kein Leerzeichen vor einem Satzzeichen
 * zurueckbleibt — und zwei Woerter nicht zusammenwachsen.
 */
export function entferneOcrMarken(text: string): string {
    return text.replace(MARKEN_LAUF, (lauf: string, davor: string, danach: string, start: number) => {
        const vorher = start === 0 ? '\n' : text[start - 1];
        const nachher = text[start + lauf.length] ?? '\n';
        // Am Zeilenanfang oder -ende traegt das Leerzeichen nichts.
        if (vorher === '\n' || nachher === '\n' || nachher === '\r') return '';
        if (danach) return danach;
        // „Wort (?)weiter": das Leerzeichen davor trennt noch zwei Woerter.
        return istBuchstabeOderZiffer(nachher) ? davor : '';
    });
}

/** Ohne `u`-Flag (Ziel ES5): Ein Buchstabe hat eine Gross- und eine Kleinform. */
function istBuchstabeOderZiffer(zeichen: string): boolean {
    return zeichen.toLowerCase() !== zeichen.toUpperCase() || /\d/.test(zeichen);
}

/** Was eine Aufgabe des Layouts zum Entfernen braucht. */
type LayoutAufgabe = Pick<Task, 'name' | 'maxPoints'>;

export interface OhneOcrMarken {
    /** Zahl der entfernten Marken in der ganzen Arbeit. */
    anzahl: number;
    /** Die Aufgaben der Arbeit mit bereinigtem Text — fuer `onUpdateText`. */
    aufgaben: Task[];
}

/**
 * Die Aufgaben einer Arbeit ohne Marken.
 *
 * Gelesen wird derselbe Text, den die Pruefansicht zeigt: `abschnitte` sind
 * positionsgleich zu `layout` (aus `useBatchItemDerivations`) und fallen auf den
 * rohen Text der Bilderkennung zurueck, solange eine Aufgabe noch keinen eigenen
 * Eintrag hat. Geschrieben wird wie beim Tippen im Textfeld: in `item.tasks`.
 *
 * Aufgaben in `item.tasks`, die das Layout nicht kennt, werden mitbereinigt —
 * sonst bliebe das „OCR prüfen!" an der Datei stehen, das genau dort sucht.
 */
export function aufgabenOhneOcrMarken(
    aufgaben: Task[] | undefined,
    layout: LayoutAufgabe[],
    abschnitte: string[],
): OhneOcrMarken {
    const ergebnis = (aufgaben ?? []).map(t => ({ ...t }));
    let anzahl = 0;

    layout.forEach((layoutAufgabe, i) => {
        const text = abschnitte[i] ?? '';
        const n = zaehleOcrMarken(text);
        if (n === 0) return;
        anzahl += n;
        const content = entferneOcrMarken(text);
        const vorhanden = ergebnis.findIndex(t => t.name === layoutAufgabe.name);
        if (vorhanden !== -1) ergebnis[vorhanden] = { ...ergebnis[vorhanden], content };
        else ergebnis.push({ name: layoutAufgabe.name, content, maxPoints: layoutAufgabe.maxPoints });
    });

    const imLayout = new Set(layout.map(l => l.name));
    ergebnis.forEach((t, i) => {
        if (imLayout.has(t.name) || !t.content) return;
        const n = zaehleOcrMarken(t.content);
        if (n === 0) return;
        anzahl += n;
        ergebnis[i] = { ...t, content: entferneOcrMarken(t.content) };
    });

    return { anzahl, aufgaben: ergebnis };
}
