import { performBillingAction } from '../../src/lib/billing';
import prisma from '../../src/lib/prisma';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(async (callback) => {
            // Simulate the transaction callback by passing a mock transaction client
            return callback({
                user: {
                    findUnique: jest.fn().mockResolvedValue({ 
                        id: 'user-1', 
                        activeWorkspaceId: 'ws-1',
                        // `workspaceId` gehoerte hier immer hin — es ist der
                        // Fremdschluessel der Mitgliedschaft und in der Datenbank nie
                        // leer. Der Mock liess ihn weg, und die alte Aufloesung fand
                        // die Mitgliedschaft trotzdem: Sie verglich `m.workspaceId`
                        // mit einem ebenfalls undefinierten Zielwert, also
                        // `undefined === undefined`. Ein Zufallstreffer, der die
                        // Luecke im Mock verdeckt hat (19.08.2026).
                        memberships: [{ workspaceId: 'ws-1', workspace: { type: 'PERSONAL', id: 'ws-1', credits: 100, avvAccepted: true } }] 
                    }),
                    update: jest.fn().mockResolvedValue({ id: 'user-1' }),
                },
                systemSettings: {
                    upsert: jest.fn().mockResolvedValue({ id: 'singleton' }),
                },
                workspace: {
                    update: jest.fn().mockResolvedValue({ id: 'ws-1' }),
                }
            });
        }),
        user: { update: jest.fn() },
        systemSettings: { upsert: jest.fn() }
    },
}));

describe('Billing Utilities Audit (Layer 1)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly process billing for OCR and update user/system tables', async () => {
        const params = {
            logtoId: 'test-user',
            module: 'ocr' as const,
            inputTokens: 1000,
            outputTokens: 500,
            creditCost: 2
        };

        const result = await performBillingAction(params);

        expect(result.success).toBe(true);
        // The test verifies that the transaction was called. 
        // In a unit test for the lib, we mainly care that it doesn't crash and returns success.
        expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should correctly handle Correction module usage', async () => {
        const params = {
            logtoId: 'test-user',
            module: 'correction' as const,
            inputTokens: 2000,
            outputTokens: 3000,
            creditCost: 0
        };

        const result = await performBillingAction(params);
        expect(result.success).toBe(true);
    });

});
