import { extractStudentAST, CalcTraceExtractionError } from '@/lib/grading/calc-trace-extraction';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import type { AppSettings } from '@/types';

jest.mock('@/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => true),
}));

jest.mock('@/lib/ai/mistral-provider', () => ({ executeMistralRequest: jest.fn() }));
jest.mock('@/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn() }));
jest.mock('@/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn() }));
jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const mockMistral = executeMistralRequest as jest.Mock;
const settings = { provider: 'mistral', mistralKey: 'test-key' } as unknown as AppSettings;

/**
 * Kernunterscheidung dieser Suite: Ein leeres Ergebnis heisst "der Schueler hat nichts
 * gerechnet" (0 Punkte sind korrekt). Ein technischer Ausfall heisst "nicht pruefbar" und
 * muss als Fehler nach oben durchschlagen, damit die Aufgabe in die manuelle Nachkontrolle
 * laeuft statt als Schuelerversagen ausgewertet zu werden.
 */
describe('extractStudentAST — Ausfall vs. leeres Ergebnis (Layer 1)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('gueltige Ergebnisse', () => {
        it('gibt ein leeres Array zurueck, wenn der Schueler keinen Rechenweg notiert hat', async () => {
            mockMistral.mockResolvedValue({ steps: [] });

            await expect(extractStudentAST('Weiss ich nicht', 'PURE', settings)).resolves.toEqual([]);
        });

        it('liefert die extrahierten Schritte im Erfolgsfall', async () => {
            const steps = [{
                id: 'step_1',
                original_text: 'I = 12 V / 6500 ohm = 1.846 mA',
                formula: '12 V / 6500 ohm',
                result: 1.846,
                unit: 'mA',
            }];
            mockMistral.mockResolvedValue({ steps });

            await expect(extractStudentAST('I = 12 V / 6500 ohm = 1.846 mA', 'PURE', settings)).resolves.toEqual(steps);
        });

        it('akzeptiert eine als JSON-String gelieferte Antwort', async () => {
            mockMistral.mockResolvedValue(JSON.stringify({ steps: [{ id: 'step_1', formula: '2 + 2', result: 4 }] }));

            const result = await extractStudentAST('2 + 2 = 4', 'PURE', settings);

            expect(result).toHaveLength(1);
            expect(result[0].result).toBe(4);
        });
    });

    describe('technische Ausfaelle', () => {
        it('wirft, wenn der Provider die Anfrage ablehnt', async () => {
            mockMistral.mockRejectedValue(new Error('503 Service Unavailable'));

            await expect(extractStudentAST('I = 12 / 6500', 'PURE', settings))
                .rejects.toBeInstanceOf(CalcTraceExtractionError);
        });

        it('behaelt den urspruenglichen Fehler als Ursache bei', async () => {
            const cause = new Error('ECONNRESET');
            mockMistral.mockRejectedValue(cause);

            await expect(extractStudentAST('I = 12 / 6500', 'PURE', settings))
                .rejects.toMatchObject({ originalError: cause });
        });

        it('wirft, wenn die Antwort kein steps-Array enthaelt', async () => {
            mockMistral.mockResolvedValue({ ergebnis: 42 });

            await expect(extractStudentAST('I = 12 / 6500', 'PURE', settings))
                .rejects.toBeInstanceOf(CalcTraceExtractionError);
        });

        it('wirft, wenn die Antwort kein gueltiges JSON ist', async () => {
            mockMistral.mockResolvedValue('<html>504 Gateway Timeout</html>');

            await expect(extractStudentAST('I = 12 / 6500', 'PURE', settings))
                .rejects.toBeInstanceOf(CalcTraceExtractionError);
        });

        it('wirft, wenn der API-Key fehlt', async () => {
            const keyless = { provider: 'mistral' } as unknown as AppSettings;

            await expect(extractStudentAST('I = 12 / 6500', 'PURE', keyless))
                .rejects.toBeInstanceOf(CalcTraceExtractionError);
            expect(mockMistral).not.toHaveBeenCalled();
        });

        it('meldet den Ausfall, statt ihn als leeren Rechenweg auszugeben', async () => {
            mockMistral.mockRejectedValue(new Error('rate limited'));

            // Die entscheidende Regression: frueher kam hier [] zurueck, was von der Engine
            // wie "Schueler hat nichts gerechnet" behandelt wurde und 0 Punkte ergab.
            await expect(extractStudentAST('I = 12 / 6500', 'PURE', settings)).rejects.toThrow();
        });
    });
});
