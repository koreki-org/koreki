import generateHandler from '../../src/pages/api/user/grading-memories/generate';
import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';
import { isLocalInstance } from '../../src/lib/env-context';

// Mock security with claims
jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'test-user-id' } };
        return handler(req, res);
    }
}));

// Mock providers and environment
jest.mock('../../src/lib/ai/mistral-provider', () => ({
    executeMistralRequest: jest.fn()
}));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => true),
    // Der Anbieter-Gate fragt zusaetzlich, ob es sich um Community Multi-User
    // handelt — ohne diesen Mock schlaegt der Aufruf mit 500 fehl.
    isKeycloakAuth: jest.fn(() => false)
}));

const mockExecuteMistral = executeMistralRequest as jest.Mock;

describe('GradingMemories Generate API Endpoint - Integration Tests (Layer 2)', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    it('should reject non-POST methods with 405', async () => {
        req = { method: 'GET' };
        await generateHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should reject missing or invalid parameters with 400', async () => {
        req = {
            method: 'POST',
            body: {
                // missing modelSolution and settings
            }
        };
        await generateHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('should successfully execute and forward selectedTasks when valid body is supplied', async () => {
        const mockStudentAnswers = {
            studentAnswers: [
                { character: 'TYPO', taskName: 'Aufgabe 1', text: 'Simulated answer' }
            ]
        };
        mockExecuteMistral.mockResolvedValueOnce(mockStudentAnswers);

        req = {
            method: 'POST',
            body: {
                modelSolution: 'Musterlösung für Aufgabe 1',
                selectedTasks: ['Aufgabe 1'],
                settings: {
                    provider: 'mistral',
                    mistralKey: 'test-key'
                }
            }
        };

        await generateHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockStudentAnswers);
        expect(mockExecuteMistral).toHaveBeenCalledWith(
            'student-simulator',
            expect.objectContaining({
                modelSolution: 'Musterlösung für Aufgabe 1',
                selectedTasks: ['Aufgabe 1']
            }),
            'test-key',
            expect.any(Object)
        );
    });
});
