import {
    alsModellzahl,
    mapCalcTraceTask,
    mapGraphTask,
    mapModelTask,
    mapLayoutTask
} from '../../../src/lib/ai/correction-mapping';
import type { Task, AITask } from '../../../src/types';

/**
 * NaN darf nicht in die Punktevergabe gelangen (Layer 1)
 * 🧮🛡️
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. Alle vier Abbildungs-Zweige rechneten die
 * Punktzahl des Modells mit `Number(...)` um, ohne das Ergebnis zu prüfen.
 * Schickte das Modell für ein einziges Kriterium `points: "drei"` — oder ließ
 * das Feld weg —, wurde daraus NaN, die Summe der Aufgabe wurde NaN, und mit
 * ihr die Gesamtnote und der Excel-Export.
 *
 * Zwei bereits vorhandene Wächter griffen dabei NICHT, und das ist der Kern
 * des Befunds:
 *
 *   `typeof x === 'number'`   ist für NaN WAHR.
 *   `x ?? y` / `x || 0`       fangen nur null/undefined/leer, nicht NaN.
 *
 * Besonders bitter: Der Rückfall "KI-Einschätzung nicht auswertbar", der für
 * genau diese Lage gebaut wurde, prüfte auf `=== undefined` — und wurde vom
 * NaN umgangen.
 *
 * Diese Datei prüft die Regel an ALLEN VIER Zweigen. Sie ist der Nachweis für
 * die wiederkehrende Fehlerklasse dieses Projekts: die Regel galt nirgends,
 * weil niemand die Geschwister nebeneinander gelegt hat.
 */

const AUFGABE: Task = {
    id: 't1',
    name: 'Aufgabe 1',
    maxPoints: 3,
    taskType: 'calc-trace',
    targetGoal: {
        targetValue: 42,
        maxPoints: 3,
        criteria: [{ id: 'begruendung', label: 'Begründung', punktwert: 3, source: 'llm', targetIndex: 0 }]
    },
    calcTraceResult: {
        ast: [],
        sandboxErrors: [],
        perTargetResult: [{ targetIndex: 0, reached: true, hasCalculationError: false, associatedStepIds: [] }]
    }
} as unknown as Task;

const kiAufgabe = (p: Partial<AITask>): AITask => ({
    name: 'Aufgabe 1',
    pointsObtained: 3,
    ...p
} as AITask);

describe('alsModellzahl', () => {
    it('nimmt brauchbare Zahlen — auch als Zeichenkette', () => {
        expect(alsModellzahl(2, 0)).toBe(2);
        expect(alsModellzahl('2.5', 0)).toBe(2.5);
        expect(alsModellzahl(0, 9)).toBe(0);
    });

    it('weist alles zurueck, was keine endliche Zahl ergibt', () => {
        ['drei', 'NaN', {}, [1, 2], Infinity, NaN, 'ADHS'].forEach(unsinn => {
            expect(alsModellzahl(unsinn, 7)).toBe(7);
        });
    });

    /**
     * Die Reihenfolge im Helfer ist kein Zufall: `Number(null)` ergibt 0. Ohne
     * die vorgezogene Leer-Prüfung hätte die Absicherung stillschweigend die
     * Punktvergabe geändert — überall dort, wo bisher `??` auf einen ANDEREN
     * Rückfall als 0 zeigte (z. B. auf die Graph-Punkte).
     */
    it('behandelt leere Werte als "nicht angegeben", nicht als 0', () => {
        expect(alsModellzahl(null, 5)).toBe(5);
        expect(alsModellzahl(undefined, 5)).toBe(5);
        expect(alsModellzahl('', 5)).toBe(5);
    });
});

describe('Kein NaN in der Punktevergabe — alle vier Zweige', () => {
    /** DER GEMELDETE FALL. */
    it('CalcTrace: ein unsinniges Kriterium faerbt nicht die ganze Aufgabe ein', () => {
        const { task } = mapCalcTraceTask(AUFGABE, kiAufgabe({
            criteriaScores: [{ id: 'begruendung', points: 'drei' as unknown as number }]
        }));

        expect(Number.isNaN(task.pointsObtained)).toBe(false);
    });

    it('CalcTrace: ein fehlendes points-Feld ebensowenig', () => {
        const { task } = mapCalcTraceTask(AUFGABE, kiAufgabe({
            criteriaScores: [{ id: 'begruendung' } as unknown as { id: string; points: number }]
        }));

        expect(Number.isNaN(task.pointsObtained)).toBe(false);
    });

    /**
     * Der eigentliche Gewinn: Statt NaN greift jetzt der Rückfall, den der
     * Autor genau dafür gebaut hat — die Gesamtpunktzahl des Modells.
     */
    it('CalcTrace: nutzt bei unlesbarem Kriterium die Gesamtpunktzahl der KI', () => {
        const { task } = mapCalcTraceTask(AUFGABE, kiAufgabe({
            pointsObtained: 2,
            criteriaScores: [{ id: 'begruendung', points: 'drei' as unknown as number }]
        }));

        expect(task.pointsObtained).toBe(2);
        expect(task.correctionNotes).toContain('nicht auswertbar');
    });

    /**
     * Der strukturierte Kanal gewinnt gegen die Notizen. Ein Unsinn dort darf
     * deshalb nicht die Punktzahl zerstören, die aus den Notizen sauber
     * gelesen wurde — sonst zerstört der Vorrang ausgerechnet die
     * Rückfallebene.
     */
    it('CalcTrace: unsinniges criteriaScores zerstoert die Notizen-Lesung nicht', () => {
        const { task } = mapCalcTraceTask(AUFGABE, kiAufgabe({
            pointsObtained: 0,
            correctionNotes: '- begruendung: 3 / 3',
            criteriaScores: [{ id: 'begruendung', points: 'drei' as unknown as number }]
        }));

        expect(task.pointsObtained).toBe(3);
    });

    it('Graph: faellt bei unsinniger KI-Punktzahl auf die Engine zurueck', () => {
        const graphAufgabe = {
            id: 't2', name: 'Aufgabe 2', maxPoints: 5, taskType: 'graph',
            gradingGraph: { variables: [], disablePoints: true },
            gradingResult: { totalPoints: 4, stepResults: [] }
        } as unknown as Task;

        const { task } = mapGraphTask(graphAufgabe, kiAufgabe({ pointsObtained: NaN }));

        expect(task.pointsObtained).toBe(4);
    });

    /**
     * `disablePoints: false` ist hier zwingend und war beim ersten Anlauf
     * falsch gesetzt: Ohne den ausdrücklichen Wert liefert
     * `shouldDisablePoints` für einen Graphen `true`, und der Test prüfte
     * zweimal denselben Zweig. Er bestand damit gegen den FEHLERHAFTEN Stand —
     * die Mutationsprobe hat es aufgedeckt.
     */
    it('Graph (streng): unsinnige KI-Punktzahl ersetzt die Graph-Punkte nicht', () => {
        const graphAufgabe = {
            id: 't2', name: 'Aufgabe 2', maxPoints: 5, taskType: 'graph',
            gradingGraph: { variables: [], disablePoints: false },
            gradingResult: { totalPoints: 4, stepResults: [] }
        } as unknown as Task;

        const { task } = mapGraphTask(graphAufgabe, kiAufgabe({
            pointsObtained: 'vier' as unknown as number,
            feedback: '[⚙️ PANG Engine - Mathematischer Graph-Abgleich]\nfertig'
        }));

        expect(task.pointsObtained).toBe(4);
    });

    it('Modell: unsinnige Punktzahl und Confidence werden zu 0', () => {
        const { task } = mapModelTask(
            { id: 't3', name: 'Aufgabe 3', maxPoints: 2 } as unknown as Task,
            kiAufgabe({
                pointsObtained: 'zwei' as unknown as number,
                confidence: 'hoch' as unknown as number
            })
        );

        expect(task.pointsObtained).toBe(0);
        expect(task.confidence).toBe(0);
    });

    it('Fehlende Aufgabe: der Beinahe-Treffer bringt kein NaN mit', () => {
        const { task } = mapLayoutTask(
            { id: 't4', name: 'Aufgabe 4', maxPoints: 2 } as unknown as Task,
            [kiAufgabe({ name: 'aufgabe 4', pointsObtained: 'zwei' as unknown as number })]
        );

        expect(task.pointsObtained).toBe(0);
        expect(Number.isNaN(task.confidence)).toBe(false);
    });

    /**
     * Die Maximalpunktzahl tippt die Lehrkraft. Ein Vertipper darf nicht als
     * NaN in die Gesamtpunktzahl der Arbeit wandern — `AITask.maxPoints` ist
     * optional, "nicht angegeben" ist die ehrlichere Antwort.
     */
    it('Kopfdaten: untippbare Maximalpunktzahl wird undefined, nicht NaN', () => {
        const { task } = mapModelTask(
            { id: 't5', name: 'Aufgabe 5', maxPoints: 'zehn' } as unknown as Task,
            kiAufgabe({ pointsObtained: 1 })
        );

        expect(task.maxPoints).toBeUndefined();
    });
});
