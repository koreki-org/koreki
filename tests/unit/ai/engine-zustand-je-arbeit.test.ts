/**
 * Waechter: Das Sandbox-Urteil einer Arbeit klebt nicht an der naechsten.
 *
 * ANLASS (02.09.2026, Architektur-Review). `runLocalGradingEngines` aendert die
 * Aufgabenliste AN ORT UND STELLE — beide Engine-Zweige schreiben ihr Ergebnis erst am
 * Ende in `task.calcTraceResult` beziehungsweise `task.gradingResult`. Scheitert der Lauf
 * davor, faengt die Schleife den Fehler ab und protokolliert ihn; das Feld behaelt dabei
 * seinen alten Inhalt.
 *
 * Das wird gefaehrlich, weil `useCorrectionRun` fuer JEDE Arbeit eines Stapels DIESELBE
 * `tasksLayout`-Referenz durchreicht. Scheitert die Extraktion bei der fuenften
 * Schuelerin, bewertet `mapLayoutTask` sie mit dem Sandbox-Urteil des vierten Schuelers.
 * Nicht mit einer Warnung — mit fremden Punkten, die plausibel aussehen und die niemand
 * nachprueft, weil nichts auffaellig ist.
 *
 * Auf dem Server-Weg ist der Layout-Baum je Anfrage frisch, dort trat es nie auf. Genau
 * die Fehlerklasse, die CLAUDE.md als die wiederkehrende dieses Projekts fuehrt: eine
 * Regel, die auf einem Weg haelt und auf dem anderen fehlt.
 *
 * DIE REGEL. Jede Aufgabe beginnt jeden Lauf ohne Engine-Ergebnis. Was am Ende
 * drinsteht, stammt aus DIESEM Lauf oder es steht nichts drin — dann greift der
 * Warnhinweis "ohne Sandbox-Pruefung, bitte manuell gegenpruefen".
 *
 * NICHT GEDECKT. Ob die Engines richtig rechnen. Nur, dass sie nichts Altes stehen
 * lassen.
 */
import { runLocalGradingEngines } from '../../../src/lib/ai/local-grading-pass';
import type { Task, AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/ai/variable-extraction', () => ({
    extractStudentAnswersWithLLM: jest.fn(async () => {
        throw new Error('Extraktion fehlgeschlagen (absichtlich im Test)');
    })
}));

jest.mock('../../../src/lib/grading/calc-trace-extraction', () => ({
    extractStudentAST: jest.fn(async () => {
        throw new Error('Extraktion fehlgeschlagen (absichtlich im Test)');
    })
}));

const EINSTELLUNGEN = { provider: 'ollama' } as AppSettings;

/** Ein Urteil, wie es aus einem vorherigen Lauf stammen koennte. */
const FREMDES_URTEIL = {
    isGoalReached: true,
    sandboxErrors: [],
    perTargetResult: [],
    studentAST: []
};

async function laufe(tasksLayout: Task[]): Promise<void> {
    await runLocalGradingEngines({
        tasksLayout,
        studentText: 'a) 3x + 7 = 25, x = 9',
        appMode: 'PURE',
        settings: EINSTELLUNGEN,
        herkunft: 'Client'
    });
}

describe('Engine-Zustand gilt je Arbeit', () => {
    it('loescht ein altes CalcTrace-Urteil, wenn die Extraktion scheitert', async () => {
        const tasksLayout: Task[] = [{
            name: 'Aufgabe a)',
            maxPoints: 3,
            taskType: 'calc-trace',
            targetGoal: { targetValue: 6, maxPoints: 3, unit: '' },
            // Das Urteil der VORIGEN Schuelerin haengt noch dran.
            calcTraceResult: FREMDES_URTEIL
        } as unknown as Task];

        await laufe(tasksLayout);

        expect(tasksLayout[0].calcTraceResult).toBeUndefined();
    });

    it('loescht ein altes Graph-Urteil, wenn die Extraktion scheitert', async () => {
        const tasksLayout: Task[] = [{
            name: 'Aufgabe a)',
            maxPoints: 3,
            gradingGraph: { variables: [], criteria: [] },
            gradingResult: { totalPoints: 3, maxPoints: 3, steps: [] }
        } as unknown as Task];

        await laufe(tasksLayout);

        expect(tasksLayout[0].gradingResult).toBeUndefined();
    });

    /**
     * Der eigentliche Schadensfall: dieselbe Liste, zwei Arbeiten hintereinander.
     * Genau so reicht `useCorrectionRun` sie durch.
     */
    it('traegt kein Urteil von einer Arbeit in die naechste', async () => {
        const tasksLayout: Task[] = [{
            name: 'Aufgabe a)',
            maxPoints: 3,
            taskType: 'calc-trace',
            targetGoal: { targetValue: 6, maxPoints: 3, unit: '' }
        } as unknown as Task];

        // Erste Arbeit: die Engine hat gerechnet (hier von Hand gesetzt).
        tasksLayout[0].calcTraceResult = FREMDES_URTEIL as never;

        // Zweite Arbeit mit DERSELBEN Liste, Extraktion scheitert.
        await laufe(tasksLayout);

        expect(tasksLayout[0].calcTraceResult).toBeUndefined();
    });

    /** Eine Aufgabe ohne Engine bleibt unangetastet — kein blindes Leerraeumen. */
    it('laesst Aufgaben ohne Engine in Ruhe', async () => {
        const tasksLayout: Task[] = [
            { name: 'Aufgabe a)', maxPoints: 2 } as Task
        ];

        await laufe(tasksLayout);

        expect(tasksLayout[0].name).toBe('Aufgabe a)');
        expect(tasksLayout[0].maxPoints).toBe(2);
    });
});
