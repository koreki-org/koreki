import type { VariableDefinition } from './types';
import { evaluateExpression } from './plugins';

/**
 * Vorschau und Probelauf im Graph-Editor.
 * 🧮👁️
 *
 * Zwei Regeln, die bisher im Rumpf von GradingGraphModal standen und damit nur
 * ueber das Rendern des gesamten Modals erreichbar waren:
 *
 * 1. Der Erwartungshorizont — was der Graph selbst ausrechnet, wenn man ihm
 *    die hinterlegten Vorgabewerte gibt. Das ist der Massstab, gegen den
 *    spaeter die Schuelerantwort geprueft wird.
 * 2. Die Deutung der Eingaben im Probelauf — aus Textfeldern werden Zahlen
 *    oder Zeichenketten.
 *
 * Beides rechnet, beides hat Randfaelle, und beides veraendert im Fehlerfall
 * Punkte. Deshalb gehoert es geprueft.
 */

/** Platzhalter im Kontext, wenn eine Formel nicht auswertbar war. */
export const EVALUATION_ERROR_VALUE = 'Error ⚠️';

export interface ExpectedValues {
    /** Wert je Variable — Vorgabewert bei Eingaben, Rechenergebnis bei Formeln. */
    context: Record<string, any>;
    /** Fehlermeldung je Variable, deren Formel nicht auswertbar war. */
    errors: Record<string, string>;
}

/**
 * Rechnet den Erwartungshorizont des Graphen aus.
 *
 * WICHTIG — die Reihenfolge der Variablen ist bedeutsam: der Kontext waechst
 * waehrend des Durchlaufs. Eine Formel sieht nur, was VOR ihr steht. Verweist
 * sie auf eine spaeter definierte Variable, ist der Wert zum Zeitpunkt der
 * Auswertung noch nicht da.
 *
 * Das ist kein Versehen, sondern die Rechenreihenfolge des Graphen — es heisst
 * aber auch, dass Umsortieren im Editor eine funktionierende Bewertung
 * unbrauchbar machen kann, ohne dass eine Fehlermeldung erscheint.
 */
export function computeExpectedValues(variables: VariableDefinition[] = []): ExpectedValues {
    const context: Record<string, any> = {};
    const errors: Record<string, string> = {};

    variables.forEach(variable => {
        if (variable.type === 'input') {
            context[variable.id] = variable.defaultValue;
            return;
        }

        if (variable.type === 'formula' && variable.expression) {
            try {
                context[variable.id] = evaluateExpression(variable.expression, context);
            } catch (err: any) {
                context[variable.id] = EVALUATION_ERROR_VALUE;
                errors[variable.id] = err?.message || 'Evaluation error';
            }
        }
    });

    return { context, errors };
}

/**
 * Deutet die Eingaben des Probelaufs.
 *
 * Leere und nur aus Leerzeichen bestehende Felder werden AUSGELASSEN, nicht als
 * 0 uebernommen. Die Reihenfolge der beiden Pruefungen ist wesentlich:
 * `Number('')` ist 0, eine Pruefung auf Zahl vor der Pruefung auf Leere wuerde
 * jedes leere Feld in eine beantwortete 0 verwandeln — und damit Punkte fuer
 * etwas vergeben, das die Schuelerin gar nicht geschrieben hat.
 */
export function parsePlaygroundInputs(
    variables: VariableDefinition[] = [],
    rawInputs: Record<string, string> = {}
): Record<string, any> {
    const studentValues: Record<string, any> = {};

    variables.forEach(variable => {
        const raw = rawInputs[variable.id];
        if (raw === undefined || raw.trim() === '') return;

        studentValues[variable.id] = isNaN(Number(raw)) ? raw.trim() : Number(raw);
    });

    return studentValues;
}

/**
 * Fuellt den Probelauf mit den erwarteten Werten — die "perfekte" Antwort,
 * mit der sich ein Graph in einem Klick gegen sich selbst pruefen laesst.
 */
export function buildPerfectInputs(
    variables: VariableDefinition[] = [],
    expected: Record<string, any> = {}
): Record<string, string> {
    const perfect: Record<string, string> = {};

    variables.forEach(variable => {
        perfect[variable.id] = String(expected[variable.id] ?? '');
    });

    return perfect;
}
