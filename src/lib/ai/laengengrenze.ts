/**
 * Die Antwort der KI endete an ihrer Laengengrenze.
 * ✂️
 *
 * ANLASS (13.11.2026). Eine IHK-Zwischenpruefung mit 13 Teilaufgaben, korrigiert
 * mit `qwen3.8` ueber Ollama: Das Modell durfte 15.254 Tokens schreiben, dachte
 * davon rund 13.000 lang ueber alle 13 Aufgaben nach — und wurde beim Aufschreiben
 * mitten in Aufgabe 3.3 abgeschnitten (`done_reason: "length"`, mitgeschnitten
 * zwischen Koreki und Ollama). Koreki nahm die halbe Antwort als ganze:
 * `repairTruncatedJson` schloss das JSON, die sechs geschriebenen Aufgaben kamen
 * an, die uebrigen sieben hiessen „Vom System nicht erkannt oder von der KI
 * uebersprungen". Das stimmte nicht — erkannt und durchdacht waren sie, es fehlte
 * der Platz. Wer das liest, sucht den Fehler an der falschen Stelle.
 *
 * Die Teilantwort bleibt bewusst erhalten (Entscheidung vom 18.08.2026, siehe
 * `mistral-provider.ts`: „acht von zehn Aufgaben bewertet" statt Totalverlust).
 * Neu ist nur, dass der Abbruch mitreist und die Zuordnung ihn benennen kann.
 *
 * Alle drei Anbieter melden ihn, nur unter verschiedenem Namen: Ollama in
 * `done_reason`, der OpenAI-kompatible Weg und Mistral in `finish_reason`.
 * Mistral kennt zusaetzlich `model_length` — das Kontextfenster des Modells
 * selbst war voll, nicht die angeforderte Laenge.
 */

const LAENGEN_GRUENDE = ['length', 'model_length'];

/** Endete die Antwort, weil die Laengengrenze griff? */
export function istLaengenabbruch(grund: string | null | undefined): boolean {
    return typeof grund === 'string' && LAENGEN_GRUENDE.includes(grund);
}

/** Feld, unter dem der Abbruch im Ergebnis mitreist. */
export interface AbbruchVermerk {
    antwortAbgeschnitten?: boolean;
}

/**
 * Vermerkt den Abbruch am gelesenen Ergebnis — nur wenn er vorlag, damit
 * vollstaendige Antworten unveraendert bleiben. Ollama liefert sein Ergebnis
 * ungetypt; was kein Objekt ist, kann nichts mitnehmen und bleibt, wie es ist.
 */
export function vermerkeAbbruch<T>(ergebnis: T, grund: string | null | undefined): T {
    if (!istLaengenabbruch(grund) || typeof ergebnis !== 'object' || ergebnis === null) return ergebnis;
    const vermerkt: AbbruchVermerk = { ...ergebnis, antwortAbgeschnitten: true };
    // ARCH: Dasselbe Objekt plus ein optionales Feld — der Typ des Aufrufers bleibt gueltig.
    return vermerkt as T;
}

/** Was die Lehrkraft an jeder Aufgabe liest, die dem Abbruch zum Opfer fiel. */
export const ABGESCHNITTEN_HINWEIS =
    'Nicht bewertet: Die Antwort der KI wurde an ihrer Längengrenze abgeschnitten, '
    + 'bevor diese Aufgabe fertig geschrieben war. Bitte die Arbeit erneut korrigieren.';

/**
 * Die Aufgaben einer abgeschnittenen Antwort, denen man trauen kann.
 *
 * Die ZULETZT geschriebene faellt weg. Sie war es, an der der Platz ausging, und
 * `repairTruncatedJson` hat sie nur formal geschlossen: Fehlt dabei
 * `pointsObtained`, macht das Zod-Gate daraus 0 — eine Null, die aussieht wie
 * ein Urteil. Im Mitschnitt vom 13.11.2026 brach die Antwort genau so ab:
 * Aufgabe 3.3 hatte ihre Notizen begonnen, aber noch keine Punkte. Ob die
 * letzte Aufgabe zufaellig vollstaendig ist, laesst sich nicht sicher sagen;
 * im Zweifel wird sie erneut bewertet statt falsch.
 */
export function ohneAngefangeneAufgabe<T>(aufgaben: T[], abgeschnitten: boolean): T[] {
    return abgeschnitten ? aufgaben.slice(0, -1) : aufgaben;
}

interface ZuordnungsErgebnis {
    task: { feedback?: string };
    mappingError?: boolean;
}

/**
 * Benennt fehlende Aufgaben richtig. Ohne Abbruch bleibt „nicht erkannt“ stehen —
 * dann hat das Modell die Aufgabe tatsaechlich ausgelassen.
 */
export function beschrifteAbgeschnittene<E extends ZuordnungsErgebnis>(ergebnisse: E[], abgeschnitten: boolean): E[] {
    if (!abgeschnitten) return ergebnisse;
    return ergebnisse.map(e => e.mappingError
        ? { ...e, task: { ...e.task, feedback: ABGESCHNITTEN_HINWEIS } }
        : e);
}
