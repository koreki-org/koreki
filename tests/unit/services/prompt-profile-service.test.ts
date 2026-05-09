import { PromptProfileService } from '../../../src/lib/services/prompt-profile-service';
import prisma from '../../../src/lib/prisma';

// Mock Prisma
jest.mock('../../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        promptProfile: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
            delete: jest.fn(),
        }
    }
}));

describe('PromptProfileService 🧪🏮🛡️', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSystemDefaults', () => {
        it('should return exactly 7 subject-specific profiles', () => {
            const defaults = PromptProfileService.getSystemDefaults();
            expect(defaults.length).toBe(7);
            expect(defaults.map(p => p.name)).toContain('Informatik');
            expect(defaults.every(p => p.isSystem)).toBe(true);
        });
    });

    describe('syncSystemProfiles', () => {
        it('should update existing system profiles', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'p1', name: 'Standard' });
            (prisma.promptProfile.update as jest.Mock).mockResolvedValue({ id: 'p1', name: 'Standard' });

            const results = await PromptProfileService.syncSystemProfiles();
            expect(prisma.promptProfile.update).toHaveBeenCalled();
            expect(results.length).toBe(7);
        });

        it('should create missing system profiles', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.promptProfile.create as jest.Mock).mockResolvedValue({ id: 'new', name: 'Any' });

            const results = await PromptProfileService.syncSystemProfiles();
            expect(prisma.promptProfile.create).toHaveBeenCalled();
            expect(results.length).toBe(7);
        });
    });

    describe('getAvailableProfiles', () => {
        it('should fetch both system and user profiles', async () => {
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([{ name: 'System' }, { name: 'User' }]);
            const results = await PromptProfileService.getAvailableProfiles('u1');
            expect(results.length).toBe(2);
            expect(prisma.promptProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { OR: [{ isSystem: true }, { userId: 'u1' }] }
            }));
        });
    });

    describe('upsertProfile', () => {
        it('should block non-admins from editing system profiles', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue({ name: 'Standard', isSystem: true });

            await expect(PromptProfileService.upsertProfile('u1', { name: 'Standard', correctionPrompt: 'New' }, 'USER'))
                .rejects.toThrow('System-Profile können nicht direkt geändert werden.');
        });

        it('should allow admins to edit system profiles via upsert', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue({ name: 'Standard', isSystem: true });
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p1' });

            const result = await PromptProfileService.upsertProfile('u1', { name: 'Standard', correctionPrompt: 'New' }, 'ADMIN');
            expect(result.id).toBe('p1');
        });

        it('should allow users to create personal profiles', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p2' });

            const result = await PromptProfileService.upsertProfile('u1', { name: 'My Profile', correctionPrompt: 'Custom' }, 'USER');
            expect(result.id).toBe('p2');
        });
    });

    describe('renameProfile', () => {
        it('should block renaming system profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'u1', isSystem: true });
            await expect(PromptProfileService.renameProfile('u1', 'p1', 'New Name'))
                .rejects.toThrow('System-Profile können nicht umbenannt werden');
        });

        it('should block renaming other users profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'other' });
            await expect(PromptProfileService.renameProfile('u1', 'p1', 'New Name'))
                .rejects.toThrow('Profil nicht gefunden oder kein Zugriff');
        });

        it('should block renaming to existing duplicate name', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Old' });
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'p2', name: 'Duplicate' });
            
            await expect(PromptProfileService.renameProfile('u1', 'p1', 'Duplicate'))
                .rejects.toThrow('Ein Profil mit diesem Namen existiert bereits');
        });

        it('should allow renaming owned non-system profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Old' });
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.promptProfile.update as jest.Mock).mockResolvedValue({ id: 'p1', name: 'New' });

            await PromptProfileService.renameProfile('u1', 'p1', 'New');
            expect(prisma.promptProfile.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { name: 'New' }
            }));
        });
    });

    describe('deleteProfile', () => {
        it('should throw if profile not found', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(PromptProfileService.deleteProfile('u1', 'unknown'))
                .rejects.toThrow('Profil nicht gefunden');
        });

        it('should allow admins to delete anything', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', isSystem: true });
            (prisma.promptProfile.delete as jest.Mock).mockResolvedValue({ id: 'p1' });

            await PromptProfileService.deleteProfile('admin1', 'p1', 'ADMIN');
            expect(prisma.promptProfile.delete).toHaveBeenCalled();
        });

        it('should block users from deleting system profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', isSystem: true });

            await expect(PromptProfileService.deleteProfile('u1', 'p1', 'USER'))
                .rejects.toThrow('System-Profile können nur von Admins gelöscht werden');
        });

        it('should block users from deleting other users profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', isSystem: false, userId: 'other-user' });

            await expect(PromptProfileService.deleteProfile('u1', 'p1', 'USER'))
                .rejects.toThrow('Nicht autorisiert');
        });

        it('should allow owners to delete their own profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', isSystem: false, userId: 'u1' });
            (prisma.promptProfile.delete as jest.Mock).mockResolvedValue({ id: 'p1' });

            const result = await PromptProfileService.deleteProfile('u1', 'p1', 'USER');
            expect(result.id).toBe('p1');
        });
    });
});
