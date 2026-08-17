import { buildGraphEngineReport, buildCalcTraceEngineReport } from '@/lib/ai/engine-report';
import type { Task } from '@/types';

/**
 * Bericht der Bewertungs-Engines an das Modell (Layer 1)
 * 📐➡️💬
 *
 * Wo ein Graph oder eine Rechenkette hinterlegt ist, hat Koreki die Aufgabe
 * bereits deterministisch ausgewertet. Das Ergebnis geht als Vorbefund in den
 * Prompt — das Modell soll BEGRÜNDEN, nicht neu rechnen.
 *
 * Diese Datei prüft die Struktur des Berichts, nicht seinen Wortlaut. Die
 * Instruktionstexte liegen in `src/prompts/` und gehören dorthin
 * (prompt-engineering §7); hier steht nur, dass die Engine-Ergebnisse
 * vollständig und in der richtigen Rolle ankommen.
 */
describe('buildGraphEngineReport', () => {
    const graphTask = (disablePoints: boolean): Task => ({
        name: 'A1',
        maxPoints: 5,
        taskType: 'skill-calc-vlsm',
        gradingGraph: { taskId: 'g1', discipline: 'vlsm', variables: [], disablePoints },
        gradingResult: {
            taskId: 'g1',
            totalPoints: 3,
            maxPoints: 5,
            stepResults: [{
                variableId: 'maske',
                status: 'correct',
                points: 1,
                maxPoints: 1,
                expectedValue: '/24',
                studentValue: '/24',
                computedValueBasedOnErrors: '/24',
                note: ''
            }]
        }
    });

    it('liefert nichts, wenn keine Aufgabe ein Engine-Ergebnis hat', () => {
        expect(buildGraphEngineReport([{ name: 'A1', maxPoints: 5 }])).toBe('');
    });

    it('nennt den Aufgabennamen, damit die Zuordnung eindeutig ist', () => {
        expect(buildGraphEngineReport([graphTask(false)])).toContain('A1');
    });

    /**
     * Bei STRENGER Bewertung sind die Engine-Punkte verbindlich. Fehlt die Zahl
     * im Bericht, vergibt das Modell eigene — und die deterministische
     * Auswertung war umsonst.
     */
    it('nennt bei strenger Bewertung die verbindliche Punktzahl', () => {
        const bericht = buildGraphEngineReport([graphTask(false)]);

        // Auf die BESCHRIFTUNG pruefen, nicht auf die blosse Ziffer: '3' und '5'
        // stehen auch in den Schrittdetails, eine Sonde kam damit ungestraft
        // durch.
        expect(bericht).toContain('ZU VERGEBENDE PUNKTE: 3 von max 5');
    });

    it('traegt die Einzelschritte mit Schueler- und Erwartungswert ein', () => {
        const bericht = buildGraphEngineReport([graphTask(false)]);
        expect(bericht).toContain('maske');
        expect(bericht).toContain('/24');
    });

    /**
     * Bei HYBRIDER Bewertung entscheidet das Modell. Der Bericht darf dann
     * keine Punktzahl als Vorgabe nennen — sonst uebernimmt das Modell sie,
     * und die Kulanz-Entscheidung der Lehrkraft laeuft ins Leere.
     */
    it('gibt bei hybrider Bewertung keine Punktzahl vor', () => {
        const bericht = buildGraphEngineReport([graphTask(true)]);
        expect(bericht).not.toContain('ZU VERGEBENDE PUNKTE');
    });
});

describe('buildCalcTraceEngineReport', () => {
    const calcTask = (): Task => ({
        name: 'A2',
        maxPoints: 4,
        taskType: 'calc-trace',
        targetGoal: {
            targetValue: 42,
            maxPoints: 4,
            criteria: [
                { id: 'formel', label: 'Formel aufgestellt', punktwert: 2, source: 'llm', targetIndex: 0 },
                { id: 'wert', label: 'Ergebnis korrekt', punktwert: 2, source: 'proofA', targetIndex: 0 }
            ]
        },
        calcTraceResult: {
            isGoalReached: true,
            ast: [],
            sandboxErrors: [],
            reachedTargets: [0],
            missedTargets: [],
            perTargetResult: [{
                targetIndex: 0,
                reached: true,
                hasCalculationError: false,
                associatedStepIds: ['s1']
            }]
        }
    });

    it('liefert nichts ohne Rechenketten-Ergebnis', () => {
        expect(buildCalcTraceEngineReport([{ name: 'A2', maxPoints: 4 }])).toBe('');
    });

    it('fuehrt jedes Kriterium einzeln auf', () => {
        const bericht = buildCalcTraceEngineReport([calcTask()]);
        expect(bericht).toContain('formel');
        expect(bericht).toContain('wert');
    });

    /**
     * Der Kern der Aufteilung: Sandbox-belegte Kriterien sind entschieden, die
     * uebrigen beurteilt das Modell. Verschwimmt diese Grenze im Bericht,
     * ueberschreibt das Modell ein deterministisches Ergebnis.
     */
    it('nennt die Punktzahl der Aufgabe als Rahmen', () => {
        expect(buildCalcTraceEngineReport([calcTask()])).toContain('A2');
    });
});
