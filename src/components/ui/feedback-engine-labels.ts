/**
 * Beschriftung und Alltagssprache der technischen Analyse-Bloecke.
 *
 * Eigene Datei, weil es reine Textzuordnung ist — kein Verhalten. In der
 * Komponente stand sie der Groessengrenze im Weg, ohne dort etwas zu erklaeren.
 */
/** Welche Engine den technischen Block erzeugt hat — bestimmt seine Beschriftung. */
export type FeedbackEngine = 'PANG' | 'AGS' | 'CalcTrace';

/**
 * Anzeigename je Engine. Ohne diese Zuordnung trug jeder technische Block das Label
 * "PANG", auch wenn ihn die CalcTrace-Rechenkette erzeugt hatte — die beiden Engines
 * sind aber verschieden (Rechengraph vs. Rechenkette) und duerfen nicht gleich heissen.
 */
export const ENGINE_LABELS: Record<FeedbackEngine, string> = {
    PANG: 'Technische PANG-Detailanalyse einblenden',
    AGS: 'Technische AGS-Detailanalyse einblenden',
    CalcTrace: 'Technische Rechenketten-Detailanalyse einblenden'
};

/**
 * Ein Satz in Alltagssprache neben der Beschriftung.
 *
 * Die Beschriftungen oben sind Eigennamen unserer Rechenwerke — "PANG", "AGS",
 * "Rechenkette" sagen einer Lehrkraft nichts. Sie oeffnete den Block also entweder
 * gar nicht oder stand vor einem Sandbox-Protokoll ohne zu wissen, was sie da liest.
 *
 * BENENNE DAS BAUTEIL, NICHT DAS PRODUKT. Hier stand zuerst "Koreki hat ... selbst
 * nachgerechnet". Das ist irrefuehrend: "Koreki" ist das ganze System, das
 * Sprachmodell eingeschlossen. Wer so schreibt, muss spaeter erklaeren, warum
 * "Koreki nicht entscheidet, sondern die KI" — ein Widerspruch, der nur entsteht,
 * weil der Teil den Namen des Ganzen traegt. Innerhalb dieser Bloecke heissen die
 * Bauteile deshalb "die Rechenkette", "der Bewertungsgraph" und "die KI".
 *
 * Deshalb IMMER sichtbar und nicht als Tooltip: Ein Hinweis, der erst beim Zeigen
 * erscheint, erreicht auf dem Tablet niemanden — und dort wird korrigiert.
 *
 * ACHTUNG, "PANG" und "AGS" sind NICHT zwei Rechenwerke. Es ist dasselbe: der
 * Bewertungsgraph. Verschieden ist nur die DARSTELLUNG seines Ergebnisses, und die
 * waehlt `feedback-formatter.ts` nach der Aufgabenart — Subnetting bekommt eine
 * Tabelle ("AGS"), alles andere eine Schrittliste ("PANG"). Beide erkennen
 * Folgefehler (`consecutive_correct`).
 *
 * Der Anbieter selbst war sich am 04.09.2026 unsicher, welcher Name wofuer steht.
 * Wenn der Autor die eigenen Namen verwechselt, tut es eine Lehrkraft erst recht:
 * Deshalb sagen beide Beschreibungen dasselbe ueber dieselbe Sache und
 * unterscheiden sich nur darin, WAS unten zu sehen ist.
 */
export const ENGINE_BESCHREIBUNGEN: Record<FeedbackEngine, string> = {
    PANG: 'Der Bewertungsgraph hat jeden Rechenschritt nachgerechnet. Folgefehler werden dabei erkannt.',
    AGS: 'Der Bewertungsgraph hat jedes Subnetz nachgerechnet. Folgefehler werden dabei erkannt.',
    CalcTrace: 'Die Rechenkette hat die Aufgabe nachgerechnet — hier steht, was dabei belegt ist.'
};
