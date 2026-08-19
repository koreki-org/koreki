/**
 * Zahlen aus Quellen, die keine Zusicherung geben.
 * 🔢
 *
 * Sowohl die Antwort eines Sprachmodells als auch die Eingabemaske liefern
 * Werte, die eine Zahl sein SOLLEN. `Number(...)` macht daraus im Zweifel NaN,
 * und NaN ist ansteckend: Es wandert durch jede Summe, faerbt die Aufgabe, die
 * Gesamtnote und den Export ein.
 *
 * Diese Datei gibt es, weil dieselbe Regel an zwei Stellen gebraucht wird —
 * bei der Abbildung der KI-Antwort und beim Nachrechnen nach einer manuellen
 * Punktekorrektur. An der zweiten fehlte sie (19.08.2026), mit der Folge, dass
 * eine untippbare Maximalpunktzahl den Prozentsatz auf 0 und damit die Note
 * auf 6,0 setzte, waehrend die Lehrkraft gerade Punkte vergab.
 *
 * @module zahlen
 */

/**
 * Eine Zahl aus einer ungesicherten Quelle — oder der Rueckfall.
 *
 * Die beiden urspruenglichen Waechter halfen nirgends:
 * - `typeof x === 'number'` ist fuer NaN wahr,
 * - `x ?? y` und `x || 0` fangen nur null/undefined/leer.
 *
 * Reihenfolge der Pruefungen absichtlich so: leere Werte zuerst, damit
 * `alsModellzahl(null, rueckfall)` den Rueckfall liefert und nicht die 0, die
 * `Number(null)` ergaebe — sonst haette diese Absicherung stillschweigend die
 * Punktvergabe geaendert, statt nur das NaN zu verhindern.
 */
export function alsModellzahl(wert: unknown, rueckfall: number): number {
    if (wert === null || wert === undefined || wert === '') return rueckfall;
    const zahl = Number(wert);
    return Number.isFinite(zahl) ? zahl : rueckfall;
}
