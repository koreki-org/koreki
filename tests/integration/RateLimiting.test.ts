import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../src/lib/security';
import prisma from '../../src/lib/prisma';
import { logSecurityEvent } from '../../src/lib/audit-service';

// 1. Mock Infrastructure
jest.mock('../../src/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: jest.fn((handler) => handler)
    }
}));

jest.mock('../../src/lib/prisma', () => ({
    user: {
        findUnique: jest.fn()
    },
    privacyLog: {
        create: jest.fn().mockResolvedValue({})
    }
}));

jest.mock('../../src/lib/audit-service', () => ({
    logSecurityEvent: jest.fn().mockResolvedValue({})
}));

describe('Rate Limit Integration (Layer 2 - Spam Protection)', () => {

    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        // Use a unique IP for each test to avoid interference with other tests in parallel execution
        const uniqueIp = `192.168.1.${Math.floor(Math.random() * 254)}`;
        req = {
            headers: { 'x-forwarded-for': uniqueIp },
            socket: {},
            user: { isAuthenticated: true, claims: { sub: 'spammer-1' } },
            body: {}
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u-spam',
            role: 'USER',
            memberships: []
        });
    });

    it('should block an IP after 10 requests on an AI endpoint (Pillar 1)', async () => {
        const handler = jest.fn(async (req, res) => {
            res.status(200).json({ success: true });
        });

        const protectedHandler = withSecurity(handler, { isAi: true });

        // First 10 requests should pass
        for (let i = 0; i < 10; i++) {
            await protectedHandler(req, res);
            expect(res.status).not.toHaveBeenCalledWith(429);
        }

        expect(handler).toHaveBeenCalledTimes(10);

        // 11th request should be blocked
        await protectedHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.stringContaining('Zu viele Anfragen')
        }));
        
        // Verifying that the security event was logged
        expect(logSecurityEvent).toHaveBeenCalledWith(
            'anonymous', // Standard for rate limit triggers (before user resolution)
            null,
            'RATE_LIMIT_EXCEEDED',
            expect.stringContaining(req.headers['x-forwarded-for']),
            req.headers['x-forwarded-for']
        );

        // Handler should still only have been called 10 times
        expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should allow more requests on a non-AI endpoint (Baseline)', async () => {
        const handler = jest.fn(async (req, res) => {
            res.status(200).json({ success: true });
        });

        // Use a fresh IP
        req.headers['x-forwarded-for'] = '10.0.0.1';
        const protectedHandler = withSecurity(handler, { isAi: false });

        // 15 requests should easily pass (Limit is 100)
        for (let i = 0; i < 15; i++) {
            await protectedHandler(req, res);
        }

        expect(handler).toHaveBeenCalledTimes(15);
        expect(res.status).not.toHaveBeenCalledWith(429);
    });

});
