import handler from '../../src/pages/api/user/grading-memories';
import prisma from '../../src/lib/prisma';

/**
 * Layer 2 — Identität des Erfahrungsschatzes (SaaS-Pfad).
 *
 * Der Speicherpfad adressierte den Datensatz über `name_userId`. Wurde ein
 * Erfahrungsschatz umbenannt, traf ein anschließendes Speichern ihn nicht mehr
 * — die Fälle landeten in einem neuen Eintrag unter dem alten Namen. Mit der
 * Kennung ist der Datensatz eindeutig.
 */
jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'logto-user' } };
        return handler(req, res);
    }
}));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => false)
}));

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn() },
        gradingMemory: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
            delete: jest.fn()
        }
    }
}));

const faelle = [
    {
        id: 'fall-1',
        studentText: 'Antwort',
        expectedCorrection: { pointsObtained: 2, correctionNotes: 'Gut begründet' }
    }
];

describe('GradingMemories API — Identität über die Kennung (Layer 2)', () => {
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'db-user', role: 'USER' });
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    it('trifft mit Kennung den bestehenden Datensatz, unabhängig vom Namen', async () => {
        (prisma.gradingMemory.findUnique as jest.Mock).mockResolvedValue({
            id: 'mem-1', name: 'Inzwischen umbenannt', userId: 'db-user'
        });
        (prisma.gradingMemory.update as jest.Mock).mockResolvedValue({ id: 'mem-1' });

        await handler({
            method: 'POST',
            body: { id: 'mem-1', name: 'Alter Name', cases: faelle }
        } as any, res);

        expect(prisma.gradingMemory.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'mem-1' }
        }));
        // Der Name bleibt unangetastet — Umbenennen laeuft ueber PATCH.
        expect((prisma.gradingMemory.update as jest.Mock).mock.calls[0][0].data).not.toHaveProperty('name');
        expect(prisma.gradingMemory.upsert).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('verweigert eine fremde Kennung', async () => {
        (prisma.gradingMemory.findUnique as jest.Mock).mockResolvedValue({
            id: 'mem-1', name: 'Fremd', userId: 'anderer-nutzer'
        });

        await handler({
            method: 'POST',
            body: { id: 'mem-1', name: 'Fremd', cases: faelle }
        } as any, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(prisma.gradingMemory.update).not.toHaveBeenCalled();
    });

    it('legt ohne Kennung neu an und trifft dabei abweichende Schreibweisen', async () => {
        (prisma.gradingMemory.findMany as jest.Mock).mockResolvedValue([{ name: 'Klausur 1' }]);
        (prisma.gradingMemory.upsert as jest.Mock).mockResolvedValue({ id: 'mem-neu' });

        await handler({
            method: 'POST',
            body: { name: 'klausur 1', cases: faelle }
        } as any, res);

        expect(prisma.gradingMemory.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { name_userId: { name: 'Klausur 1', userId: 'db-user' } }
        }));
    });

    it('lehnt das Umbenennen auf einen vergebenen Namen mit 409 ab', async () => {
        (prisma.gradingMemory.findUnique as jest.Mock).mockResolvedValue({
            id: 'mem-1', name: 'Klausur 1', userId: 'db-user'
        });
        (prisma.gradingMemory.findFirst as jest.Mock).mockResolvedValue({
            id: 'mem-2', name: 'Klausur 2', userId: 'db-user'
        });

        await handler({
            method: 'PATCH',
            body: { id: 'mem-1', newName: 'Klausur 2' }
        } as any, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('existiert bereits')
        }));
        expect(prisma.gradingMemory.update).not.toHaveBeenCalled();
    });
});
