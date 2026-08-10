import { NextApiRequest, NextApiResponse } from 'next';
import settingsHandler from '../../src/pages/api/admin/settings';
import prisma from '../../src/lib/prisma';

// Mock Prisma and Security
jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn()
        },
        systemSettings: {
            findUnique: jest.fn(),
            upsert: jest.fn()
        }
    }
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'admin-logto-id' } };
        return handler(req, res);
    },
    // Zusicherung des Wrappers: hinter withSecurity ist die Identitaet gesetzt.
    requireUserId: (req: any) => req.user?.claims?.sub
}));

describe('Admin Settings API - Partial Update Verification (Layer 2)', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Default: User is Admin
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u-admin',
            role: 'ADMIN'
        });
    });

    it('should update ONLY provided fields and NOT overwrite others with zero', async () => {
        const partialUpdate = {
            ocrInputCostPerMillion: 0.25
            // Note: other fields like ocrOutputCostPerMillion are NOT in the body
        };

        req = {
            method: 'POST',
            body: partialUpdate
        };

        await settingsHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        
        const lastCall = (prisma.systemSettings.upsert as jest.Mock).mock.calls[0][0];
        // Note: API uses 'Cost', DB/Prisma uses 'Price'
        expect(lastCall.update.ocrInputPricePerMillion).toBe(0.25);
        expect(lastCall.update.ocrOutputPricePerMillion).toBeUndefined();
        expect(lastCall.update.ocrBudget).toBeUndefined();
    });

    it('should correctly handle budget updates', async () => {
        req = {
            method: 'POST',
            body: { ocrBudget: 500 }
        };

        await settingsHandler(req, res);

        const lastCall = (prisma.systemSettings.upsert as jest.Mock).mock.calls[0][0];
        expect(lastCall.update.ocrBudget).toBe(500);
        expect(lastCall.update.ocrInputPricePerMillion).toBeUndefined();
    });



    it('should reject non-admin users', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u-user',
            role: 'USER'
        });

        req = { method: 'POST', body: {} };
        await settingsHandler(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
