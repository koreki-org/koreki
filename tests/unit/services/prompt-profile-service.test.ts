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
            deleteMany: jest.fn(),
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
            expect(defaults.map(p => p.name)).toContain('Fachlehrer Informatik');
            expect(defaults.every(p => p.isSystem)).toBe(true);
        });
    });

    describe('syncSystemProfiles', () => {
        /**
         * Die Zeile traegt die Kennung aus der Registry (`id-standard` & Co.) —
         * nur so ist dieselbe Vorlage in SaaS, Community und Desktop identisch
         * adressierbar. Zuvor vergab Prisma eine `cuid()`, in jeder Umgebung
         * eine andere.
         */
        it('schreibt die Registry-Kennung als ID', async () => {
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'id-standard' });

            const results = await PromptProfileService.syncSystemProfiles();

            expect(results.length).toBe(7);
            expect(prisma.promptProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'id-standard' },
                create: expect.objectContaining({ id: 'id-standard', isSystem: true })
            }));
        });

        /**
         * Altzeilen mit `cuid()` muessen weichen — sonst stuende jede Vorlage
         * zweimal in der Liste, einmal unter der alten und einmal unter der
         * neuen Kennung.
         */
        it('entfernt namensgleiche Altzeilen mit abweichender Kennung', async () => {
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([{ id: 'ckalt123' }]);
            (prisma.promptProfile.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'id-standard' });

            await PromptProfileService.syncSystemProfiles();

            expect(prisma.promptProfile.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['ckalt123'] } }
            });
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
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p1' });

            const result = await PromptProfileService.upsertProfile('u1', { name: 'Standard', correctionPrompt: 'New' }, 'ADMIN');
            expect(result.id).toBe('p1');
        });

        it('should allow users to create personal profiles', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p2' });

            const result = await PromptProfileService.upsertProfile('u1', { name: 'My Profile', correctionPrompt: 'Custom' }, 'USER');
            expect(result.id).toBe('p2');
        });

        /**
         * Der Nutzer hat dem Überschreiben zugestimmt (Rückfrage nach
         * `isSameName`) — der Upsert muss dann auch den bestehenden Datensatz
         * treffen und nicht wegen abweichender Schreibweise eine zweite Zeile
         * anlegen.
         */
        it('should target the existing record when only the case differs', async () => {
            (prisma.promptProfile.findFirst as jest.Mock).mockResolvedValue(null);
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([{ name: 'Deutsch LK' }]);
            (prisma.promptProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p3' });

            await PromptProfileService.upsertProfile('u1', { name: 'deutsch lk', correctionPrompt: 'Custom' }, 'USER');

            expect(prisma.promptProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { name_userId: { name: 'Deutsch LK', userId: 'u1' } }
            }));
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
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([
                { id: 'p1', name: 'Old' },
                { id: 'p2', name: 'Duplicate' }
            ]);

            await expect(PromptProfileService.renameProfile('u1', 'p1', 'Duplicate'))
                .rejects.toThrow('Ein Profil mit diesem Namen existiert bereits');
        });

        /**
         * Zwei Profile, die sich nur in der Schreibweise unterscheiden, sind in
         * der Seitenleiste nicht auseinanderzuhalten. Die Eindeutigkeits-Sperre
         * der Datenbank vergleicht exakt und ließe sie zu — deshalb prüft der
         * Dienst selbst nach `isSameName`.
         */
        it('should block renaming to a name that differs only in case', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Old' });
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([
                { id: 'p1', name: 'Old' },
                { id: 'p2', name: 'Deutsch LK' }
            ]);

            await expect(PromptProfileService.renameProfile('u1', 'p1', '  deutsch lk '))
                .rejects.toThrow('Ein Profil mit diesem Namen existiert bereits');
        });

        it('should allow renaming owned non-system profiles', async () => {
            (prisma.promptProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Old' });
            (prisma.promptProfile.findMany as jest.Mock).mockResolvedValue([{ id: 'p1', name: 'Old' }]);
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
