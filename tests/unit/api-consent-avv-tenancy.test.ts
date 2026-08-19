import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../src/lib/security';
import consentHandler from '../../src/pages/api/user/consent-avv';
import prisma from '../../src/lib/prisma';

/**
 * Mandanten-Grenze bei der AVV-Zustimmung (Layer 2)
 * 🛡️⚖️
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026 — der schwerste Befund dieser Durchsicht.
 *
 * `consent-avv` nahm `workspaceId` ungeprüft aus dem Anfrage-Rumpf und setzte
 * darauf `avvAccepted: true`. Keine Mitgliedschaftsprüfung, keine Rolle, kein
 * `requireAdmin`. JEDER angemeldete Nutzer konnte damit für einen BELIEBIGEN
 * fremden Workspace die Zustimmung erteilen.
 *
 * Das ist nicht irgendein Flag. An ihm hängt der Compliance-Riegel vor der
 * KI-Verarbeitung: `performBillingAction` bricht mit "Compliance:
 * AVV-Zustimmung der Schulleitung fehlt" ab, solange er nicht gesetzt ist. Ein
 * Fremder konnte damit die Verarbeitung für eine Schule freischalten, deren
 * Leitung nie zugestimmt hat.
 *
 * Architectural Vision §4 sagt es wörtlich: "Jede Query muss zwingend auf die
 * organization_id filtern."
 *
 * Der zweite Teil des Befunds: Der Protokolleintrag stand VOR der Prüfung. Ein
 * abgelehnter Versuch hätte also trotzdem ein "AVV_CONSENT_ACCEPTED"
 * hinterlassen — ausgerechnet der Nachweis, auf den sich im Ernstfall jemand
 * beruft.
 */

const FREMDER_WORKSPACE = 'ws-fremde-schule';
const EIGENER_WORKSPACE = 'ws-eigene-schule';

const mockPrisma = prisma as unknown as {
    user: { findUnique: jest.Mock };
    membership: { findFirst: jest.Mock };
    workspace: { update: jest.Mock };
    privacyLog: { create: jest.Mock };
};

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn() },
        membership: { findFirst: jest.fn() },
        workspace: { update: jest.fn(async () => ({})) },
        privacyLog: { create: jest.fn(async () => ({})) }
    }
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: unknown) => handler,
    requireUserId: jest.fn(() => 'logto-1'),
    AuthenticatedRequest: {}
}));

jest.mock('../../src/lib/legal-registry', () => ({
    getCurrentAVV: () => ({ version: '1.0.0', hash: 'abc' }),
    getLatestLegalDocument: () => ({ version: '1.0.0' })
}), { virtual: true });

const anfrage = (workspaceId?: string) => ({
    method: 'POST',
    url: '/api/user/consent-avv',
    body: workspaceId ? { workspaceId } : {},
    ip: '127.0.0.1'
}) as unknown as AuthenticatedRequest;

const antwort = () => {
    const gelesen = { statusCode: 0, body: undefined as unknown };
    return {
        status(code: number) { gelesen.statusCode = code; return this; },
        json(payload: unknown) { gelesen.body = payload; return this; },
        gelesen
    } as unknown as NextApiResponse & { gelesen: { statusCode: number; body: unknown } };
};

describe('AVV-Zustimmung bleibt im eigenen Mandanten', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'USER' });
    });

    /** DER BEFUND. */
    it('lehnt die Zustimmung fuer einen fremden Workspace ab', async () => {
        // Keine Mitgliedschaft im Ziel-Workspace.
        mockPrisma.membership.findFirst.mockResolvedValue(null);
        const res = antwort();

        await consentHandler(anfrage(FREMDER_WORKSPACE), res);

        expect(res.gelesen.statusCode).toBe(403);
        expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
    });

    /** Ein einfaches Mitglied ist nicht die Schulleitung. */
    it('lehnt die Zustimmung eines einfachen Mitglieds ab', async () => {
        mockPrisma.membership.findFirst.mockResolvedValue({ role: 'MEMBER', workspaceId: EIGENER_WORKSPACE });
        const res = antwort();

        await consentHandler(anfrage(EIGENER_WORKSPACE), res);

        expect(res.gelesen.statusCode).toBe(403);
        expect(mockPrisma.workspace.update).not.toHaveBeenCalled();
    });

    /**
     * Der zweite Teil des Befunds: Kein Protokolleintrag ohne erteilte
     * Zustimmung. Ein Nachweis, der eine Zustimmung ausweist, die es nie gab,
     * ist schlimmer als gar keiner.
     */
    it('hinterlaesst bei Ablehnung KEINEN Zustimmungs-Eintrag', async () => {
        mockPrisma.membership.findFirst.mockResolvedValue(null);

        await consentHandler(anfrage(FREMDER_WORKSPACE), antwort());

        expect(mockPrisma.privacyLog.create).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'ADMIN'])('laesst die Leitung (%s) zustimmen', async (rolle) => {
        mockPrisma.membership.findFirst.mockResolvedValue({ role: rolle, workspaceId: EIGENER_WORKSPACE });
        const res = antwort();

        await consentHandler(anfrage(EIGENER_WORKSPACE), res);

        expect(res.gelesen.statusCode).toBe(200);
        expect(mockPrisma.workspace.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { avvAccepted: true } })
        );
    });

    /**
     * Der übliche Weg: Ohne Angabe gilt der persönliche Workspace, und dessen
     * Besitzer hat bei der Anlage die Rolle OWNER bekommen. Er darf also
     * weiterhin ohne Umweg zustimmen.
     */
    it('laesst den eigenen persoenlichen Workspace unveraendert zu', async () => {
        mockPrisma.membership.findFirst
            .mockResolvedValueOnce({ workspaceId: 'ws-privat' })   // Suche nach PERSONAL
            .mockResolvedValueOnce({ role: 'OWNER', workspaceId: 'ws-privat' });
        const res = antwort();

        await consentHandler(anfrage(), res);

        expect(res.gelesen.statusCode).toBe(200);
        expect(mockPrisma.workspace.update).toHaveBeenCalled();
    });

    /** Der Systemadministrator darf weiterhin ueberall. */
    it('laesst den Systemadministrator zustimmen', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'ADMIN' });
        mockPrisma.membership.findFirst.mockResolvedValue(null);
        const res = antwort();

        await consentHandler(anfrage(FREMDER_WORKSPACE), res);

        expect(res.gelesen.statusCode).toBe(200);
    });
});
