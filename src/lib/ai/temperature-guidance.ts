/**
 * Die Sampling-Vorgaben und ihre Einordnung.
 * 🌡️
 *
 * Hier stehen die Zahlen, die Oberflaeche und Inferenz-Layer GEMEINSAM brauchen.
 * Wuerden sie an beiden Orten stehen, liefen sie auseinander — genau das war bis
 * zum 25.08.2026 bei Temperatur, Top P und Vision-Temperatur der Fall.
 *
 * Die Temperatur steuert, wie stark das Modell variiert. Fuer eine Korrektur
 * ist das keine Geschmacksfrage: hohe Werte bedeuten, dass dieselbe Arbeit bei
 * zweimaligem Durchlauf unterschiedlich bewertet werden kann. Diese Funktion
 * ist die einzige Stelle, an der die Lehrkraft davor gewarnt wird.
 *
 * Lag bisher im Rumpf von AiProfileModules und war damit nur ueber das Rendern
 * der gesamten Einstellungsseite erreichbar — obwohl es reine Zuordnung von
 * Zahl zu Text ist, deren Schwellen leicht zu verrutschen sind.
 */

export type TemperatureContext = 'correction' | 'vision';

/**
 * Ab hier ist die Streuung fuer eine Benotung zu gross. Als Konstante, damit
 * die Grenze benennbar ist und nicht nur als Zahl im Vergleich steht.
 */
export const CORRECTION_TEMPERATURE_LIMIT = 1.2;

/**
 * Untergrenze und Standardwert fuer die Korrektur-Temperatur.
 *
 * Lag bis zum 24.08.2026 bei 0.2 — als Sicherheitsabstand zu 0.1, dem Wert, ab dem
 * Qwen in Ollama im FREITEXT Absaetze wiederholt, bis der Puffer voll ist. Gemessen
 * an 120 Korrekturlaeufen zeigte sich: In strukturierter Ausgabe (JSON) tritt das
 * nicht auf, und niedrigere Temperatur bringt dort messbar stabilere Punktzahlen.
 *
 * Die Zahl steht hier und nicht in den Providern, weil Oberflaeche und Inferenz-Layer
 * dieselbe Grenze nennen muessen: Zeigt der Schieberegler 0.1 an, waehrend der Server
 * auf 0.2 anhebt, zaehlt die Oberflaeche etwas an, das nie ankommt.
 */
export const TEMPERATURE_MINIMUM = 0.1;

/**
 * Der Freitext bleibt bei 0.2 — bewusste Ausnahme.
 *
 * Betrifft in Koreki genau eine Aktion: die KI-Zweitmeinung. Sie antwortet der
 * Lehrkraft in Prosa, ohne Schema, das die Ausgabe zum Ende zwingen wuerde. Genau
 * dort beschreibt der Ollama-Kommentar seine Schleife, und genau dort liegen keine
 * Messwerte vor — die Laeufe vom 24.08.2026 waren alle strukturierte Korrekturen.
 */
export const FREETEXT_TEMPERATURE_MINIMUM = 0.2;

/**
 * Standardwert fuer Top P bei der Korrektur.
 *
 * Stand vorher an drei Stellen verschieden: Das Standardprofil speicherte 0.8, der
 * Hinweis im Modal nannte 0.95, und ohne Profil fiel der Ollama-Pfad auf 1.0 zurueck
 * — drei Zahlen fuer dieselbe Sache, von denen der angezeigte Standard nicht der war,
 * den ein Nutzer bekam.
 *
 * Gemessen (60 Laeufe, Temperatur 0.1, Thinking an): Zwischen 0.8, 0.95 und 1.0 ist
 * kein Unterschied in Streuung oder Laufzeit nachweisbar. Die Wahl faellt deshalb
 * nicht auf einen gemessenen Sieger, sondern auf den Wert, mit dem im Betrieb
 * Erfahrung besteht.
 */
export const TOP_P_DEFAULT = 0.95;

/**
 * Untergrenze fuer die Bilderkennung.
 *
 * Deutlich hoeher als beim Bewerten, und das ist kein Widerspruch: Beim Abschreiben
 * einer Seite ist zwar jede Kreativitaet eine Halluzination — aber lokale Modelle
 * bleiben bei zu kalter Einstellung an Wiederholungen haengen, statt die Seite
 * fertig zu lesen. Ein abgebrochener Text ist schlimmer als ein unsicheres Wort.
 *
 * Der Wert stand bis zum 25.08.2026 an drei Stellen verschieden: Das Standardprofil
 * lieferte 0.0, die Oberflaeche hob auf 0.2, und der Ollama-Pfad rechnete mit 0.4.
 * Die Lehrkraft sah also eine Zahl, mit der nie gerechnet wurde.
 */
export const VISION_TEMPERATURE_MINIMUM = 0.4;

/**
 * Beschreibt, was ein Temperaturwert praktisch bedeutet.
 *
 * Die Schwellen sind bewusst unterschiedlich: bei der Texterkennung geht es um
 * Genauigkeit beim Ablesen, bei der Korrektur um die Reproduzierbarkeit der
 * Note. Deshalb liegt die Warnschwelle beim Sehen deutlich niedriger.
 */
export function describeTemperature(value: number, context: TemperatureContext): string {
    if (context === 'vision') {
        if (value === 0) return 'Präzises OCR (Empfohlen)';
        if (value <= 0.3) return 'Sehr deterministisch';
        if (value <= 0.7) return 'Standard Transkription';
        return 'Kreative Texterkennung (Vorsicht!)';
    }

    if (value === 0) return 'Strikte Konsistenz (Deterministisch)';
    if (value <= 0.6) return 'Empfohlen für Deep Reasoning (Präzise)';
    if (value <= 0.8) return 'Ausgewogene Notengebung (Standard)';
    if (value <= CORRECTION_TEMPERATURE_LIMIT) return 'Abwechslungsreiches Feedback';
    return 'Hochgradig kreativ (Nicht für Noten empfohlen)';
}

/** Warnt der Text die Lehrkraft vor diesem Wert? */
export function isTemperatureRiskyForGrading(value: number, context: TemperatureContext): boolean {
    return context === 'vision' ? value > 0.7 : value > CORRECTION_TEMPERATURE_LIMIT;
}

/**
 * Fester Startwert fuer die Zufallsauswahl des Modells.
 *
 * Gleiche Eingabe, gleiche Ausgabe: Ein Stapel, den eine Lehrkraft ein zweites Mal
 * laufen laesst, liefert dieselben Zahlen statt neuer. Koreki sendete bis zum
 * 25.08.2026 an keinen Provider einen Startwert — auch bei niedriger Temperatur
 * wuerfelte das Modell damit bei jedem Aufruf neu.
 *
 * Was das NICHT leistet: Die Bewertung wird davon nicht richtiger, nur wiederholbar.
 * Und bei Mixture-of-Experts-Modellen sowie serverseitiger Buendelung ist ein
 * Startwert eine starke Tendenz, keine harte Zusicherung.
 */
export const SAMPLING_SEED = 42;

/**
 * Nicht jede Aktion darf sich wiederholen.
 *
 * Der Schueler-Simulator erzeugt fiktive Abgaben fuer die Kalibrierung — bewusst bei
 * Temperatur 0.7, "High creativity for diverse answers". Ein fester Startwert lieferte
 * dort bei jedem Aufruf DIESELBEN Schueler und machte den Assistenten wertlos.
 *
 * Der Parameter ist absichtlich `string` und nicht `AIAction`: Diese Datei soll von
 * der Oberflaeche wie vom Inferenz-Layer importierbar bleiben, ohne einen Ringschluss
 * ueber prompt-dispatch zu erzeugen.
 */
export function nutztFestenStartwert(action: string): boolean {
    return action !== 'student-simulator';
}

/**
 * Was ein NICHT gesetzter Denkschritt bedeutet: an.
 *
 * ANLASS (05.09.2026). Derselbe Wert bedeutete an vier Stellen etwas Verschiedenes.
 * `useAiProfiles` las `settings.enableThinking ?? true`, der Ollama-Pfad ebenso, der
 * OpenAI-Pfad fuer die Korrektur ebenso — der Schalter im Anbieter-Panel dagegen zeigte
 * bei `undefined` AUS, und der Speicherweg in `AiConfigurationContent` schrieb das
 * ungesetzte Feld als hartes `false` in die Konfiguration.
 *
 * Zwei Fehler kamen dadurch zusammen: Die Anzeige log ueber den laufenden Betrieb, und
 * wer den Einrichtungsdialog einmal durchlief, schaltete den Denkschritt ungewollt ab.
 * Am 24.08.2026 wurde er als der Schalter mit dem groessten Einfluss auf die Genauigkeit
 * gemessen; das Standardprofil, die Datenbankspalte und der Rueckfall beim Laden setzen
 * ihn deshalb alle auf `true`.
 *
 * Diese Funktion ist die eine Stelle, die die Frage beantwortet. Erzwungen durch
 * `tests/unit/ai/denkschritt-standard.test.ts`.
 */
export function denkschrittAktiv(enableThinking?: boolean | null): boolean {
    return enableThinking ?? true;
}
