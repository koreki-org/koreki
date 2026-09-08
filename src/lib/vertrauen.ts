/**
 * Der Vertrauenswert einer Bewertung — und was "keine Angabe" bedeutet.
 * 🎯
 *
 * Die Korrektur-Anweisung verlangt `confidence` zweimal: einmal fuer die ganze
 * Arbeit und einmal je Aufgabe. Kleinere Modelle liefern regelmaessig nur das
 * erste. Bis zum 08.09.2026 stand an der Auswertestelle
 * `alsModellzahl(aiTask.confidence, 0)` — aus der fehlenden Angabe wurde damit
 * eine Null, und jede Aufgabe trug ein rotes "Ki-Vertrauen: 0 %".
 *
 * Das ist dieselbe Fehlerklasse wie bei `criteriaScores`: "nicht geliefert" und
 * "null" sind zwei verschiedene Aussagen, und nur eine davon stammt vom Modell.
 * Eine 0 behauptet, das Modell halte die eigene Bewertung fuer wertlos — das
 * waere ein Alarm, den die Lehrkraft ernst nehmen muesste.
 *
 * Deshalb: Eine fehlende Angabe bleibt `undefined`. Die Anzeige sagt dann
 * "n. a." in Grau statt eines roten Prozentwerts, und die Pruef-Liste im
 * Review-Kopf sammelt sie nicht ein.
 *
 * Die ECHTE Null bleibt davon unberuehrt: `mapMissingTask` vergibt sie
 * weiterhin, weil dort tatsaechlich nichts ausgewertet wurde, und die
 * Vertrauensbremse in `parseCorrectionResult` ebenso.
 */

/** Ab hier gilt eine Bewertung als nachpruefenswert. */
export const VERTRAUEN_SCHWELLE = 90;

/**
 * Ein Vertrauenswert aus der Antwort eines Modells — oder nichts.
 *
 * Der Unterschied zu `alsModellzahl(wert, 0)` aus `lib/zahlen`: Dort ist der
 * Rueckfall eine Zahl, weil Punkte immer eine sein muessen. Hier ist die
 * Abwesenheit selbst die Aussage.
 */
export function alsVertrauen(wert: unknown): number | undefined {
    if (wert === null || wert === undefined || wert === '') return undefined;
    const zahl = Number(wert);
    return Number.isFinite(zahl) ? zahl : undefined;
}

/**
 * Ein (?)-Marker im Schuelertext deckelt eine zu hohe Selbsteinschaetzung.
 *
 * Die Regel deckelt, sie ersetzt nicht: Ohne genannten Wert bleibt es leer.
 * Sonst haette der Marker aus einem schweigenden Modell ein sehr sicheres
 * gemacht — 89 % waeren dort eine Erfindung.
 */
export function mitMarkerDeckelung(vertrauen: number | undefined, markerImText: boolean): number | undefined {
    if (!markerImText || vertrauen === undefined) return vertrauen;
    return Math.min(vertrauen, VERTRAUEN_SCHWELLE - 1);
}

/**
 * Sollte die Lehrkraft diese Bewertung nachsehen?
 *
 * Nur bei einem GENANNTEN Wert unter der Schwelle. Eine fehlende Angabe ist
 * kein Verdacht — sonst haette die Umstellung auf `undefined` bloss das rote
 * 0 % durch einen Eintrag in der Pruef-Liste ersetzt.
 */
export function brauchtPruefung(vertrauen?: number): boolean {
    return vertrauen !== undefined && vertrauen < VERTRAUEN_SCHWELLE;
}
