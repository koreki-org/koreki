/**
 * Waechter: Erst zuordnen, dann bewerten. 🔗
 *
 * GEMELDET AM 05.09.2026 aus der Desktop-Fassung. Schueler 2 bekam fuer die
 * Rechenaufgabe 0 von 3 Punkten. Es fehlten die Punktevergabe-Tabelle und die
 * paedagogische Rueckmeldung; stattdessen stand da "Die mathematische Pruefung wurde
 * vollautomatisch durch die CalcTrace-Engine validiert" — bei einem Vertrauenswert von
 * 95 Prozent.
 *
 * DIE URSACHE lag in der Reihenfolge in `mapLayoutTask`:
 *
 * ```
 * const aiTask = aiTasks.find(t => t.name === layoutTask.name);
 * if (layoutTask.calcTraceResult) return mapCalcTraceTask(layoutTask, aiTask);  // auch ohne Treffer
 * ...
 * return mapMissingTask(layoutTask, aiTasks, allesLayout);                      // Rettung erst hier
 * ```
 *
 * Lieferte das Modell die Aufgabe nicht (oder unter leicht anderem Namen), lief die
 * Rechenketten-Aufgabe trotzdem in ihren Zweig — nur ohne KI-Ergebnis. Drei Folgen auf
 * einmal, und keine davon sichtbar:
 *
 * * Die Kriterien-Schleife braucht die KI-Aufgabe und wurde uebersprungen: keine
 *   Punkte, keine Punktevergabe-Tabelle.
 * * Die Namensrettung sitzt in `mapMissingTask` und wurde nie erreicht.
 * * Der Fehlbefund samt Vertrauenswert 0 ebenso — die Null sah aus wie ein Urteil.
 *
 * Fuer Graph-Aufgaben (PANG/AGS) galt dasselbe; die Zeile stand direkt darunter.
 *
 * DIE REGEL. Ohne KI-Aufgabe wird nicht bewertet — auch dann nicht, wenn eine Engine
 * gerechnet hat. Und die Namensrettung gilt fuer ALLE Aufgabenarten, nicht nur fuer die
 * ohne Engine.
 */
import { mapLayoutTask } from '../../../src/lib/ai/correction-mapping';
import type { Task, AITask } from '../../../src/types';

const RECHENAUFGABE: Task = {
    id: 't1',
    name: 'Aufgabe 1',
    maxPoints: 3,
    taskType: 'calc-trace',
    targetGoal: {
        targetValue: 9600,
        maxPoints: 3,
        criteria: [{ id: 'ansatz', label: 'Ansatz', punktwert: 3, source: 'llm', targetIndex: 0 }]
    },
    calcTraceResult: {
        ast: [{ id: 'step_1', original_text: '40 * 0.2 * 1000', formula: '40 * 0.2 * 1000', result: 8000, unit: 'kWh' }],
        sandboxErrors: [],
        perTargetResult: [{ targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: ['step_1'] }]
    }
} as unknown as Task;

const GRAPHAUFGABE: Task = {
    id: 't2',
    name: 'Aufgabe 2',
    maxPoints: 4,
    gradingResult: { totalPoints: 4, nodes: [] }
} as unknown as Task;

const kiAufgabe = (p: Partial<AITask>): AITask => ({
    name: 'Aufgabe 1',
    maxPoints: 3,
    pointsObtained: 2,
    feedback: 'Der Ansatz stimmt, der Materialwert ist falsch.',
    confidence: 90,
    content: '',
    ...p
} as AITask);

describe.each([
    { art: 'Rechenkette', aufgabe: RECHENAUFGABE },
    { art: 'Graph', aufgabe: GRAPHAUFGABE }
])('$art-Aufgabe ohne passende KI-Antwort', ({ aufgabe }) => {
    /** Das Modell hat die Aufgabe gar nicht zurueckgegeben. */
    const ohneAntwort = () => mapLayoutTask(aufgabe, [], [aufgabe]);

    it('meldet den Fehlbefund, statt still zu bewerten', () => {
        const { task, mappingError } = ohneAntwort();

        expect(mappingError).toBe(true);
        expect(task.feedback).toContain('Vom System nicht erkannt');
    });

    /**
     * Der teuerste Teil des gemeldeten Falls: Die Null trug denselben Vertrauenswert
     * wie eine gepruefte Bewertung. Wer die Liste ueberfliegt, sieht keinen Unterschied.
     */
    it('behauptet kein Vertrauen in eine Bewertung, die es nicht gibt', () => {
        expect(ohneAntwort().task.confidence).toBe(0);
    });

    /**
     * Und der Block darf nicht behaupten, die Engine habe die Aufgabe geprueft —
     * gerechnet hat sie, bewertet wurde nichts.
     */
    it('zeigt keinen Engine-Block ohne Bewertung', () => {
        expect(ohneAntwort().task.feedback).not.toContain('vollautomatisch');
        expect(ohneAntwort().task.feedback).not.toContain('CalcTrace Engine');
    });
});

describe('Namensrettung gilt auch fuer Engine-Aufgaben', () => {
    /**
     * Der zweite, leisere Teil desselben Fehlers: Kuerzt das Modell den Namen, wurde
     * eine Rechenketten-Aufgabe frueher NICHT gerettet — die Rettung stand hinter den
     * Engine-Zweigen. Fuer Aufgaben ohne Engine griff sie seit dem 03.09.2026.
     */
    it('rettet eine Rechenketten-Aufgabe mit gekuerztem Namen', () => {
        const ki = [kiAufgabe({ name: '1', pointsObtained: 2 })];

        const { task, mappingError } = mapLayoutTask(RECHENAUFGABE, ki, [RECHENAUFGABE]);

        expect(task.feedback).toContain('[KI-FEHLER?]');
        expect(task.feedback).toContain('CalcTrace Engine');
        expect(mappingError).toBeUndefined();
    });

    /** Der exakte Treffer bleibt unberuehrt — kein Hinweis, wo nichts schiefging. */
    it('setzt beim exakten Treffer keinen Hinweis', () => {
        const { task } = mapLayoutTask(RECHENAUFGABE, [kiAufgabe({})], [RECHENAUFGABE]);

        expect(task.feedback).not.toContain('[KI-FEHLER?]');
        expect(task.feedback).toContain('CalcTrace Engine');
    });

    /**
     * Und die Punktevergabe-Tabelle ist wieder da: Sie entsteht in der
     * Kriterien-Schleife, und die lief ohne KI-Aufgabe nicht.
     */
    it('fuellt die Punktevergabe, sobald eine KI-Aufgabe vorliegt', () => {
        const { task } = mapLayoutTask(RECHENAUFGABE, [kiAufgabe({
            criteriaScores: [{ id: 'ansatz', points: 2 }]
        } as Partial<AITask>)], [RECHENAUFGABE]);

        expect(task.feedback).toContain('Punktevergabe');
        expect(task.feedback).toContain('Ansatz');
        expect(task.pointsObtained).toBe(2);
    });
});
