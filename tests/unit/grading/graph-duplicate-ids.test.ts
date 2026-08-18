import { parseGeneratedGraph, validateGraphDeterminism } from '../../../src/lib/grading/graph-generator';
import { GraphRunner } from '../../../src/lib/grading/GraphRunner';

/**
 * Doppelte Variablen-Kennungen (Layer 1)
 * 🔑⚖️
 *
 * GEFUNDEN BEIM LESEN von GraphRunner.ts und graph-generator.ts, 18.08.2026.
 *
 * Es gibt nur EINE Antwort je Kennung — `studentResults[id]`. Zwei Variablen
 * mit demselben Namen lesen also beide dieselbe Antwort und werden trotzdem
 * beide gezählt. Weder der Parser noch der Runner prüften auf Eindeutigkeit.
 *
 * Zwei Fälle, beide nachgestellt:
 *
 * | Vorgabewerte | vorher | Trockenlauf |
 * |:---|:---|:---|
 * | verschieden | 1 von 2 Punkten für eine RICHTIGE Antwort | fängt es ab |
 * | gleich | 2 von 2 — derselbe Schritt zählt doppelt | sieht nichts |
 *
 * Der zweite ist der heimtückischere: rechnerisch geht alles auf, die Aufgabe
 * ist danach nur anders gewichtet, als die Lehrkraft es wollte.
 */

const antwort = (variables: unknown[]) => JSON.stringify({
    taskId: 'aufgabe-1',
    discipline: 'math',
    variables,
    equivalenceGroups: null
});

const eingabe = (id: string, defaultValue: number) =>
    ({ id, type: 'input', validationType: 'exact', defaultValue, maxPoints: 1 });

describe('Doppelte Kennungen im erzeugten Graphen', () => {
    /** DER FALL, DER PUNKTE KOSTETE. */
    it('vergibt bei verschiedenen Vorgabewerten volle Punkte statt der Haelfte', () => {
        const graph = parseGeneratedGraph(antwort([eingabe('wert', 10), eingabe('wert', 99)]))!;
        const ergebnis = GraphRunner.grade(graph, { wert: 10 });

        expect(graph.variables).toHaveLength(1);
        expect(ergebnis.totalPoints).toBe(1);
        expect(ergebnis.maxPoints).toBe(1);
    });

    /**
     * DER HEIMTUECKISCHERE FALL. Rechnerisch ging alles auf — der Schritt war
     * nur doppelt so viel wert, wie die Lehrkraft ihn gemacht hat.
     */
    it('zaehlt bei gleichen Vorgabewerten den Schritt nur einmal', () => {
        const graph = parseGeneratedGraph(antwort([eingabe('wert', 10), eingabe('wert', 10)]))!;
        const ergebnis = GraphRunner.grade(graph, { wert: 10 });

        expect(graph.variables).toHaveLength(1);
        expect(ergebnis.maxPoints).toBe(1);
        expect(ergebnis.totalPoints).toBe(1);
    });

    /** Das ERSTE Vorkommen bleibt — deterministisch und nachvollziehbar. */
    it('behaelt das erste Vorkommen', () => {
        const graph = parseGeneratedGraph(antwort([eingabe('wert', 10), eingabe('wert', 99)]))!;

        expect(graph.variables[0].defaultValue).toBe(10);
    });

    it('laesst verschiedene Kennungen unangetastet', () => {
        const graph = parseGeneratedGraph(antwort([eingabe('a', 1), eingabe('b', 2), eingabe('c', 3)]))!;

        expect(graph.variables.map(v => v.id)).toEqual(['a', 'b', 'c']);
        expect(GraphRunner.grade(graph, { a: 1, b: 2, c: 3 }).maxPoints).toBe(3);
    });

    /** Auch ueber die beiden Typen hinweg: eine Kennung, eine Antwort. */
    it('verwirft eine Formel, die eine vergebene Kennung wiederholt', () => {
        const graph = parseGeneratedGraph(antwort([
            eingabe('a', 2),
            { id: 'a', type: 'formula', expression: 'a * 2', validationType: 'exact', maxPoints: 1 }
        ]))!;

        expect(graph.variables).toHaveLength(1);
        expect(graph.variables[0].type).toBe('input');
    });

    /**
     * Der Trockenlauf bleibt die zweite Verteidigungslinie — er muss weiterhin
     * durchgehen, wenn der Graph in Ordnung ist.
     */
    it('besteht danach den Trockenlauf', () => {
        const graph = parseGeneratedGraph(antwort([eingabe('wert', 10), eingabe('wert', 99)]))!;

        expect(validateGraphDeterminism(graph).isValid).toBe(true);
    });
});
