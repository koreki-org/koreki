/**
 * Zuordnung einer Bewertung, deren Aufgabennamen das Modell veraendert hat.
 *
 * Eigene Datei, weil es eine eigene Frage ist: `correction-mapping` entscheidet,
 * WER die Punkte vergibt (Sandbox, Graph oder Modell) — hier geht es nur darum,
 * ZU WELCHER Aufgabe eine gelieferte Bewertung gehoert.
 */
import { Task } from '../../types';

/** Was beide Phasen gemeinsam haben: eine Aufgabe, wie das Modell sie benannt hat. */
interface Benannt {
    name?: string;
}

/**
 * Der Kern eines Aufgabennamens.
 *
 * Wegfallen Fuellwoerter ("Aufgabe", "Task"), Satzzeichen und Leerraum. Damit
 * fallen "Aufgabe 1a", "aufgabe 1a" und "1a)" auf denselben Kern "1a"
 * zusammen. Das ist bewusst KEIN Aehnlichkeitsmass: Es normalisiert nur die
 * Schreibweise, es raet nicht.
 *
 * Eine Punktangabe in Klammern ("(2 P)", "(Max: 4 P)", "(3 Punkte)") gehoert nicht
 * zum Namen und faellt vorher weg. Die Prompts listen die Aufgaben selbst in dieser
 * Form auf, und Modelle uebernehmen sie gelegentlich. Ohne diesen Schritt wurde aus
 * "Aufgabe 1 (2 P)" der Kern "12p" — der passte auf "Aufgabe 1" UND "Aufgabe 12",
 * die Rettung brach ab, und die Aufgabe blieb leer (10.11.2026: qwen3.8 in der
 * Zuordnung, jede Aufgabe eines Blatts "[unbeantwortet]").
 */
export function alsKern(name: string | undefined): string {
    return (name ?? '')
        .toLowerCase()
        .replace(/\(\s*(max\.?\s*:?\s*)?\d+(?:[.,]\d+)?\s*(p|pkt|pkte|punkte?|pt|pts|points?)\.?\s*\)/g, '')
        .replace(/\b(aufgabe|teilaufgabe|task|exercise|nr|no)\b/g, '')
        .replace(/[^a-z0-9\u00e4\u00f6\u00fc\u00df]/g, '');
}

/** Ein geretteter Treffer und die Art, wie er gefunden wurde. */
interface Rettung<T extends Benannt> {
    treffer: T;
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
export function findeVeraenderteAufgabe<T extends Benannt>(
    layoutTask: Task,
    aiTasks: T[],
    allesLayout: Task[]
): Rettung<T> | undefined {
    const kern = alsKern(layoutTask.name);
    if (!kern) return undefined;

    // Stufe 1 — gleicher Kern, nur andere Schreibweise.
    //
    // Mit derselben Gegenprobe wie Stufe 2: "Aufgabe 3.1" und "Aufgabe 31" haben
    // denselben Kern "31". Seit ein Treffer dieser Stufe keinen Hinweis mehr
    // erzeugt (16.11.2026), muss er dafuer auch in beide Richtungen eindeutig sein —
    // eine stille Verwechslung waere schlimmer als eine laute.
    const gleicherKern = aiTasks.filter(t => alsKern(t.name) === kern);
    if (gleicherKern.length > 1) return undefined;
    if (gleicherKern.length === 1) {
        const gleicheImLayout = allesLayout.filter(l => alsKern(l.name) === kern);
        return gleicheImLayout.length === 1 ? { treffer: gleicherKern[0], art: 'kern' } : undefined;
    }

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
 * DER HINWEIS IST EIN EIGENES FELD, kein Text. Bis zum 16.11.2026 stand er als
 * "[KI-FEHLER?] Name nicht exakt (...)" VOR dem Inhalt — in der Zuordnung also im
 * Schuelertext, den die Bewertung wortwoertlich ans Modell schickt
 * (`baueSchuelertext`), in der Bewertung im Feedback an den Schueler. Und er kam
 * auch dann, wenn das Modell nur die Punktangabe aus der Aufgabenliste mitkopiert
 * hatte ("Aufgabe 3.1 (3 P)") — bei jeder Teilaufgabe eines Blatts. Jetzt gilt:
 * - blosse Schreibweise (`kern`): kein Hinweis, die Zuordnung ist eindeutig;
 * - gekuerzter oder erweiterter Name (`anfang`): Hinweis, die Lehrkraft schaut nach.
 *
 * EIGENE FUNKTION SEIT DEM 05.09.2026 — und das ist der Kern der Reparatur. Die
 * Rettung steckte vorher in `mapMissingTask`, und `mapLayoutTask` erreichte die erst
 * NACH den Engine-Zweigen. Eine Rechenketten- oder Graph-Aufgabe lief deshalb auch
 * dann in ihren Zweig, wenn gar keine KI-Aufgabe dazu vorlag: Die Zuordnung wurde nie
 * gerettet, der Fehlbefund nie gemeldet. Siehe den Kommentar an `mapLayoutTask`.
 *
 * Gilt fuer BEIDE Phasen — Korrektur und Zuordnung (`parseMappingResult`). Die
 * Zuordnung hatte bis 10.11.2026 eine eigene, schwaechere Fassung, die nur Gross-
 * und Kleinschreibung verzieh; jeder andere Namenszusatz loeschte dort den Inhalt.
 */
export function findeKiAufgabe<T extends Benannt>(
    layoutTask: Task,
    aiTasks: T[],
    allesLayout: Task[]
): { aiTask?: T; hinweis?: string } {
    const exakt = aiTasks.find(t => t.name === layoutTask.name);
    if (exakt) return { aiTask: exakt };

    const gerettet = findeVeraenderteAufgabe(layoutTask, aiTasks, allesLayout);
    if (!gerettet) return {};

    const treffer = gerettet.treffer;
    if (gerettet.art === 'kern') return { aiTask: treffer };

    const hinweis = `Die KI hat diese Aufgabe als „${treffer.name ?? ''}“ zurückgegeben. Die Zuordnung war eindeutig — bitte prüfen.`;
    return { aiTask: treffer, hinweis };
}
