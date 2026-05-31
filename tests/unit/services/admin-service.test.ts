import { AdminService } from '../../../src/lib/services/admin-service';
import prisma from '../../../src/lib/prisma';

// Mock the global prisma client
jest.mock('../../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        workspace: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        membership: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
        privacyLog: {
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb({
            workspace: { findUnique: jest.fn() },
            user: { findUnique: jest.fn(), update: jest.fn() },
            membership: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() }
        })),
    },
}));

describe('AdminService (Industrial Grade Tests)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Credit Top-up with Adaptive Provisioning 📊', () => {
        it('should provision a new personal workspace if user has none', async () => {
            const mockUser = {
                id: 'user-1',
                username: 'tester',
                activeWorkspaceId: null,
                memberships: []
            };

            const mockWs = { id: 'new-ws-1' };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.workspace.create as jest.Mock).mockResolvedValue(mockWs);

            await AdminService.addCredits('user-1', 50);

            // Step 1: Verified that it checks for current WS
            expect(prisma.user.findUnique).toHaveBeenCalled();
            // Step 2: Created new workspace since user had none
            expect(prisma.workspace.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ type: 'PERSONAL' })
            }));
            // Step 3: Linked user to this new workspace
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { activeWorkspaceId: 'new-ws-1' }
            }));
        });

        it('should use existing workspace for top-up', async () => {
            const mockUser = {
                id: 'user-1',
                activeWorkspaceId: 'ws-existing'
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({ id: 'ws-existing' });

            await AdminService.addCredits('user-1', 10);

            expect(prisma.workspace.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'ws-existing' },
                data: { credits: { increment: 10 } }
            }));
        });
    });

    describe('Exclusive Tenancy & Workspace Mapping 🏢', () => {
        it('should block admin assignment to an organization', async () => {
            const mockTx = {
                workspace: { findUnique: jest.fn().mockResolvedValue({ type: 'ORGANIZATION' }) },
                user: { findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }) }
            };
            (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(mockTx));

            await expect(AdminService.assignWorkspace('user-admin', 'ws-org'))
                .rejects.toThrow('System-Admins können keinem Institut zugewiesen werden');
        });

        it('should clear old organization memberships when assigning a new one', async () => {
             // Mocking the complex transaction logic
             const mockTx = {
                workspace: { findUnique: jest.fn().mockResolvedValue({ type: 'ORGANIZATION' }) },
                user: { findUnique: jest.fn().mockResolvedValue({ role: 'USER', appMode: 'STANDARD' }) },
                membership: { 
                    findMany: jest.fn().mockResolvedValue([{ id: 'old-mem' }]),
                    deleteMany: jest.fn(),
                    findFirst: jest.fn().mockResolvedValue(null),
                    create: jest.fn()
                },
                userUpdate: jest.fn()
            };
            // Mock $transaction to run the callback with our mock transaction object (casted as any)
            (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb({
                ...mockTx,
                user: { ...mockTx.user, update: mockTx.userUpdate }
            }));

            await AdminService.assignWorkspace('user-1', 'new-org-1');

            // Verified: Cleaned up old memberships before adding new one
            expect(mockTx.membership.findMany).toHaveBeenCalled();
            expect(mockTx.membership.deleteMany).toHaveBeenCalled();
            expect(mockTx.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ activeWorkspaceId: 'new-org-1' })
            }));
        });
    });
});
