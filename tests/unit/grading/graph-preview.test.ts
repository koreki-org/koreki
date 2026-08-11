import {
    EVALUATION_ERROR_VALUE,
    buildPerfectInputs,
    computeExpectedValues,
    parsePlaygroundInputs
} from '../../../src/lib/grading/graph-preview';
import type { VariableDefinition } from '../../../src/lib/grading/types';

/**
 * Beide Regeln standen im Rumpf von GradingGraphModal und waren nur ueber das
 * Rendern des gesamten Modals erreichbar. Beide rechnen, beide haben
 * Randfaelle, und beide veraendern im Fehlerfall Punkte.
 */
describe('graph-preview', () => {
    const input = (id: string, defaultValue: any): VariableDefinition =>
        ({ id, type: 'input', defaultValue, validationType: 'exact' } as VariableDefinition);

    const formula = (id: string, expression: string): VariableDefinition =>
        ({ id, type: 'formula', expression, validationType: 'exact' } as VariableDefinition);

    describe('computeExpectedValues', () => {
        it('uebernimmt Vorgabewerte von Eingabe-Variablen', () => {
            const { context } = computeExpectedValues([input('laenge', 4), input('breite', 3)]);

            expect(context).toEqual({ laenge: 4, breite: 3 });
        });

        it('rechnet Formeln gegen die zuvor bekannten Werte', () => {
            const { context, errors } = computeExpectedValues([
                input('laenge', 4),
                input('breite', 3),
                formula('flaeche', 'laenge * breite')
            ]);

            expect(context.flaeche).toBe(12);
            expect(errors).toEqual({});
        });

        it('rechnet mehrstufig weiter', () => {
            const { context } = computeExpectedValues([
                input('a', 2),
                formula('b', 'a * 3'),
                formula('c', 'b + 1')
            ]);

            expect(context.c).toBe(7);
        });

        /**
         * Die entscheidende Eigenschaft: der Kontext waechst waehrend des
         * Durchlaufs. Eine Formel sieht nur, was VOR ihr steht. Umsortieren im
         * Editor kann eine funktionierende Bewertung damit unbrauchbar machen,
         * ohne dass irgendwo eine Warnung erscheint.
         */
        it('kann Variablen nicht sehen, die erst spaeter definiert werden', () => {
            const { context, errors } = computeExpectedValues([
                formula('flaeche', 'laenge * breite'),
                input('laenge', 4),
                input('breite', 3)
            ]);

            expect(context.flaeche).not.toBe(12);
            expect(Object.keys(errors)).toContain('flaeche');
        });

        it('faengt eine kaputte Formel ab, statt die Vorschau abzubrechen', () => {
            const { context, errors } = computeExpectedValues([
                input('a', 1),
                formula('kaputt', 'a * * 2'),
                formula('danach', 'a + 1')
            ]);

            expect(context.kaputt).toBe(EVALUATION_ERROR_VALUE);
            expect(errors.kaputt).toBeTruthy();
            // Der Durchlauf geht weiter — sonst waere nach dem ersten Tippfehler
            // die gesamte Vorschau leer.
            expect(context.danach).toBe(2);
        });

        it('ignoriert Formeln ohne Ausdruck', () => {
            const { context, errors } = computeExpectedValues([
                { id: 'leer', type: 'formula', validationType: 'exact' } as VariableDefinition
            ]);

            expect(context).toEqual({});
            expect(errors).toEqual({});
        });

        it('kommt ohne Variablen zurecht', () => {
            expect(computeExpectedValues()).toEqual({ context: {}, errors: {} });
            expect(computeExpectedValues([])).toEqual({ context: {}, errors: {} });
        });
    });

    describe('parsePlaygroundInputs', () => {
        const vars = [input('a', 0), input('b', 0), input('text', '')];

        it('wandelt Zahlen-Eingaben in Zahlen', () => {
            expect(parsePlaygroundInputs(vars, { a: '42', b: '3.5' })).toEqual({ a: 42, b: 3.5 });
        });

        it('behaelt nicht-numerische Eingaben als getrimmten Text', () => {
            expect(parsePlaygroundInputs(vars, { text: '  192.168.1.0/24  ' }))
                .toEqual({ text: '192.168.1.0/24' });
        });

        /**
         * Die Reihenfolge der Pruefungen ist wesentlich: `Number('')` ist 0.
         * Wuerde zuerst auf Zahl geprueft, wuerde jedes leere Feld zu einer
         * beantworteten 0 — und bekaeme womoeglich Punkte fuer etwas, das die
         * Schuelerin nie geschrieben hat.
         */
        it('laesst leere Felder aus, statt sie als 0 zu werten', () => {
            expect(parsePlaygroundInputs(vars, { a: '', b: '   ' })).toEqual({});
        });

        it('laesst nicht ausgefuellte Felder aus', () => {
            expect(parsePlaygroundInputs(vars, { a: '5' })).toEqual({ a: 5 });
        });

        it('beruecksichtigt nur bekannte Variablen', () => {
            expect(parsePlaygroundInputs(vars, { a: '1', unbekannt: '9' })).toEqual({ a: 1 });
        });

        it('behandelt eine echte Null als Antwort', () => {
            expect(parsePlaygroundInputs(vars, { a: '0' })).toEqual({ a: 0 });
        });

        it('kommt ohne Eingaben zurecht', () => {
            expect(parsePlaygroundInputs(vars)).toEqual({});
            expect(parsePlaygroundInputs()).toEqual({});
        });
    });

    describe('buildPerfectInputs', () => {
        it('uebernimmt die erwarteten Werte als Text', () => {
            const vars = [input('a', 1), formula('b', 'a * 2')];

            expect(buildPerfectInputs(vars, { a: 1, b: 2 })).toEqual({ a: '1', b: '2' });
        });

        it('setzt fehlende Werte auf die leere Zeichenkette', () => {
            expect(buildPerfectInputs([input('a', 1)], {})).toEqual({ a: '' });
        });
    });
});
