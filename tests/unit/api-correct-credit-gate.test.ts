import { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../src/lib/security';
import aiCorrectHandler from '../../src/pages/api/ai-correct';
import { runLocalGradingEngines } from '../../src/lib/ai/local-grading-pass';
import { checkCreditsAvailable, checkAiBudget } from '../../src/lib/billing';

/**
 * Guthaben- und Budget-Sperre vor dem teuren Lauf (Layer 2)
 * 💳🚧
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. Beide Sperren standen HINTER
 * `runLocalGradingEngines` — und dieser Lauf ruft selbst den Anbieter, einmal
 * je Rechenketten- oder Graph-Aufgabe, plus Nachbesserungsversuche.
 *
 * Eine Lehrkraft ohne Guthaben löste damit die gesamte Extraktion aus und
 * bekam ERST DANACH die 402. Die Kostenbremse der Instanz (Säule 7) war für
 * dieselben Aufrufe ebenso wirkungslos, obwohl sie als absoluter Monatsdeckel
 * gedacht ist. Der Kommentar an der Guthaben-Prüfung behauptete ausdrücklich
 * das Gegenteil ("VOR dem Anbieter-Aufruf").
 *
 * Das Geschwister-Modul `clean-and-analyze.ts` hatte die Reihenfolge von
 * Anfang an richtig — wieder dieselbe Klasse: die Regel galt an einer Stelle
 * und an der Nachbarstelle nicht.
 */

jest.mock('../../src/lib/billing', () => ({
    resolveActiveWorkspace: jest.fn(async () => ({ activeWorkspaceId: 'ws-1' })),
    performBillingAction: jest.fn(async () => true),
    checkCreditsAvailable: jest.fn(async () => null),
    checkAiBudget: jest.fn(async () => null)
}));

jest.mock('../../src/lib/ai/local-grading-pass', () => ({
    runLocalGradingEngines: jest.fn(async () => undefined)
}));

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn(() => ({ id: 'u-1', activeWorkspaceId: 'ws-1' })) },
        systemSettings: { findUnique: jest.fn(() => ({})) }
    }
}));

jest.mock('../../src/lib/ai/mistral-provider', () => ({ executeMistralRequest: jest.fn(async () => ({ tasks: [] })) }));
jest.mock('../../src/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn(async () => ({ tasks: [] })) }));
jest.mock('../../src/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn(async () => ({ tasks: [] })) }));

jest.mock('../../src/lib/env-context', () => ({
    ...jest.requireActual('../../src/lib/env-context'),
    isLocalInstance: jest.fn(() => false)
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: unknown) => handler,
    requireUserId: jest.fn(() => 'logto-1'),
    AuthenticatedRequest: {}
}));

const mockEngines = runLocalGradingEngines as jest.Mock;
const mockCredits = checkCreditsAvailable as jest.Mock;
const mockBudget = checkAiBudget as jest.Mock;

const anfrage = () => ({
    method: 'POST',
    url: '/api/ai-correct',
    body: {
        modelSolution: 'Muster',
        studentText: 'Antwort',
        settings: { provider: 'mistral', mistralKey: 'K' },
        tasksLayout: [{ id: 't1', name: 'A1', maxPoints: 3, taskType: 'calc-trace' }]
    }
}) as unknown as AuthenticatedRequest;

const antwort = () => {
    const res = { statusCode: 0, body: undefined as unknown };
    return {
        status(code: number) { res.statusCode = code; return this; },
        json(payload: unknown) { res.body = payload; return this; },
        _gelesen: res
    } as unknown as NextApiResponse & { _gelesen: { statusCode: number; body: unknown } };
};

describe('ai-correct sperrt VOR dem teuren Lauf', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCredits.mockResolvedValue(null);
        mockBudget.mockResolvedValue(null);
    });

    /** DER BEFUND. */
    it('startet die Engines nicht, wenn das Guthaben nicht reicht', async () => {
        mockCredits.mockResolvedValue('Nicht genügend Guthaben.');
        const res = antwort();

        await aiCorrectHandler(anfrage(), res);

        expect(res._gelesen.statusCode).toBe(402);
        expect(mockEngines).not.toHaveBeenCalled();
    });

    /** Säule 7: der absolute Monatsdeckel der Instanz. */
    it('startet die Engines nicht, wenn der Monatsdeckel erreicht ist', async () => {
        mockBudget.mockResolvedValue('Monatsbudget erschöpft.');
        const res = antwort();

        await aiCorrectHandler(anfrage(), res);

        expect(res._gelesen.statusCode).toBe(429);
        expect(mockEngines).not.toHaveBeenCalled();
    });

    /** Gegenprobe: Bei gedecktem Guthaben laufen die Engines wie bisher. */
    it('startet die Engines bei gedecktem Guthaben', async () => {
        const res = antwort();

        await aiCorrectHandler(anfrage(), res);

        expect(res._gelesen.statusCode).toBe(200);
        expect(mockEngines).toHaveBeenCalledTimes(1);
    });
});
