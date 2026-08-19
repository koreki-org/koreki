import {
    collectReferencedVariables,
    escapeRegExp,
    referencesVariable,
    renameVariableReferences,
    variableReferencePattern, freieVariablenKennung } from '../../../src/lib/grading/variable-references';

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

/**
 * Neue Variablen bekommen eine freie Kennung
 * 🔑🛡️
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. Der Graph-Editor vergab beim Anlegen
 * `${prefix}new_${Date.now().toString().slice(-4)}` — die letzten vier Stellen
 * der Millisekunde — und prüfte NICHT, ob die Kennung schon vergeben ist. Zwei
 * Variablen, die auf die Millisekunde genau zehn Sekunden auseinander angelegt
 * werden, bekommen dieselbe. Bei zwanzig Variablen liegt das im Bereich
 * weniger Prozent.
 *
 * Was eine doppelte Kennung anrichtet, steht in `graph-intake.ts`: Eine
 * richtige Antwort bekommt 1 von 2 Punkten, weil zwei Variablen auf denselben
 * Schülerwert zeigen.
 *
 * Das UMBENENNEN prüfte längst und warnt mit einer Meldung — nur das Anlegen
 * tat es nicht. Wieder eine Regel, die an einer Stelle galt und an der
 * Nachbarstelle fehlte.
 */
describe('freieVariablenKennung', () => {
    const vars = (...ids: string[]) => ids.map(id => ({ id }));

    it('nimmt die schlichte Kennung, solange sie frei ist', () => {
        expect(freieVariablenKennung(vars('laenge', 'breite'), 'var_')).toBe('var_new');
    });

    /** DER BEFUND: vorher konnte hier dieselbe Kennung ein zweites Mal fallen. */
    it('weicht aus, statt eine vergebene Kennung zu wiederholen', () => {
        expect(freieVariablenKennung(vars('var_new'), 'var_')).toBe('var_new_2');
    });

    it('zaehlt weiter, solange belegt ist', () => {
        expect(freieVariablenKennung(vars('var_new', 'var_new_2', 'var_new_3'), 'var_')).toBe('var_new_4');
    });

    /** Der Editor leitet den Prefix aus dem Gruppennamen ab (Subnetze). */
    it('beachtet den uebergebenen Prefix', () => {
        expect(freieVariablenKennung(vars('subneta_new'), 'subneta_')).toBe('subneta_new_2');
        expect(freieVariablenKennung(vars('subneta_new'), 'subnetb_')).toBe('subnetb_new');
    });

    it('stoert sich nicht an Variablen ohne Kennung', () => {
        expect(freieVariablenKennung([{ id: undefined }, { id: 'var_new' }], 'var_')).toBe('var_new_2');
    });

    /** Wiederholtes Anlegen bleibt eindeutig — das ist der eigentliche Zweck. */
    it('liefert bei mehrfachem Anlegen lauter verschiedene Kennungen', () => {
        const bestand: { id?: string }[] = [];
        for (let i = 0; i < 25; i++) {
            bestand.push({ id: freieVariablenKennung(bestand, 'var_') });
        }

        expect(new Set(bestand.map(v => v.id)).size).toBe(25);
    });
});
