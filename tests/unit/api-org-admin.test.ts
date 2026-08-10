import { NextApiRequest, NextApiResponse } from 'next';
import orgAdminHandler from '../../src/pages/api/org-admin';
import removeMemberHandler from '../../src/pages/api/org-admin/remove-member';
import toggleRoleHandler from '../../src/pages/api/org-admin/toggle-role';
import updateCodeHandler from '../../src/pages/api/org-admin/update-code';
import prisma from '../../src/lib/prisma';

// 1. Mock Prisma and Logto
jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn()
        },
        membership: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn(),
            update: jest.fn()
        },
        workspace: {
            findUnique: jest.fn(),
            update: jest.fn()
        },
        privacyLog: {
            create: jest.fn().mockResolvedValue({})
        },
        $transaction: jest.fn((cb) => cb({
            membership: { 
                delete: jest.fn(), 
                findMany: jest.fn().mockResolvedValue([]) 
            },
            workspace: { update: jest.fn() },
            user: { update: jest.fn() },
            privacyLog: { create: jest.fn().mockResolvedValue({}) }
        }))
    }
}));

jest.mock('../../src/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: (handler: any) => handler
    }
}));

describe('Organization Admin API Routes', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('/api/org-admin (Base)', () => {
        it('should return 401 if not authenticated', async () => {
            req = { 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                user: { isAuthenticated: false },
                body: {},
                query: {}
            };
            await orgAdminHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 403 if no administration rights found', async () => {
            req = { 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                user: { isAuthenticated: true, claims: { sub: 'user-1' } }, 
                body: { workspaceId: 'ws-1' },
                query: { workspaceId: 'ws-1' } 
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u1',
                role: 'USER',
                memberships: []
            });

            await orgAdminHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 404 if workspace not found', async () => {
            req = { 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                user: { isAuthenticated: true, claims: { sub: 'u1' } }, 
                body: {},
                query: { workspaceId: 'ws-none' } 
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-1',
                role: 'ADMIN',
                memberships: []
            });
            (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

            await orgAdminHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should allow God Mode for System Admins with query workspaceId', async () => {
            req = { 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                user: { isAuthenticated: true, claims: { sub: 'admin-1' } }, 
                body: {},
                query: { workspaceId: 'ws-god' } 
            };
            
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-admin',
                role: 'ADMIN',
                memberships: []
            });

            (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
                id: 'ws-god',
                name: 'God School',
                type: 'ORGANIZATION',
                credits: 999,
                inviteCode: 'GOD-MODE',
                avvAccepted: true,
                memberships: []
            });

            await orgAdminHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            const data = res.json.mock.calls[0][0];
            expect(data.workspace.name).toBe('God School');
        });
    });

    describe('/api/org-admin/remove-member', () => {
        it('should return 405 for GET method', async () => {
            req = { 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'GET',
                user: { isAuthenticated: true, claims: { sub: 'admin-1' } },
                body: { workspaceId: 'ws-1' },
                query: { workspaceId: 'ws-1' }
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-admin',
                role: 'ADMIN',
                memberships: []
            });
            await removeMemberHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(405);
        });

        it('should return 403 if requester is not admin', async () => {
            req = {
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'POST',
                user: { isAuthenticated: true, claims: { sub: 'u1' } },
                body: { membershipId: 'm1', targetUserId: 'u2', workspaceId: 'ws-1' },
                query: {}
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-1',
                role: 'USER',
                memberships: []
            });
            (prisma.membership.findUnique as jest.Mock).mockResolvedValue({ workspaceId: 'ws-1' });

            await removeMemberHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
        it('should remove member and downgrade user (Transaction)', async () => {
            req = {
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'POST',
                user: { isAuthenticated: true, claims: { sub: 'admin-1' } },
                body: { membershipId: 'm-target', targetUserId: 'u-target', workspaceId: 'ws-1' },
                query: {}
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-admin',
                role: 'USER',
                memberships: [{ workspaceId: 'ws-1', role: 'ADMIN' }]
            });

            (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
                id: 'm-target',
                workspaceId: 'ws-1',
                userId: 'u-target',
                role: 'MEMBER'
            });

            await removeMemberHandler(req, res);
            
            expect(prisma.$transaction).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('/api/org-admin/toggle-role', () => {
        it('should toggle role between MEMBER and ADMIN', async () => {
            req = {
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'POST',
                user: { isAuthenticated: true, claims: { sub: 'admin-1' } },
                body: { membershipId: 'm-target', targetRole: 'ADMIN', workspaceId: 'ws-1' },
                query: {}
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-admin',
                role: 'ADMIN', // Global admin
                memberships: []
            });

            (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
                id: 'm-target',
                workspaceId: 'ws-1'
            });

            await toggleRoleHandler(req, res);

            expect(prisma.membership.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'm-target' },
                data: { role: 'ADMIN' }
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 for invalid role', async () => {
            req = {
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'POST',
                user: { isAuthenticated: true, claims: { sub: 'a1' } },
                body: { membershipId: 'm1', targetRole: 'INVALID', workspaceId: 'ws-1' },
                query: {}
            };
            await toggleRoleHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(400); 
        });
    });

    describe('/api/org-admin/update-code', () => {
        it('should update organization invite code', async () => {
            req = {
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' },
                method: 'POST',
                user: { isAuthenticated: true, claims: { sub: 'admin-1' } },
                body: { workspaceId: 'ws-1', inviteCode: 'NEW-CODE-99' },
                query: {}
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u-admin',
                role: 'USER',
                memberships: [{ workspaceId: 'ws-1', role: 'OWNER' }]
            });

            await updateCodeHandler(req, res);

            expect(prisma.workspace.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'ws-1' },
                data: { inviteCode: 'NEW-CODE-99' }
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
