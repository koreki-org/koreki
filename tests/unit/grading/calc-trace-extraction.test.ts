import { extractStudentAST, CalcTraceExtractionError } from '../../../src/lib/grading/calc-trace-extraction';
import { executeMistralRequest } from '../../../src/lib/ai/mistral-provider';
import { isDesktopTarget } from '../../../src/lib/env-context';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/ai/mistral-provider', () => ({ executeMistralRequest: jest.fn() }));
jest.mock('../../../src/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn() }));
jest.mock('../../../src/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn() }));
jest.mock('../../../src/lib/env-context', () => ({ isDesktopTarget: jest.fn(() => false) }));

/**
 * Rechenweg aus dem Schülertext lesen (Layer 1)
 * 🔎⚖️
 *
 * DIE UNTERSCHEIDUNG, UM DIE ES HIER GEHT — sie steht im Kopf des Moduls:
 *
 *   leeres Ergebnis → „die Schülerin hat nichts gerechnet" → 0 Punkte
 *   Fehler          → „nicht prüfbar" → manuelle Nachkontrolle
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026: Die Unterscheidung galt für den WEG zur
 * Extraktion, nicht für das, was ankam. Ein unbrauchbarer Schritt wurde
 * ungeprüft an die Engine gereicht, und die meldete daraufhin einen
 * RECHENFEHLER DES SCHÜLERS:
 *
 *   result: "2,300"  → „Formel ergibt 2300, aber Schüler notierte …"
 *   result fehlt     → dieselbe Meldung
 *   formula fehlt    → „Syntax-Fehler … Cannot read properties of undefined"
 *
 * In allen drei Fällen hatte die Schülerin richtig gerechnet.
 */

const mistral = executeMistralRequest as jest.Mock;
const settings = { provider: 'mistral', mistralKey: 'k' } as AppSettings;

const antwortet = (steps: unknown) => mistral.mockResolvedValue({ steps });
const lies = () => extractStudentAST('23 V * 100 A = 2300 W', 'PURE', settings);

const schritt = (p: Record<string, unknown> = {}) => ({
    id: 'step_1',
    original_text: '23 V * 100 A = 2300 W',
    formula: '23 * 100',
    result: 2300,
    ...p
});

beforeEach(() => {
    jest.clearAllMocks();
    (isDesktopTarget as jest.Mock).mockReturnValue(false);
});

describe('Brauchbare Antworten', () => {
    it('nimmt einen vollstaendigen Schritt an', async () => {
        antwortet([schritt()]);

        const ast = await lies();
        expect(ast).toHaveLength(1);
        expect(ast[0].result).toBe(2300);
        expect(ast[0].formula).toBe('23 * 100');
    });

    /** Eine leere Liste heisst: nichts gerechnet. Das ist KEIN Fehler. */
    it('nimmt eine leere Schrittliste an', async () => {
        antwortet([]);

        await expect(lies()).resolves.toEqual([]);
    });

    /** Eindeutige Zahlen in Textform sind in Ordnung — sie sind nicht mehrdeutig. */
    it.each([
        ['2300', 2300],
        ['2300.5', 2300.5],
        ['-17', -17],
        [' 42 ', 42]
    ])('nimmt die eindeutige Zahl "%s" an', async (roh, erwartet) => {
        antwortet([schritt({ result: roh })]);

        expect((await lies())[0].result).toBe(erwartet);
    });

    it('ergaenzt eine fehlende Schritt-Kennung', async () => {
        antwortet([schritt({ id: undefined })]);

        expect((await lies())[0].id).toBe('step_1');
    });

    it('reicht die uebrigen Felder unveraendert weiter', async () => {
        antwortet([schritt({ unit: 'W', formulaUnit: 'W' })]);

        const ast = await lies();
        expect(ast[0].unit).toBe('W');
        expect(ast[0].formulaUnit).toBe('W');
    });
});

describe('Unbrauchbare Antworten sind NICHT Schuld der Schuelerin', () => {
    /**
     * DER GEFAEHRLICHSTE FALL. „2,300" ist im Deutschen zweideutig — 2,3 oder
     * 2300? Wer hier raet, raet gegen die Schuelerin. Vorher wurde daraus ein
     * gemeldeter Rechenfehler.
     */
    it.each(['2,300', '1.234.567', '2300 W', 'zweitausend', ''])(
        'meldet "%s" als nicht pruefbar, nicht als Rechenfehler',
        async (mehrdeutig) => {
            antwortet([schritt({ result: mehrdeutig })]);

            await expect(lies()).rejects.toBeInstanceOf(CalcTraceExtractionError);
        }
    );

    it('meldet ein fehlendes Ergebnis als nicht pruefbar', async () => {
        antwortet([schritt({ result: undefined })]);

        await expect(lies()).rejects.toThrow(/kein eindeutiges Ergebnis/);
    });

    it('meldet eine fehlende Formel als nicht pruefbar', async () => {
        antwortet([schritt({ formula: undefined })]);

        await expect(lies()).rejects.toThrow(/keine Formel/);
    });

    it('meldet eine leere Formel als nicht pruefbar', async () => {
        antwortet([schritt({ formula: '   ' })]);

        await expect(lies()).rejects.toThrow(/keine Formel/);
    });

    it('nennt die Stelle des unbrauchbaren Schritts', async () => {
        antwortet([schritt(), schritt({ id: 'step_2', result: 'unklar' })]);

        await expect(lies()).rejects.toThrow(/Schritt 2/);
    });

    it.each([[null], ['kein Objekt'], [42]])('meldet %s als nicht pruefbar', async (unsinn) => {
        antwortet([unsinn]);

        await expect(lies()).rejects.toBeInstanceOf(CalcTraceExtractionError);
    });
});

describe('Kaputte Antwortform', () => {
    /** Kein `steps`-Array heisst kaputt — nicht "nichts gerechnet". */
    it('meldet eine Antwort ohne Schrittliste', async () => {
        mistral.mockResolvedValue({ irgendwas: true });

        await expect(lies()).rejects.toThrow(/steps/);
    });

    it('liest eine als Text gelieferte Antwort ein', async () => {
        mistral.mockResolvedValue(JSON.stringify({ steps: [schritt()] }));

        expect(await lies()).toHaveLength(1);
    });

    it('meldet unlesbaren Text als nicht pruefbar', async () => {
        mistral.mockResolvedValue('kein JSON');

        await expect(lies()).rejects.toThrow(/JSON/);
    });

    /**
     * Ein Anbieter-Fehler ist ebenfalls „nicht prüfbar" und darf nie als leeres
     * Ergebnis durchgehen — sonst bekaeme die Schuelerin null Punkte fuer einen
     * Serverausfall.
     */
    it('reicht einen Anbieter-Fehler als Extraktionsfehler weiter', async () => {
        mistral.mockRejectedValue(new Error('503 Service Unavailable'));

        await expect(lies()).rejects.toBeInstanceOf(CalcTraceExtractionError);
    });

    it('meldet einen fehlenden Schluessel im PURE-Modus', async () => {
        await expect(extractStudentAST('x', 'PURE', { provider: 'mistral' } as AppSettings))
            .rejects.toBeInstanceOf(CalcTraceExtractionError);
    });
});
