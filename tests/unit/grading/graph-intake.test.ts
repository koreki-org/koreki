import {
    extractRefinementResponse,
    isUsableGraph,
    mergeRefinedGraph,
    parseGraphJson
} from '../../../src/lib/grading/graph-intake';
import type { GradingGraph } from '../../../src/lib/grading/types';

/**
 * Zwei Wege fuehren einen Graphen von aussen in den Editor: die JSON-Ansicht
 * und die KI-Verfeinerung. Beide lagen im Rumpf von GradingGraphModal.
 */
describe('graph-intake', () => {
    const graph = (over: Partial<GradingGraph> = {}): GradingGraph => ({
        taskId: 't1',
        discipline: 'math',
        variables: [],
        ...over
    });

    describe('parseGraphJson', () => {
        it('nimmt gueltiges JSON mit variables-Liste an', () => {
            const result = parseGraphJson('{"taskId":"t1","discipline":"math","variables":[]}');

            expect(result.ok).toBe(true);
            expect(result.ok && result.graph.taskId).toBe('t1');
        });

        it('lehnt kaputtes JSON mit Meldung ab', () => {
            const result = parseGraphJson('{ das ist kein json');

            expect(result.ok).toBe(false);
            expect(result.ok === false && result.error).toBeTruthy();
        });

        it('lehnt JSON ohne variables-Liste ab', () => {
            const result = parseGraphJson('{"taskId":"t1"}');

            expect(result.ok).toBe(false);
            expect(result.ok === false && result.error).toContain('variables');
        });

        it('lehnt ab, wenn variables keine Liste ist', () => {
            const result = parseGraphJson('{"variables":"keine liste"}');

            expect(result.ok).toBe(false);
        });

        /**
         * BEWUSST UMGESCHRIEBEN am 18.08.2026 — der vorige Test hielt hier eine
         * bekannte Luecke fest und forderte ausdruecklich, ihn zu aendern, wenn
         * jemand sie schliesst.
         *
         * Der Anlass: Dieselben Pruefungen gibt es laengst fuer den KI-Weg. Wer
         * den Graphen von Hand in die JSON-Ansicht schrieb, bekam KEINE davon —
         * eine doppelte Variablen-Kennung kostete dort 1 von 2 Punkten fuer eine
         * richtige Antwort, eine Aequivalenzgruppe ohne `prefixes` liess die
         * Bewertung abstuerzen. Zwei Eingaenge, eine Regel.
         */
        it('lehnt einen Graphen ohne brauchbare Variable ab', () => {
            const result = parseGraphJson('{"variables":[{"kein":"id"}]}');

            expect(result.ok).toBe(false);
            expect(result.ok === false && result.error).toMatch(/Keine brauchbare Variable/);
        });

        /**
         * Bleibt etwas uebrig, wird die Zahl der verworfenen genannt — sonst
         * sucht die Lehrkraft den Fehler spaeter in der Bewertung statt hier.
         */
        it('nennt die Zahl der verworfenen Variablen', () => {
            const gemischt = JSON.stringify({
                variables: [
                    { id: 'gut', type: 'input', validationType: 'exact', defaultValue: 1 },
                    { kein: 'id' },
                    { id: 'auch_kaputt', type: 'unbekannt' }
                ]
            });

            const result = parseGraphJson(gemischt);
            expect(result.ok).toBe(false);
            expect(result.ok === false && result.error).toMatch(/2 von 3/);
        });

        it('lehnt eine doppelte Variablen-Kennung ab', () => {
            const doppelt = JSON.stringify({
                variables: [
                    { id: 'wert', type: 'input', validationType: 'exact', defaultValue: 10 },
                    { id: 'wert', type: 'input', validationType: 'exact', defaultValue: 99 }
                ]
            });

            const result = parseGraphJson(doppelt);
            expect(result.ok).toBe(false);
            expect(result.ok === false && result.error).toMatch(/doppelte Kennung/);
        });

        /** Kaputte Aequivalenzgruppen kommen gar nicht erst in den Graphen. */
        it('entfernt eine Aequivalenzgruppe ohne Praefixe', () => {
            const kaputt = JSON.stringify({
                variables: [{ id: 'a_wert', type: 'input', validationType: 'exact', defaultValue: 1 }],
                equivalenceGroups: [{ id: 'g1' }]
            });

            const result = parseGraphJson(kaputt);
            expect(result.ok).toBe(true);
            expect(result.ok && result.graph.equivalenceGroups).toBeUndefined();
        });

        /**
         * Die Punktverteilung bleibt unangetastet: sie ist die Entscheidung der
         * Lehrkraft, und wer von Hand JSON schreibt, meint sie so.
         */
        it('laesst eine bewusst gesetzte Null-Punktzahl stehen', () => {
            const mitNull = JSON.stringify({
                variables: [
                    { id: 'a', type: 'input', validationType: 'exact', defaultValue: 1, maxPoints: 0 },
                    { id: 'b', type: 'formula', expression: 'a * 2', validationType: 'exact', maxPoints: 3 }
                ]
            });

            const result = parseGraphJson(mitNull);
            expect(result.ok).toBe(true);
            expect(result.ok && result.graph.variables[0].maxPoints).toBe(0);
            expect(result.ok && result.graph.variables[1].maxPoints).toBe(3);
        });

        /** Eine leere Liste ist ein gueltiger Zwischenstand beim Tippen. */
        it('nimmt eine leere Variablenliste an', () => {
            expect(parseGraphJson('{"variables":[]}').ok).toBe(true);
        });
    });

    describe('isUsableGraph', () => {
        it('erkennt einen Graphen an der variables-Liste', () => {
            expect(isUsableGraph({ variables: [] })).toBe(true);
        });

        it('weist Leeres und Unpassendes ab', () => {
            expect(isUsableGraph(null)).toBe(false);
            expect(isUsableGraph(undefined)).toBe(false);
            expect(isUsableGraph({})).toBe(false);
            expect(isUsableGraph({ variables: 'nein' })).toBe(false);
        });
    });

    describe('extractRefinementResponse', () => {
        it('nimmt die verpackte Form { graph, explanation }', () => {
            const result = extractRefinementResponse({
                graph: { variables: [] },
                explanation: 'Zwei Schritte ergaenzt.'
            });

            expect(result.graph).toEqual({ variables: [] });
            expect(result.explanation).toBe('Zwei Schritte ergaenzt.');
        });

        it('nimmt den Graphen auch unverpackt', () => {
            const result = extractRefinementResponse({ variables: [], taskId: 't1' });

            expect(result.graph).toEqual({ variables: [], taskId: 't1' });
            expect(result.explanation).toBe('');
        });

        it('ergaenzt eine fehlende Erklaerung zur leeren Zeichenkette', () => {
            expect(extractRefinementResponse({ graph: { variables: [] } }).explanation).toBe('');
        });
    });

    describe('mergeRefinedGraph', () => {
        /**
         * Der eigentliche Grund fuer dieses Modul. `disablePoints` ist die
         * Entscheidung der Lehrkraft darueber, ob die Engine streng punktet
         * oder das Modell entscheidet. Ginge sie bei einer Verfeinerung
         * verloren, aenderte sich die Bewertung ganzer Aufgaben, ohne dass
         * jemand etwas angeklickt haette.
         */
        it('schuetzt die Punktvergabe der Lehrkraft vor dem Modell', () => {
            const merged = mergeRefinedGraph(
                graph({ disablePoints: false }),
                { variables: [], disablePoints: true }
            );

            expect(merged.disablePoints).toBe(false);
        });

        it('schuetzt auch ein gesetztes true', () => {
            const merged = mergeRefinedGraph(
                graph({ disablePoints: true }),
                { variables: [], disablePoints: false }
            );

            expect(merged.disablePoints).toBe(true);
        });

        it('uebernimmt den Wert des Modells nur, wenn keiner gesetzt ist', () => {
            const merged = mergeRefinedGraph(graph(), { variables: [], disablePoints: true });

            expect(merged.disablePoints).toBe(true);
        });

        /**
         * Bewusst andersherum als disablePoints: die Einordnung darf das Modell
         * mit Blick auf den neuen Graphen aktualisieren.
         */
        it('laesst die Einordnung des Modells gewinnen', () => {
            const merged = mergeRefinedGraph(
                graph({ discipline: 'math' }),
                { variables: [], discipline: 'network' }
            );

            expect(merged.discipline).toBe('network');
        });

        it('faellt auf die bisherige Einordnung zurueck, wenn das Modell keine liefert', () => {
            const merged = mergeRefinedGraph(graph({ discipline: 'math' }), { variables: [] });

            expect(merged.discipline).toBe('math');
        });

        it('uebernimmt die Variablen des verfeinerten Graphen', () => {
            const merged = mergeRefinedGraph(
                graph({ variables: [{ id: 'alt' } as any] }),
                { variables: [{ id: 'neu' }] }
            );

            expect(merged.variables).toEqual([{ id: 'neu' }]);
        });
    });
});
