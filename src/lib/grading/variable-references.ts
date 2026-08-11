/**
 * Verweise auf Variablen innerhalb von Formeln.
 * 🔗🛡️
 *
 * Ein Bewertungsgraph besteht aus Variablen, die einander in Formeln
 * referenzieren (`flaeche = laenge * breite`). An vier Stellen im Code wurde
 * gefragt "kommt diese Variable in dieser Formel vor?" — und an drei davon
 * wurde die ID UNGEPRUEFT in einen regulaeren Ausdruck interpoliert:
 *
 *   new RegExp(`\\b${id}\\b`)
 *
 * Variablen-IDs sind aber frei eingebbar. Beim Umbenennen gibt es nur eine
 * Pruefung auf Eindeutigkeit, keine auf erlaubte Zeichen. Damit gilt:
 *
 * - `x(1)` erzeugt ein ungueltiges Muster → SyntaxError, das Modal stuerzt ab.
 * - `a+b` erzeugt ein GUELTIGES, aber falsches Muster → beim Umbenennen werden
 *   fremde Stellen im Formelwerk ersetzt. Das faellt niemandem auf, veraendert
 *   aber die Bewertung.
 *
 * Besonders unangenehm: eine der ungeprueften Stellen lag in GraphRunner, also
 * in der Bewertungs-Engine selbst, nicht nur in der Oberflaeche. Die korrekte
 * Maskierung existierte im Projekt bereits (criterion-source.ts) — sie war nur
 * nicht ueberall angewandt. Genau darum liegt sie jetzt an einer Stelle.
 */

/** Maskiert Regex-Sonderzeichen, damit ein Wert buchstaeblich gesucht wird. */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Muster, das die Variable als eigenstaendiges Wort trifft — nicht als Teil
 * eines laengeren Bezeichners (`laenge` darf nicht in `laenge_alt` treffen).
 *
 * Bewusst mit Blickrichtungs-Zusicherungen statt mit `\b`: eine Wortgrenze
 * verlangt auf EINER Seite ein Wortzeichen. Endet die ID auf ein anderes
 * Zeichen — etwa `x(1)` — kann `\b` dahinter nie greifen, und das Muster
 * findet die Variable selbst dann nicht, wenn sie dasteht. Die Zusicherungen
 * pruefen stattdessen direkt, was hier gemeint ist: links und rechts darf kein
 * Wortzeichen anschliessen.
 */
export function variableReferencePattern(variableId: string, flags?: string): RegExp {
    return new RegExp(`(?<!\\w)${escapeRegExp(variableId)}(?!\\w)`, flags);
}

/** Kommt die Variable in dieser Formel vor? */
export function referencesVariable(expression: string | undefined | null, variableId: string): boolean {
    if (!expression || !variableId) return false;
    return variableReferencePattern(variableId).test(expression);
}

/**
 * Schreibt alle Verweise auf `oldId` in einer Formel auf `newId` um.
 *
 * Wird beim Umbenennen einer Variable gebraucht: bleibt ein Verweis stehen,
 * zeigt die Formel ins Leere und der Graph rechnet still falsch.
 */
export function renameVariableReferences(
    expression: string | undefined | null,
    oldId: string,
    newId: string
): string {
    if (!expression || !oldId) return expression ?? '';
    return expression.replace(variableReferencePattern(oldId, 'g'), newId);
}

/**
 * Alle Variablen aus `candidateIds`, die in der Formel vorkommen.
 * Die Reihenfolge folgt `candidateIds`, damit das Ergebnis stabil ist.
 */
export function collectReferencedVariables(
    expression: string | undefined | null,
    candidateIds: string[]
): string[] {
    if (!expression) return [];
    return candidateIds.filter(id => referencesVariable(expression, id));
}
