/**
 * Einordnung der Temperatur-Einstellung.
 * 🌡️
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
