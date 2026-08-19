import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../src/lib/security';
import joinHandler from '../../src/pages/api/workspaces/join';
import prisma from '../../src/lib/prisma';

/**
 * Beitritt zu einer Organisation kostet keine erkaufte Rolle (Layer 2)
 * 🎓🛡️
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. In `workspaces/join` stand:
 *
 *     role: user.role === 'ADMIN' ? 'ADMIN' : 'USER'
 *
 * Das ist die GLOBALE Nutzerrolle, nicht die Mitgliedschaftsrolle — und
 * dieses Feld trägt auch 'EXPERTE'. Wer den Experten-Modus für 25 Credits
 * freigeschaltet hatte und danach mit dem Einladungscode seiner Schule
 * beitrat, verlor ihn wortlos: aus EXPERTE wurde USER, ohne Hinweis und ohne
 * Erstattung.
 *
 * Die Regel "erhöhte Rolle bewahren" galt für ADMIN und nicht für das
 * Geschwister EXPERTE — dieselbe Fehlerklasse wie an vielen Stellen dieser
 * Durchsicht, hier mit einem Preisschild dran.
 */

const mockPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    workspace: { findUnique: jest.Mock };
    membership: { findUnique: jest.Mock };
    $transaction: jest.Mock;
};

const tx = {
    membership: { deleteMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
    user: { update: jest.fn(async () => ({})) }
};

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn() },
        workspace: { findUnique: jest.fn() },
        membership: { findUnique: jest.fn() },
        $transaction: jest.fn()
    }
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: unknown) => handler,
    requireUserId: jest.fn(() => 'logto-1'),
    AuthenticatedRequest: {}
}));

const anfrage = () => ({
    method: 'POST',
    url: '/api/workspaces/join',
    body: { inviteCode: 'SCHULE-2026' }
}) as unknown as AuthenticatedRequest;

const antwort = () => {
    const gelesen = { statusCode: 0 };
    return {
        status(code: number) { gelesen.statusCode = code; return this; },
        json() { return this; },
        gelesen
    } as unknown as NextApiResponse & { gelesen: { statusCode: number } };
};

/**
 * Welche Rolle hat der Beitritt in die Nutzer-Tabelle geschrieben?
 *
 * Der Aufruf wird bewusst als `unknown` gelesen und dann eingegrenzt: Ein
 * leeres `mock.calls` hat fuer TypeScript den Tupel-Typ `[]`, und ein Zugriff
 * auf `[0]` waere darauf ein Fehler — obwohl er zur Laufzeit schlicht
 * `undefined` liefert.
 */
const geschriebeneRolle = (): string | undefined => {
    const aufrufe = tx.user.update.mock.calls as unknown as { data?: { role?: string } }[][];
    return aufrufe[0]?.[0]?.data?.role;
};

describe('Beitritt per Einladungscode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tx.membership.deleteMany.mockClear();
        tx.membership.create.mockClear();
        tx.user.update.mockClear();

        mockPrisma.workspace.findUnique.mockResolvedValue({
            id: 'ws-schule', name: 'Schule', type: 'ORGANIZATION'
        });
        mockPrisma.membership.findUnique.mockResolvedValue(null);
        mockPrisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));
    });

    /** DER BEFUND. */
    it('nimmt einem Experten seine erkaufte Rolle nicht weg', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'EXPERTE', appMode: 'STANDARD' });

        await joinHandler(anfrage(), antwort());

        expect(geschriebeneRolle()).toBe('EXPERTE');
    });

    it('laesst den Systemadministrator unberuehrt', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'ADMIN', appMode: 'STANDARD' });

        await joinHandler(anfrage(), antwort());

        expect(geschriebeneRolle()).toBe('ADMIN');
    });

    /** Die urspruengliche Absicht bleibt: ohne erhoehte Rolle gilt die Grundrolle. */
    it('setzt eine unbekannte Rolle auf die Grundrolle', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: '', appMode: 'STANDARD' });

        await joinHandler(anfrage(), antwort());

        expect(geschriebeneRolle()).toBe('USER');
    });

    /** Die MITGLIEDSCHAFT bleibt davon unberuehrt — sie ist eine andere Rolle. */
    it('legt die Mitgliedschaft weiterhin als MEMBER an', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'EXPERTE', appMode: 'STANDARD' });

        await joinHandler(anfrage(), antwort());

        expect(tx.membership.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ role: 'MEMBER' }) })
        );
    });
});
