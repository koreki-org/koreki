import hybridInstruction from '../../src/prompts/core/default/correction/math-engine/hybrid-instruction.md';
import skillFormula from '../../src/prompts/skills/math-formula-concept.md';
import skillUnits from '../../src/prompts/skills/math-substitution-units.md';
import skillScratchpad from '../../src/prompts/skills/math-points-addition.md';
import skillConsecutive from '../../src/prompts/skills/math-consecutive-errors.md';

/**
 * Schichtentrennung für die Bewertung von Rechenaufgaben.
 *
 * Die Hybrid-Anweisung (läuft bei jeder CalcTrace-Aufgabe) beschreibt nur, was die Engine
 * feststellt und dass der Erwartungshorizont die Punkte verteilt. Jede pädagogische Auslegung
 * — Folgefehler, Formelstrenge, Einheitentoleranz — ist Overlay und steckt in den MINT-Skills.
 *
 * Anlass: Beide Ebenen regelten dieselben vier Themen doppelt und widersprachen sich an zwei
 * Stellen. Zusätzlich presste die Hybrid-Anweisung jeden Erwartungshorizont in das Schema
 * Formel/Einsetzen/Ergebnis, wodurch ein "1P für Rechenweg" als Formel-Kriterium geprüft und
 * bei einer korrekten Umrechnungsaufgabe verweigert wurde.
 */
describe('Hybrid-Anweisung: nur Engine-Semantik und Erwartungshorizont', () => {
    it('explains what the engine asserts', () => {
        expect(hybridInstruction).toContain('Proof A ✓');
        expect(hybridInstruction).toContain('Proof A ✗');
        expect(hybridInstruction).toContain('Proof B');
        expect(hybridInstruction).toContain('Tatsachenfeststellung');
    });

    it('makes the rubric the only source of the point split', () => {
        expect(hybridInstruction).toContain('ausschließlich der Erwartungshorizont der Musterlösung');
        expect(hybridInstruction).toContain('Übertrage seine Bezeichnungen niemals auf eine andere Kategorie');
    });

    it('caps the awarded points at the task maximum', () => {
        expect(hybridInstruction).toContain('niemals überschreiten');
    });

    it('delegates every pedagogical judgement to the active skills', () => {
        expect(hybridInstruction).toContain('ausschließlich die aktivierten Bewertungs-Skills');
        expect(hybridInstruction).toContain('Ist kein solcher Skill aktiv, wende den Erwartungshorizont wörtlich an');
    });

    it('no longer carries pedagogy of its own', () => {
        // Diese Regeln leben jetzt in den Skills. Tauchen sie hier wieder auf, ist die
        // Schichtentrennung erneut verwaschen.
        expect(hybridInstruction).not.toContain('FOLGEFEHLER');
        expect(hybridInstruction).not.toContain('ZWINGEND vergeben');
        expect(hybridInstruction).not.toContain('abstrakte Formel mit korrekten Variablen');
        expect(hybridInstruction).not.toContain('Vorsatzzeichen-Kulanz');
    });
});

describe('MINT-Skills: nichts ist beim Aufräumen verlorengegangen', () => {
    it('keeps the follow-up-error guarantee in its skill', () => {
        expect(skillConsecutive).toContain('Folgefehler-Prinzip');
        expect(skillConsecutive).toContain('Vergib jedoch zwingend die Teilpunkte');
    });

    it('moves the calculation-path rule into the formula skill', () => {
        expect(skillFormula).toContain('Rechenweg ist nicht gleich Formel');
        expect(skillFormula).toContain('nachvollziehbare numerische Rechenkette');
        expect(skillFormula).toContain('nicht erforderlich und darf nicht verlangt werden');
    });

    it('moves the unit-deduction limit into the substitution skill', () => {
        expect(skillUnits).toContain('Umfang des Einheiten-Abzugs');
        expect(skillUnits).toContain('höchstens die Punkte ab, die der Erwartungshorizont für das Ergebnis vorsieht');
        expect(skillUnits).toContain('Ausgangseinheit muss beibehalten werden');
    });

    it('resolves the binding-versus-adjustable contradiction', () => {
        // Vorher: "absolut bindend" im Skill gegen "didaktische Anpassungen" im Header.
        expect(skillScratchpad).toContain('Sandbox-Feststellungen sind bindend, ihre Bewertung nicht');
        expect(skillScratchpad).not.toContain('absolut bindend und dürfen nicht abgeändert werden');
    });
});
