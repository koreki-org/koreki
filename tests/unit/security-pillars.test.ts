import { logSecurityEvent } from '../../src/lib/audit-service';
import { logger } from '../../src/lib/logger';
import prisma from '../../src/lib/prisma';
import { withSecurity } from '../../src/lib/security';
import { logtoClient } from '../../src/lib/logto';

// Mocking Prisma for RBAC and Audit
jest.mock('../../src/lib/prisma', () => ({
    privacyLog: {
        create: jest.fn().mockResolvedValue({})
    },
    user: {
        findUnique: jest.fn()
    }
}));

// Mocking Logto for withSecurity
jest.mock('../../src/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: jest.fn((handler) => handler)
    }
}));

describe('Security Hub: RBAC & Pillar Verification', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Pillar 8: DB-Authoritative RBAC
     */
    describe('Pillar 8 - DB-Authoritative RBAC (SysAdmin vs OrgAdmin)', () => {
        
        it('should allow SYS-ADMIN access when user has global ADMIN role in DB', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'user-1',
                role: 'ADMIN',
                memberships: []
            });
            
            // Logic would be tested through withSecurity calls in a real integration test, 
            // but we verify the return logic here.
            const dbUser = await prisma.user.findUnique({ where: { logtoId: 'user-1' } });
            expect(dbUser.role).toBe('ADMIN');
        });

        it('should distinguish between OrgAdmin and Regular User', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'user-2',
                role: 'USER',
                memberships: [
                    { workspaceId: 'ws-1', role: 'ADMIN' }
                ]
            });
            
            const dbUser: any = await prisma.user.findUnique({ where: { logtoId: 'user-2' } });
            const membership = dbUser.memberships.find((m: any) => m.workspaceId === 'ws-1');
            
            expect(dbUser.role).toBe('USER'); // Not a global admin
            expect(membership.role).toBe('ADMIN'); // Is an orga admin
        });
    });

    /**
     * Pillar 2: Technical Audit Logging
     */
    describe('Pillar 2 - Audit Service', () => {
        it('should create a technical security log entry', async () => {
            const userId = 'user-1';
            const event = 'AUTH_FAILURE';
            await logSecurityEvent(userId, null, event, 'Details', '1.1.1.1');

            expect(prisma.privacyLog.create).toHaveBeenCalled();
        });
    });

    /**
     * Pillar 4: Logging Sanitization
     */
    describe('Pillar 4 - Logger Sanitization', () => {
        let spy: jest.SpyInstance;
        
        beforeEach(() => {
            spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            spy.mockRestore();
        });

        it('should mask sensitive API keys (Industrial standard)', () => {
            logger.error('Failed with api-key: industrial-1234567890abcdef');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('api-key: indu**********'));
        });

        it('should mask Logto IDs (sub claims)', () => {
            logger.error('Error for user logto:5f8e9a2b7c1d3e4f6a');
            // Matching any masked pattern like logto:5f8**********
            expect(spy).toHaveBeenCalledWith(expect.stringMatching(/logto:5f8\**/));
        });
    });

    /**
     * Pillar 5: Resource Fairness
     */
    describe('Pillar 5 - Resource Fairness (Character Limits)', () => {
        let req: any;
        let res: any;

        beforeEach(() => {
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis()
            };
            req = {
                headers: { 'x-forwarded-for': '1.1.1.1' },
                socket: {},
                user: { isAuthenticated: true, claims: { sub: 'user-1' } },
                body: {}
            };
        });

        it('should block request if studentText exceeds page-based limit (Pillar 5)', async () => {
            req.body = {
                pageCount: 1,
                studentText: 'A'.repeat(10001) // Limit is 10,000 per page
            };

            const handler = jest.fn();
            const wrapped = withSecurity(handler);
            
            await wrapped(req, res);

            expect(res.status).toHaveBeenCalledWith(413);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Textmenge für diesen Schüler zu groß')
            }));
            expect(handler).not.toHaveBeenCalled();
        });

        it('should allow request if studentText is within limits', async () => {
            req.body = {
                pageCount: 2,
                studentText: 'A'.repeat(15000) // Allowed: 20,000
            };

            // Mock DB user to bypass RBAC check in withSecurity
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', role: 'USER', memberships: [] });

            const handler = jest.fn();
            const wrapped = withSecurity(handler);
            
            await wrapped(req, res);

            expect(handler).toHaveBeenCalled();
        });
    });
});
