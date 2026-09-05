/**
 * Zuordnung einer Bewertung, deren Aufgabennamen das Modell veraendert hat.
 *
 * Eigene Datei, weil es eine eigene Frage ist: `correction-mapping` entscheidet,
 * WER die Punkte vergibt (Sandbox, Graph oder Modell) — hier geht es nur darum,
 * ZU WELCHER Aufgabe eine gelieferte Bewertung gehoert.
 */
import { Task, AITask } from '../../types';

/**
 * Der Kern eines Aufgabennamens.
 *
 * Wegfallen Fuellwoerter ("Aufgabe", "Task"), Satzzeichen und Leerraum. Damit
 * fallen "Aufgabe 1a", "aufgabe 1a" und "1a)" auf denselben Kern "1a"
 * zusammen. Das ist bewusst KEIN Aehnlichkeitsmass: Es normalisiert nur die
 * Schreibweise, es raet nicht.
 */
export function alsKern(name: string | undefined): string {
    return (name ?? '')
        .toLowerCase()
        .replace(/\b(aufgabe|teilaufgabe|task|exercise|nr|no)\b/g, '')
        .replace(/[^a-z0-9\u00e4\u00f6\u00fc\u00df]/g, '');
}

/** Ein geretteter Treffer und die Art, wie er gefunden wurde. */
interface Rettung {
    treffer: AITask;
    /** `kern`: nur die Schreibweise wich ab. `anfang`: ein Name ist die Kurzform des anderen. */
    art: 'kern' | 'anfang';
}

/**
 * Sucht die Bewertung zu einer Aufgabe, deren Name das Modell veraendert hat.
 *
 * ANLASS. Ein Modell kuerzte "a) Zwei Ursachen" auf "a)". Die Zuordnung fand
 * nichts, und eine fachlich vollstaendig richtige Bewertung wurde zu 0 Punkten
 * mit dem Hinweis "vom System nicht erkannt". Falsche 0 Punkte sind der
 * teuerste Fehler, den diese Datei machen kann.
 *
 * DIE SICHERUNG. Gerettet wird nur, was EINDEUTIG ist — in beide Richtungen:
 * Es darf genau eine KI-Aufgabe in Frage kommen, UND es darf genau eine
 * Layout-Aufgabe auf diese KI-Aufgabe passen. Sonst wird nichts zugeordnet.
 * Bei "Aufgabe 1" und "Aufgabe 11" ist der kurze Name der Anfang des langen;
 * ohne die zweite Pruefung bekaeme die eine Aufgabe die Punkte der anderen.
 * Eine falsch zugeordnete Bewertung waere schlimmer als gar keine, weil sie
 * plausibel aussieht.
 */
export function findeVeraenderteAufgabe(
    layoutTask: Task,
    aiTasks: AITask[],
    allesLayout: Task[]
): Rettung | undefined {
    const kern = alsKern(layoutTask.name);
    if (!kern) return undefined;

    // Stufe 1 — gleicher Kern, nur andere Schreibweise.
    const gleicherKern = aiTasks.filter(t => alsKern(t.name) === kern);
    if (gleicherKern.length === 1) return { treffer: gleicherKern[0], art: 'kern' };
    if (gleicherKern.length > 1) return undefined;

    // Stufe 2 — der eine Name ist die Kurzform des anderen.
    const passt = (a: string, b: string) => a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a));
    const kandidaten = aiTasks.filter(t => passt(alsKern(t.name), kern));
    if (kandidaten.length !== 1) return undefined;

    // Gegenprobe: Beansprucht eine ANDERE Aufgabe der Musterloesung denselben Treffer?
    const trefferKern = alsKern(kandidaten[0].name);
    const konkurrenz = allesLayout.filter(l => passt(alsKern(l.name), trefferKern));
    if (konkurrenz.length !== 1) return undefined;

    return { treffer: kandidaten[0], art: 'anfang' };
}

/**
 * Welche KI-Aufgabe gehoert zu dieser Aufgabe der Musterloesung?
 *
 * Zuerst der exakte Name, dann die Rettung eines veraenderten Namens. Unterschieden
 * wird bewusst zwischen einem blossen Schreibfehler im Namen (Gross-/Kleinschreibung,
 * Leerzeichen, gekuerzte Kennung) und einer wirklich fehlenden Aufgabe: im ersten Fall
 * ist die Bewertung brauchbar und nur der Name schief, im zweiten fehlt sie ganz und
 * das ganze Dokument braucht einen Blick.
 *
 * EIGENE FUNKTION SEIT DEM 05.09.2026 — und das ist der Kern der Reparatur. Die
 * Rettung steckte vorher in `mapMissingTask`, und `mapLayoutTask` erreichte die erst
 * NACH den Engine-Zweigen. Eine Rechenketten- oder Graph-Aufgabe lief deshalb auch
 * dann in ihren Zweig, wenn gar keine KI-Aufgabe dazu vorlag: Die Zuordnung wurde nie
 * gerettet, der Fehlbefund nie gemeldet. Siehe den Kommentar an `mapLayoutTask`.
 */
export function findeKiAufgabe(
    layoutTask: Task,
    aiTasks: AITask[],
    allesLayout: Task[]
): { aiTask?: AITask; hinweis?: string } {
    const exakt = aiTasks.find((t: AITask) => t.name === layoutTask.name);
    if (exakt) return { aiTask: exakt };

    const gerettet = findeVeraenderteAufgabe(layoutTask, aiTasks, allesLayout);
    if (!gerettet) return {};

    const treffer = gerettet.treffer;
    const hinweis = gerettet.art === 'kern'
        ? `[KI-FEHLER?] Name nicht exakt ("${treffer.name}" statt "${layoutTask.name}")`
        : `[KI-FEHLER?] Name gekuerzt oder erweitert ("${treffer.name}" statt "${layoutTask.name}") — Zuordnung war eindeutig, bitte pruefen`;

    return { aiTask: treffer, hinweis };
}
