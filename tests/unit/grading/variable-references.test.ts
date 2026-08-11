import {
    collectReferencedVariables,
    escapeRegExp,
    referencesVariable,
    renameVariableReferences,
    variableReferencePattern
} from '../../../src/lib/grading/variable-references';

/**
 * Variablen-IDs sind frei eingebbar — beim Umbenennen wird nur auf
 * Eindeutigkeit geprueft, nicht auf erlaubte Zeichen. An drei von vier Stellen
 * wurde die ID trotzdem roh in ein Regex-Muster interpoliert. Diese Tests
 * halten fest, was dabei schiefging.
 */
describe('variable-references', () => {
    describe('Wortgrenzen', () => {
        it('trifft die Variable als eigenstaendiges Wort', () => {
            expect(referencesVariable('laenge * breite', 'laenge')).toBe(true);
        });

        it('trifft NICHT als Teil eines laengeren Bezeichners', () => {
            // Sonst wuerde das Umbenennen von `laenge` auch `laenge_alt` zerlegen.
            expect(referencesVariable('laenge_alt * 2', 'laenge')).toBe(false);
        });

        it('unterscheidet step_1 von step_10', () => {
            expect(referencesVariable('Fehler in step_10', 'step_1')).toBe(false);
            expect(referencesVariable('Fehler in step_1', 'step_1')).toBe(true);
        });

        it('meldet nichts bei fehlender Formel oder leerer ID', () => {
            expect(referencesVariable(undefined, 'x')).toBe(false);
            expect(referencesVariable(null, 'x')).toBe(false);
            expect(referencesVariable('x * 2', '')).toBe(false);
        });
    });

    describe('Sonderzeichen in der ID', () => {
        it('stuerzt nicht mehr an einer Klammer ab', () => {
            // Roh interpoliert war `\bx(1)\b` ein SyntaxError — das Modal starb.
            expect(() => referencesVariable('x(1) + 2', 'x(1)')).not.toThrow();
        });

        it('sucht buchstaeblich statt als Muster', () => {
            // `a+b` roh interpoliert heisst "ein oder mehr a, dann b" und traefe
            // damit `aab` — eine voellig andere Variable.
            expect(referencesVariable('aab * 2', 'a+b')).toBe(false);
            expect(referencesVariable('a+b * 2', 'a+b')).toBe(true);
        });

        it('behandelt den Punkt nicht als Platzhalter', () => {
            expect(referencesVariable('axc * 2', 'a.c')).toBe(false);
            expect(referencesVariable('a.c * 2', 'a.c')).toBe(true);
        });

        it('escapeRegExp maskiert die bekannten Sonderzeichen', () => {
            expect(escapeRegExp('a.b*c+d')).toBe('a\\.b\\*c\\+d');
            expect(() => new RegExp(escapeRegExp('x(1)['))).not.toThrow();
        });

        it('variableReferencePattern liefert ein gueltiges Muster', () => {
            expect(variableReferencePattern('x(1)').test('x(1)')).toBe(true);
        });
    });

    describe('renameVariableReferences', () => {
        it('schreibt alle Vorkommen um', () => {
            expect(renameVariableReferences('laenge * laenge + 1', 'laenge', 'seite'))
                .toBe('seite * seite + 1');
        });

        it('laesst laengere Bezeichner unangetastet', () => {
            expect(renameVariableReferences('laenge + laenge_alt', 'laenge', 'seite'))
                .toBe('seite + laenge_alt');
        });

        it('benennt auch IDs mit Sonderzeichen korrekt um', () => {
            expect(renameVariableReferences('x(1) + x(1)', 'x(1)', 'y'))
                .toBe('y + y');
        });

        it('ersetzt bei Sonderzeichen nichts Fremdes', () => {
            // Roh interpoliert haette `a+b` hier `aab` und `ab` getroffen.
            expect(renameVariableReferences('aab + ab', 'a+b', 'z')).toBe('aab + ab');
        });

        it('gibt fehlende Formeln als leere Zeichenkette zurueck', () => {
            expect(renameVariableReferences(undefined, 'a', 'b')).toBe('');
            expect(renameVariableReferences(null, 'a', 'b')).toBe('');
        });
    });

    describe('collectReferencedVariables', () => {
        it('liefert nur die tatsaechlich verwendeten Variablen', () => {
            expect(collectReferencedVariables('laenge * breite', ['laenge', 'breite', 'hoehe']))
                .toEqual(['laenge', 'breite']);
        });

        it('behaelt die Reihenfolge der Kandidaten bei', () => {
            expect(collectReferencedVariables('b + a', ['a', 'b'])).toEqual(['a', 'b']);
        });

        it('kommt mit Sonderzeichen in den Kandidaten zurecht', () => {
            expect(() => collectReferencedVariables('x * 2', ['x(1)', 'x'])).not.toThrow();
            expect(collectReferencedVariables('x * 2', ['x(1)', 'x'])).toEqual(['x']);
        });

        it('liefert nichts ohne Formel', () => {
            expect(collectReferencedVariables(undefined, ['a'])).toEqual([]);
        });
    });
});
