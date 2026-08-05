import { buildCorrectionPrompt } from '../../src/lib/ai/prompt-builder';
import type { Task } from '../../src/types';
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

    it('defines what satisfies a calculation-path step, not just what does not', () => {
        // Ohne die positive Aussage bleibt nur das Verbot "pruefe keine Formel" — das Modell
        // verweigerte den Punkt dann weiterhin. Definition, keine Kulanz: gehoert in den Kern
        // und muss auch ohne aktive Skills gelten.
        expect(hybridInstruction).toContain('nachvollziehbare numerische Rechenkette genügt dafür vollständig');
        expect(hybridInstruction).toContain('symbolische Variablen-Gleichung darf dafür nicht verlangt werden');
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

describe('Die Anweisung erreicht beide CalcTrace-Pfade', () => {
    const calcTraceResult = {
        ast: [{ id: 'step_1', formula: '2 * 3', result: 6 }],
        sandboxErrors: [],
        isGoalReached: true,
        maxPoints: 2,
        reachedTargets: [6],
        missedTargets: [],
        perTargetResult: [{ targetIndex: 0, reached: true, hasCorrectValues: true, hasCalculationError: false, associatedStepIds: ['step_1'] }]
    };

    const buildSystem = (targetGoal: Record<string, unknown>) => {
        const tasksLayout = [{ name: 'Aufgabe 1', maxPoints: 2, calcTraceResult, targetGoal }] as unknown as Task[];
        return buildCorrectionPrompt('Musterlösung', 'Schülerabgabe', tasksLayout).system;
    };

    it('injects it on the structured-criteria path', () => {
        // Regressionsfall: Kriterien mit "von dir zu beurteilen" liessen das Modell ohne jede
        // Definition zurueck — der Rechenweg-Punkt fiel bei korrekter Loesung weg.
        const system = buildSystem({
            targetValue: 6,
            gradingRubric: '1P für Rechenweg, 1P für Ergebnis',
            criteria: [
                { id: 'rechnen_weg', label: 'Rechenweg korrekt', punktwert: 1, source: 'llm' },
                { id: 'ergebnis_erreicht', label: 'Ergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 }
            ]
        });

        expect(system).toContain('von dir zu beurteilen');
        expect(system).toContain('nachvollziehbare numerische Rechenkette genügt dafür vollständig');
    });

    it('injects it on the legacy path', () => {
        const system = buildSystem({ targetValue: 6, gradingRubric: '1P für Rechenweg, 1P für Ergebnis' });

        expect(system).toContain('nachvollziehbare numerische Rechenkette genügt dafür vollständig');
    });
});

describe('MINT-Skills: nichts ist beim Aufräumen verlorengegangen', () => {
    it('keeps the follow-up-error guarantee in its skill', () => {
        expect(skillConsecutive).toContain('Folgefehler-Prinzip');
        expect(skillConsecutive).toContain('Vergib jedoch zwingend die Teilpunkte');
    });

    it('does not duplicate the calculation-path definition in the formula skill', () => {
        // Die Regel lebt im Kern (siehe oben). Taucht sie hier wieder auf, sind es erneut zwei
        // Wahrheiten fuer dasselbe Thema.
        expect(skillFormula).not.toContain('Rechenweg ist nicht gleich Formel');
        expect(skillFormula).toContain('Mathematische Äquivalenz');
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
