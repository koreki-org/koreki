import { UserService } from '../../src/lib/services/user-service';
import prisma from '../../src/lib/prisma';
import { checkLogtoUserExists, getLogtoUserRoles } from '../../src/lib/logto-mgmt';

jest.mock('../../src/lib/prisma', () => ({
    user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
    },
    workspace: {
        create: jest.fn()
    },
    membership: {
        create: jest.fn()
    },
    $transaction: jest.fn((callback) => callback(prisma))
}));

jest.mock('../../src/lib/logto-mgmt', () => ({
    checkLogtoUserExists: jest.fn(),
    getLogtoUserRoles: jest.fn()
}));

describe('Identity JIT Provisioning', () => {
    const mockLogtoId = 'logto-123';
    const mockClaims = { sub: mockLogtoId, name: 'Test User' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should provision a new user if not found in database', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // Not in DB
        (checkLogtoUserExists as jest.Mock).mockResolvedValue(true);
        (getLogtoUserRoles as jest.Mock).mockResolvedValue([]);
        
        (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'new-id', logtoId: mockLogtoId });
        (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'mock-ws-id' });
        (prisma.membership.create as jest.Mock).mockResolvedValue({ id: 'mock-membership-id' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'new-id', logtoId: mockLogtoId, memberships: [] });

        const user = await UserService.ensureUserExists(mockLogtoId, mockClaims);

        expect(prisma.user.create).toHaveBeenCalled();
        expect(prisma.workspace.create).toHaveBeenCalled();
        expect(user.id).toBe('new-id');
    });

    it('should sync an existing user if found', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ 
            id: 'existing-id', 
            logtoId: mockLogtoId, 
            username: 'Old Name',
            role: 'USER',
            memberships: [] 
        });
        (getLogtoUserRoles as jest.Mock).mockResolvedValue([]);
        (prisma.user.update as jest.Mock).mockResolvedValue({ 
            id: 'existing-id', 
            username: 'New Name', 
            memberships: [] 
        });

        const user = await UserService.ensureUserExists(mockLogtoId, { ...mockClaims, name: 'New Name' });

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ username: 'New Name' })
        }));
        expect(user.id).toBe('existing-id');
    });
});
