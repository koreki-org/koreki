import { NextApiRequest, NextApiResponse } from 'next';
import aiCorrectHandler from '../../src/pages/api/ai-correct';
import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../src/lib/ai/openai-provider';
import { executeOllamaRequest } from '../../src/lib/ai/ollama-logic';
import { isLocalInstance } from '../../src/lib/env-context';

jest.mock('../../src/lib/billing', () => ({
    resolveActiveWorkspace: jest.fn(async () => ({ activeWorkspaceId: 'ws-1' })),
    performBillingAction: jest.fn(async () => true),
    // Guthaben-Vorpruefung vor dem Anbieter-Aufruf: null = ausreichend gedeckt.
    checkCreditsAvailable: jest.fn(async () => null)
}));

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(async (cb) => {
            if (typeof cb === 'function') {
                return cb({
                    user: { findUnique: jest.fn(() => ({ id: 'u-1', activeWorkspaceId: 'ws-1' })) },
                    systemSettings: { findUnique: jest.fn(() => ({})) }
                });
            }
            return [{ id: 'u-1', activeWorkspaceId: 'ws-1' }, {}];
        }),
        user: {
            findUnique: jest.fn(() => ({ id: 'u-1', activeWorkspaceId: 'ws-1' }))
        },
        systemSettings: {
            findUnique: jest.fn(() => ({}))
        }
    }
}));

jest.mock('../../src/lib/ai/mistral-provider', () => ({
    executeMistralRequest: jest.fn()
}));

jest.mock('../../src/lib/ai/openai-provider', () => ({
    executeOpenAIRequest: jest.fn()
}));

jest.mock('../../src/lib/ai/ollama-logic', () => ({
    executeOllamaRequest: jest.fn()
}));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => false)
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'user-id-123' } };
        return handler(req, res);
    }
}));

describe('ai-correct API Provider Routing Guards (Layer 1 & 2)', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.OPENAI_API_KEY = 'mock-openai-key';
        process.env.MISTRAL_API_KEY = 'mock-mistral-key';

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        (executeOpenAIRequest as jest.Mock).mockResolvedValue({
            score: 10,
            tasks: [{ name: 'Aufgabe 1', maxPoints: 10, pointsObtained: 10 }]
        });

        (executeMistralRequest as jest.Mock).mockResolvedValue({
            score: 10,
            tasks: [{ name: 'Aufgabe 1', maxPoints: 10, pointsObtained: 10 }]
        });

        (executeOllamaRequest as jest.Mock).mockResolvedValue({
            score: 10,
            tasks: [{ name: 'Aufgabe 1', maxPoints: 10, pointsObtained: 10 }]
        });

        (isLocalInstance as jest.Mock).mockReturnValue(false); // Default SaaS mode
    });

    it('MUST route to executeOpenAIRequest (Qwen) when "High Accuracy" (isComplex) is true in SaaS mode, even if provider is set to mistral', async () => {
        req = {
            method: 'POST',
            body: {
                modelSolution: 'Musterlösung',
                studentText: 'Schülertext',
                tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                isComplex: true,
                settings: {
                    provider: 'mistral',
                    mistralKey: 'm-key-123'
                }
            }
        };

        await aiCorrectHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(executeOpenAIRequest).toHaveBeenCalledTimes(1);
        expect(executeMistralRequest).not.toHaveBeenCalled();
    });

    it('MUST route to executeMistralRequest when "High Accuracy" is FALSE and provider is mistral in SaaS mode', async () => {
        req = {
            method: 'POST',
            body: {
                modelSolution: 'Musterlösung',
                studentText: 'Schülertext',
                tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                isComplex: false,
                settings: {
                    provider: 'mistral',
                    mistralKey: 'm-key-123'
                }
            }
        };

        await aiCorrectHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(executeMistralRequest).toHaveBeenCalledTimes(1);
        expect(executeMistralRequest).toHaveBeenCalledWith(
            'correction',
            expect.anything(),
            'm-key-123',
            expect.objectContaining({ model: 'mistral-medium-latest' })
        );
        expect(executeOpenAIRequest).not.toHaveBeenCalled();
    });

    it('MUST route to executeOpenAIRequest when provider is explicitly openai-compatible', async () => {
        req = {
            method: 'POST',
            body: {
                modelSolution: 'Musterlösung',
                studentText: 'Schülertext',
                tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                isComplex: false,
                settings: {
                    provider: 'openai-compatible',
                    openaiKey: 'o-key-123'
                }
            }
        };

        await aiCorrectHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(executeOpenAIRequest).toHaveBeenCalledTimes(1);
        expect(executeMistralRequest).not.toHaveBeenCalled();
    });

    it('MUST route to executeOllamaRequest when provider is explicitly ollama', async () => {
        req = {
            method: 'POST',
            body: {
                modelSolution: 'Musterlösung',
                studentText: 'Schülertext',
                tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                isComplex: false,
                settings: {
                    provider: 'ollama'
                }
            }
        };

        await aiCorrectHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(executeOllamaRequest).toHaveBeenCalledTimes(1);
        expect(executeMistralRequest).not.toHaveBeenCalled();
        expect(executeOpenAIRequest).not.toHaveBeenCalled();
    });

    describe('Desktop / Community Local Mode Routing (isLocalInstance = true)', () => {
        beforeEach(() => {
            (isLocalInstance as jest.Mock).mockReturnValue(true); // Desktop/Community mode
        });

        it('MUST stay on Mistral (executeMistralRequest) when isComplex is true in Desktop/Community mode', async () => {
            req = {
                method: 'POST',
                body: {
                    modelSolution: 'Musterlösung',
                    studentText: 'Schülertext',
                    tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                    isComplex: true,
                    settings: {
                        provider: 'mistral',
                        mistralKey: 'm-key-123'
                    }
                }
            };

            await aiCorrectHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(executeMistralRequest).toHaveBeenCalledTimes(1);
            expect(executeOpenAIRequest).not.toHaveBeenCalled();
        });

        it('MUST route to Ollama when provider is ollama in Desktop/Community mode', async () => {
            req = {
                method: 'POST',
                body: {
                    modelSolution: 'Musterlösung',
                    studentText: 'Schülertext',
                    tasksLayout: [{ name: 'Aufgabe 1', maxPoints: 10 }],
                    isComplex: true,
                    settings: {
                        provider: 'ollama'
                    }
                }
            };

            await aiCorrectHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(executeOllamaRequest).toHaveBeenCalledTimes(1);
            expect(executeOpenAIRequest).not.toHaveBeenCalled();
        });
    });
});
