import joinHandler from '../../src/pages/api/workspaces/join';
import adminUsersHandler from '../../src/pages/api/admin/users';
import prisma from '../../src/lib/prisma';

// 1. Mock Prisma, Logto and LogtoMgmt
jest.mock('../../src/lib/prisma', () => {
    // Explizite Annotation noetig: `$transaction` referenziert mockPrisma in der
    // eigenen Initialisierung, TypeScript kann den Typ daher nicht herleiten.
    const mockPrisma: any = {
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({})
        },
        membership: {
            findUnique: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue({ id: 'm1' }),
            delete: jest.fn().mockResolvedValue({}),
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({})
        },
        workspace: {
            findUnique: jest.fn().mockResolvedValue({ id: 'ws1', type: 'ORGANIZATION', credits: 100 }),
            create: jest.fn().mockResolvedValue({ id: 'ws-new' }),
            update: jest.fn().mockResolvedValue({})
        },
        privacyLog: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 })
        },
        $transaction: jest.fn((cb: any) => cb(mockPrisma))
    };
    return {
        __esModule: true,
        default: mockPrisma
    };
});

jest.mock('../../src/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: (handler: any) => handler
    }
}));

jest.mock('../../src/lib/logto-mgmt', () => ({
    deleteLogtoUser: jest.fn().mockResolvedValue({ success: true })
}));

describe('Industrial Tenancy logic (2026) - Integration Tests', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Permissive Default Mapping
        (prisma.user.findUnique as jest.Mock).mockImplementation((args: any) => {
            if (args.where && args.where.logtoId) return Promise.resolve({ id: 'god-u', role: 'ADMIN', memberships: [] });
            if (args.where && args.where.id === 'u1') return Promise.resolve({ id: 'u1', role: 'USER', memberships: [] });
            return Promise.resolve(null);
        });

        req = {
            headers: { 'x-forwarded-for': '127.0.0.1' },
            socket: { remoteAddress: '127.0.0.1' } as any,
            body: {},
            query: {},
            user: { isAuthenticated: false }
        };
    });

    describe('/api/workspaces/join', () => {
        it('should join successfully', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: { inviteCode: 'C' },
                query: {}
            };
            await joinHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('/api/admin/users', () => {
        it('should handle GET', async () => {
            req = { 
                method: 'GET', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } },
                body: {},
                query: {}
            };
            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 for invalid body', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: {},
                query: {}
            };
            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle toggle-pro', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: { userId: 'u1', action: 'toggle-pro' },
                query: {}
            };
            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should BLOCK System-Admin institutional assignment', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: { userId: 'god-u', action: 'assign-workspace', workspaceId: 'ws-org' },
                query: {}
            };
            
            // For this test, both requester and target are admins
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                return Promise.resolve({ id: 'god-u', role: 'ADMIN', memberships: [] });
            });

            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle add-credits', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: { userId: 'u1', action: 'add-credits', amount: 10 },
                query: {}
            };
            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should handle delete-user', async () => {
            req = { 
                method: 'POST', 
                headers: { 'x-forwarded-for': '127.0.0.1' },
                socket: { remoteAddress: '127.0.0.1' } as any,
                user: { isAuthenticated: true, claims: { sub: 'god' } }, 
                body: { userId: 'u1', action: 'delete-user' },
                query: {}
            };
            await adminUsersHandler(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
