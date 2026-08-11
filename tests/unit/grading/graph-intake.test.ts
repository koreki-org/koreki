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
         * Bekannte Luecke, hier absichtlich festgehalten statt stillschweigend
         * repariert: einzelne Variablen werden nicht geprueft. Ein Eintrag ohne
         * `id` kommt durch. Wer das aendert, aendert Verhalten — und sollte
         * diesen Test bewusst umschreiben.
         */
        it('prueft die einzelnen Variablen NICHT', () => {
            const result = parseGraphJson('{"variables":[{"kein":"id"}]}');

            expect(result.ok).toBe(true);
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
