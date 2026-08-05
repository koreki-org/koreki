import { buildCalcTraceGenerationPrompt, parseGeneratedCalcTrace } from '@/lib/grading/calc-trace-generator';

jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

/**
 * Punktzahl-Vorgabe bei der Musterloesungs-Generierung.
 *
 * Realer Fehlerfall (Aufgabe 4b, 2 Punkte, "jeweils 1 P Rechenweg, 1 P Ergebnis"):
 * Die Punktzahl der Aufgabe wurde nicht mitgeschickt. Das Modell riet 4 Punkte aus dem Wort
 * "jeweils" und blaehte anschliessend das Ergebnis-Kriterium von 1 auf 3 Punkte auf, weil die
 * Summe zwingend der geratenen Gesamtzahl entsprechen musste.
 */

const antwort = (criteria: { id: string; punktwert: number }[], maxPoints: number) => JSON.stringify({
    targetValue: '122.88',
    maxPoints,
    unit: 's',
    gradingRubric: 'Rechenweg, Ergebnis',
    criteria: criteria.map(c => ({
        ...c,
        label: c.id,
        source: 'llm',
        targetIndex: 0,
    })),
});

describe('Generierung: vorgegebene Punktzahl', () => {
    describe('buildCalcTraceGenerationPrompt', () => {
        it('nennt die Punktzahl verbindlich, wenn sie bekannt ist', () => {
            const { system } = buildCalcTraceGenerationPrompt('Aufgabentext', 'physik', undefined, 2);

            expect(system).toContain('exakt 2 Punkte');
            expect(system).toContain('jeweils');
        });

        it('laesst den Prompt unveraendert, wenn keine Punktzahl bekannt ist', () => {
            const { system } = buildCalcTraceGenerationPrompt('Aufgabentext', 'physik');

            expect(system).not.toContain('VERBINDLICHE GESAMTPUNKTZAHL');
        });

        it('haengt Nutzerhinweise weiterhin an', () => {
            const { system } = buildCalcTraceGenerationPrompt('Aufgabentext', 'physik', 'Bitte streng bewerten', 2);

            expect(system).toContain('Bitte streng bewerten');
            expect(system).toContain('exakt 2 Punkte');
        });
    });

    describe('parseGeneratedCalcTrace', () => {
        it('weist eine aufgeblaehte Kriterien-Summe zurueck', () => {
            // Genau der beobachtete Fall: 1 + 3 statt 1 + 1.
            const raw = antwort([{ id: 'rechenweg', punktwert: 1 }, { id: 'ergebnis', punktwert: 3 }], 4);

            expect(() => parseGeneratedCalcTrace(raw, 2)).toThrow(/2/);
        });

        it('nennt im Fehler die tatsaechliche und die erwartete Summe', () => {
            const raw = antwort([{ id: 'rechenweg', punktwert: 1 }, { id: 'ergebnis', punktwert: 3 }], 4);

            expect(() => parseGeneratedCalcTrace(raw, 2)).toThrow(/\(4\)[\s\S]*\(2\)/);
        });

        it('akzeptiert eine passende Verteilung', () => {
            const raw = antwort([{ id: 'rechenweg', punktwert: 1 }, { id: 'ergebnis', punktwert: 1 }], 2);

            const target = parseGeneratedCalcTrace(raw, 2);

            expect(target?.maxPoints).toBe(2);
        });

        it('setzt maxPoints auf die Vorgabe, auch wenn das Modell etwas anderes meldet', () => {
            const raw = antwort([{ id: 'rechenweg', punktwert: 1 }, { id: 'ergebnis', punktwert: 1 }], 99);

            expect(parseGeneratedCalcTrace(raw, 2)?.maxPoints).toBe(2);
        });

        it('verhaelt sich ohne Vorgabe wie bisher', () => {
            // Ohne bekannte Punktzahl bleibt die Summe der Kriterien massgeblich.
            const raw = antwort([{ id: 'rechenweg', punktwert: 1 }, { id: 'ergebnis', punktwert: 3 }], 99);

            expect(parseGeneratedCalcTrace(raw)?.maxPoints).toBe(4);
        });
    });
});
