import type { Task } from '../../src/types';
import type { GradingGraph } from '../../src/lib/grading/types';
import type { TargetGoal } from '../../src/lib/grading/calc-trace-types';
import {
    hatRechengraph, rechengraphAktiv, layoutFuerKorrektur, rechengraphStand, setzeAlleRechengraphen,
} from '../../src/lib/rechengraph-schalter';

// Nur die Anwesenheit zaehlt — der Inhalt der Graphen ist hier egal.
const graph = { nodes: [] } as unknown as GradingGraph;
const ziel = { targetValue: 1 } as unknown as TargetGoal;

const mitGraph: Task = { name: '1', taskType: 'skill-calc-vlsm', gradingGraph: graph };
const mitKette: Task = { name: '2', taskType: 'calc-trace', targetGoal: ziel };
const ohne: Task = { name: '3', taskType: 'default' };

describe('Rechengraph-Schalter', () => {
    it('erkennt Graph und Rechenkette, ohne Angabe ist er an', () => {
        expect(hatRechengraph(mitGraph)).toBe(true);
        expect(hatRechengraph(mitKette)).toBe(true);
        expect(hatRechengraph(ohne)).toBe(false);
        expect(rechengraphAktiv(mitGraph)).toBe(true);
        expect(rechengraphAktiv({ ...mitGraph, rechengraphAus: true })).toBe(false);
        expect(rechengraphAktiv(ohne)).toBe(false);
    });

    it('layoutFuerKorrektur: abgeschaltete Aufgabe sieht aus wie nach dem Loeschen', () => {
        const layout = [{ ...mitGraph, rechengraphAus: true }, { ...mitKette, rechengraphAus: true }, ohne];
        const fuerKorrektur = layoutFuerKorrektur(layout);

        expect(fuerKorrektur[0]).toMatchObject({ name: '1', taskType: 'default', gradingGraph: undefined });
        expect(fuerKorrektur[1]).toMatchObject({ name: '2', taskType: 'default', targetGoal: undefined, calcTrace: undefined });
        expect(fuerKorrektur[2]).toBe(ohne);
        // Der gespeicherte Graph bleibt erhalten.
        expect(layout[0].gradingGraph).toBe(graph);
        expect(layout[1].targetGoal).toBe(ziel);
    });

    it('layoutFuerKorrektur: eingeschaltete Aufgaben gehen unveraendert mit', () => {
        const layout = [mitGraph, { ...mitKette, rechengraphAus: false }];
        const fuerKorrektur = layoutFuerKorrektur(layout);
        expect(fuerKorrektur[0]).toBe(layout[0]);
        expect(fuerKorrektur[1]).toBe(layout[1]);
    });

    it('rechengraphStand zaehlt nur Aufgaben mit Graph', () => {
        expect(rechengraphStand([mitGraph, { ...mitKette, rechengraphAus: true }, ohne])).toEqual({ mit: 2, aktiv: 1 });
        expect(rechengraphStand([ohne])).toEqual({ mit: 0, aktiv: 0 });
    });

    it('setzeAlleRechengraphen schaltet alle mit Graph, die anderen bleiben unberuehrt', () => {
        const aus = setzeAlleRechengraphen([mitGraph, mitKette, ohne], false);
        expect(aus.map(t => t.rechengraphAus)).toEqual([true, true, undefined]);
        expect(aus[2]).toBe(ohne);

        const an = setzeAlleRechengraphen(aus, true);
        expect(an.map(t => t.rechengraphAus)).toEqual([false, false, undefined]);
    });
});
