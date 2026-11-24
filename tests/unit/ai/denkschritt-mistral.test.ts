/**
 * Waechter: Die Denk-Leiter kommt auch bei Mistral an. 💭
 *
 * ANLASS (23.11.2026). `denkschritt-leiter.test.ts` prueft Ollama und den
 * OpenAI-kompatiblen Weg — Mistral fragte die Leiter nie. Der Schalter "Denken"
 * hob dort nur die Laengengrenze an; gesendet wurde kein Feld, das das Denken
 * einschaltet. Die Rechenweg-Extraktion, die IMMER denken muss, lief bei Mistral
 * ohne Denkschritt und mit 1000 Tokens. Die Regel galt in zwei Familien und fehlte
 * in der dritten — die wiederkehrende Fehlerklasse dieses Projekts.
 */
import { denktBeiAktion } from '@/lib/ai/denkschritt';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import * as constants from '@/lib/ai/constants';
import type { AIAction } from '@/lib/ai/prompt-dispatch';

jest.mock('@/lib/ai/constants', () => ({
    ...jest.requireActual('@/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));
jest.mock('@/lib/env-context', () => ({
    ...jest.requireActual('@/lib/env-context'),
    isDesktopTarget: jest.fn(() => false)
}));

const mockFetch = constants.fetchWithRetry as jest.Mock;

const AKTIONEN: AIAction[] = [
    'anonymize', 'calc-trace-extraction', 'clean-and-analyze', 'clean-and-map',
    'variable-extraction', 'generate-graph', 'refine-graph', 'generate-calc-trace',
    'correction', 'second-opinion', 'student-simulator'
];

async function gesendet(action: AIAction, model: string, enableThinking: boolean, maxTokens?: number) {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{}' } }] })
    });
    await executeMistralRequest(
        action,
        { modelSolution: '', studentText: '', buffer: 'x', taskText: '', userInstruction: '', currentGraph: { taskId: 'A1', discipline: 'mathe', variables: [] } },
        'schluessel',
        { model, enableThinking, maxTokens }
    ).catch(() => undefined);
    return JSON.parse(mockFetch.mock.calls.at(-1)![1].body);
}

beforeEach(() => jest.clearAllMocks());

describe('Mistral folgt der Leiter', () => {
    it.each(AKTIONEN)('%s: Medium bekommt high/none nach der Leiter', async (action) => {
        for (const schalter of [true, false]) {
            const body = await gesendet(action, constants.MISTRAL_MEDIUM_MODEL, schalter);
            expect(body.reasoning_effort).toBe(denktBeiAktion(action, schalter) ? 'high' : 'none');
        }
    });

    it('Bilderkennung denkt nie (Large 2512 bekommt gar kein Feld)', async () => {
        const body = await gesendet('vision', constants.MISTRAL_MEDIUM_MODEL, true);
        expect(body.model).toBe(constants.MISTRAL_CHATS_MODEL);
        expect(body.reasoning_effort).toBeUndefined();
    });
});

describe('Modelle ohne Schalter', () => {
    /** Large 2512 lehnt das Feld mit HTTP 400 ab (gemessen 23.11.2026). */
    it('schickt Large 2512 kein reasoning_effort, auch wenn gedacht werden soll', async () => {
        const body = await gesendet('second-opinion', 'mistral-large-2512', true);
        expect(body.reasoning_effort).toBeUndefined();
    });

    /** Large 4 kennt kein `none` — Fehler 400 statt Antwort. */
    it('schaltet Large 4 auf low statt none', async () => {
        const body = await gesendet('generate-calc-trace', 'mistral-large-4-0', true);
        expect(body.reasoning_effort).toBe('low');
    });
});

describe('Platz fuer den Denktext', () => {
    /** Die Extraktion gibt 1000 mit — genau daran scheiterte Large 4 mit leerer Antwort. */
    it('hebt eine kleine Grenze an, wenn gedacht wird', async () => {
        const body = await gesendet('calc-trace-extraction', constants.MISTRAL_MEDIUM_MODEL, false, 1000);
        expect(body.reasoning_effort).toBe('high');
        expect(body.max_tokens).toBeGreaterThanOrEqual(16384);
    });

    it('laesst die Grenze ohne Denkschritt, wie sie ist', async () => {
        const body = await gesendet('generate-calc-trace', constants.MISTRAL_MEDIUM_MODEL, true, 4000);
        expect(body.max_tokens).toBe(4000);
    });
});
