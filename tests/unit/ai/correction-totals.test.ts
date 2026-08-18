import { parseCorrectionResult } from '../../../src/lib/ai/ai-orchestrator';
import type { Task, AIAnalysisResult } from '../../../src/types';

/**
 * Gesamtprozentsatz und Rückfallebene (Layer 1)
 * 📊⚖️
 *
 * `overallMatchPercentage` ist nicht bloß eine Anzeige: `useCorrectionRun`
 * bildet daraus über `calculateGrade` die NOTE. Was hier schiefgeht, steht am
 * Ende auf dem Zeugnis.
 *
 * ZWEI BEFUNDE VOM 18.08.2026, beide beim Lesen gefunden und vor der Reparatur
 * nachgestellt:
 *
 * 1. Das Zod-Schema bildete eine unlesbare Einzelwertung des Modells
 *    (`points: "drei"`) auf 0 ab. Damit war "unlesbar" nicht mehr von
 *    "null Punkte" zu unterscheiden — und die Rückfallebene in
 *    `correction-mapping.ts`, die genau für diesen Fall gebaut wurde, konnte
 *    für den strukturierten Kanal NIE greifen. Ergebnis: 0 von 3 Punkten für
 *    eine Aufgabe, die das Modell mit voller Punktzahl bewertet hatte.
 *
 * 2. `tasksLayout` ist ungeprüft (`z.any()`). Eine Maximalpunktzahl, die sich
 *    nicht deuten ließ, machte den Nenner zu NaN und die ganze Arbeit zu 0 %.
 *
 * Der zweite Befund ist auch ein Lehrstück über die naheliegende Reparatur:
 * "unbrauchbar = 0" zählte die Punkte der Aufgabe weiter, ihr Maximum aber
 * nicht — und ergab 180 %. Deshalb prüft der letzte Test hier ausdrücklich,
 * dass Zähler und Nenner dieselben Aufgaben umfassen.
 */

const aufgabe = (name: string, max: unknown): Task =>
    ({ id: name, name, maxPoints: max }) as unknown as Task;

const kriterienAufgabe = (name: string, max: number): Task => ({
    id: name,
    name,
    maxPoints: max,
    taskType: 'calc-trace',
    targetGoal: {
        targetValue: 42,
        maxPoints: max,
        criteria: [{ id: 'begruendung', label: 'Begründung', punktwert: max, source: 'llm', targetIndex: 0 }]
    },
    calcTraceResult: {
        ast: [],
        sandboxErrors: [],
        perTargetResult: [{ targetIndex: 0, reached: true, hasCalculationError: false, associatedStepIds: [] }]
    }
} as unknown as Task);

const antwort = (tasks: unknown[]): AIAnalysisResult => ({ tasks } as unknown as AIAnalysisResult);

describe('Unlesbare Einzelwertung aktiviert die Rueckfallebene', () => {
    /**
     * DER BEFUND. Vorher: 0 von 3 Punkten, weil Zod aus "drei" eine 0 machte
     * und die Rückfallebene damit nichts Unlesbares mehr sah.
     */
    it('kostet die Schuelerin nicht alle Punkte', () => {
        const ergebnis = parseCorrectionResult(
            antwort([{ name: 'A1', pointsObtained: 3, criteriaScores: [{ id: 'begruendung', points: 'drei' }] }]),
            [kriterienAufgabe('A1', 3)]
        );

        expect(ergebnis.tasks[0].pointsObtained).toBe(3);
        expect(ergebnis.overallMatchPercentage).toBe(100);
    });

    /**
     * Ein Eintrag, an dem das Zod-Schema scheitert (hier: `null` in der Liste),
     * laesst die GESAMTE Antwort ungeprüft durchgehen — `safeParse` wird ja nur
     * bei Erfolg übernommen. Dann trägt allein die Absicherung in
     * `correction-mapping.ts`. Vorher stand hier NaN.
     */
    it('haelt auch, wenn das Schema an der Antwort scheitert', () => {
        const ergebnis = parseCorrectionResult(
            antwort([{
                name: 'A1',
                pointsObtained: 3,
                criteriaScores: [{ id: 'begruendung', points: 'drei' }, null]
            }]),
            [kriterienAufgabe('A1', 3)]
        );

        expect(Number.isNaN(ergebnis.tasks[0].pointsObtained)).toBe(false);
        expect(ergebnis.tasks[0].pointsObtained).toBe(3);
    });

    /** Eine echte 0 des Modells bleibt eine echte 0 — kein Rückfall. */
    it('unterscheidet "unlesbar" weiterhin von "null Punkte"', () => {
        const ergebnis = parseCorrectionResult(
            antwort([{ name: 'A1', pointsObtained: 3, criteriaScores: [{ id: 'begruendung', points: 0 }] }]),
            [kriterienAufgabe('A1', 3)]
        );

        expect(ergebnis.tasks[0].pointsObtained).toBe(0);
    });
});

describe('Gesamtprozentsatz bei unbrauchbarer Maximalpunktzahl', () => {
    it('reisst nicht die ganze Arbeit auf 0 %', () => {
        const ergebnis = parseCorrectionResult(
            antwort([
                { name: 'A1', pointsObtained: 5 },
                { name: 'A2', pointsObtained: 8 },
                { name: 'A3', pointsObtained: 4 }
            ]),
            [aufgabe('A1', 5), aufgabe('A2', '10 Punkte'), aufgabe('A3', 5)]
        );

        // 9 von 10 Punkten der beiden auswertbaren Aufgaben.
        expect(ergebnis.overallMatchPercentage).toBe(90);
    });

    /**
     * Die Falle, in die die naheliegende Reparatur lief: Wer die unbrauchbare
     * Maximalpunktzahl als 0 zählt, ihre erreichten Punkte aber stehen lässt,
     * kommt über 100 % — hier wären es 180 % gewesen.
     */
    it('zaehlt die Punkte einer uebersprungenen Aufgabe nicht mit', () => {
        const ergebnis = parseCorrectionResult(
            antwort([
                { name: 'A1', pointsObtained: 5 },
                { name: 'A2', pointsObtained: 8 }
            ]),
            [aufgabe('A1', 5), aufgabe('A2', 'zehn')]
        );

        expect(ergebnis.overallMatchPercentage).toBe(100);
        expect(ergebnis.overallMatchPercentage).toBeLessThanOrEqual(100);
    });

    it('rechnet unveraendert, solange alle Angaben brauchbar sind', () => {
        const ergebnis = parseCorrectionResult(
            antwort([
                { name: 'A1', pointsObtained: 4 },
                { name: 'A2', pointsObtained: 3 }
            ]),
            [aufgabe('A1', 5), aufgabe('A2', 5)]
        );

        expect(ergebnis.overallMatchPercentage).toBe(70);
    });
});
