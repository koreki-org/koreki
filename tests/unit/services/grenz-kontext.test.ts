import prisma from '@/lib/prisma';
import { UserService } from '@/lib/services/user-service';
import { istUnbegrenzt } from '@/lib/services/profile-limits';

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        membership: { count: jest.fn() }
    }
}));

jest.mock('@/lib/logto-mgmt', () => ({
    getLogtoUserRoles: jest.fn(),
    checkLogtoUserExists: jest.fn(),
    getLogtoUserProfile: jest.fn()
}));

/**
 * Wer von der Mengengrenze ausgenommen ist (Layer 1)
 * 🏢🛡️
 *
 * Drei Gruppen spüren die Grenze nicht: der System-Admin, wer sie gekauft hat,
 * und jedes Mitglied eines Instituts. Die dritte Gruppe ist die, die man beim
 * Umbau vergisst — sie hat keine eigene ROLLE, sondern nur eine Zeile in der
 * Mitgliedschaftstabelle.
 *
 * Eine Schule zahlt für ihre Lehrkräfte. Sie danach einzeln zum Freischalten zu
 * schicken wäre zweimal kassieren für dieselbe Sache.
 */
const zaehler = prisma.membership.count as jest.Mock;

describe('UserService.grenzKontext', () => {
    beforeEach(() => jest.clearAllMocks());

    it('nimmt ein Instituts-Mitglied ohne eigene Rolle aus', async () => {
        zaehler.mockResolvedValue(1);

        const kontext = await UserService.grenzKontext('u1', 'USER');

        expect(kontext.imInstitut).toBe(true);
        expect(istUnbegrenzt(kontext)).toBe(true);
    });

    it('lässt die Grenze für einen Einzelnutzer gelten', async () => {
        zaehler.mockResolvedValue(0);

        expect(istUnbegrenzt(await UserService.grenzKontext('u1', 'USER'))).toBe(false);
    });

    /**
     * DIE STELLE, die beim nächsten Aufräumen kippen könnte.
     *
     * Gefragt wird nach JEDER Mitgliedschaft, nicht nach dem gerade aktiven
     * Workspace. Wer das auf `activeWorkspaceId` verengt, sperrt jede Lehrkraft
     * aus, die gerade in ihrem persönlichen Bereich arbeitet — also die
     * Mehrheit, denn dort liegen die eigenen Profile.
     */
    it('fragt nach jeder Mitgliedschaft, nicht nur nach dem aktiven Bereich', async () => {
        zaehler.mockResolvedValue(1);

        await UserService.grenzKontext('u1', 'USER');

        const abfrage = zaehler.mock.calls[0][0];
        expect(abfrage.where).toEqual({ userId: 'u1', workspace: { type: 'ORGANIZATION' } });
        expect(JSON.stringify(abfrage)).not.toMatch(/activeWorkspace/);
    });

    /**
     * Wessen Rolle schon reicht, für den entfällt die Abfrage. Sonst zahlte
     * jedes Speichern eines Experten eine zusätzliche Runde zur Datenbank für
     * eine Antwort, die nichts mehr ändert.
     */
    it.each(['EXPERTE', 'ADMIN'])('fragt für %s gar nicht erst nach', async (rolle) => {
        const kontext = await UserService.grenzKontext('u1', rolle);

        expect(zaehler).not.toHaveBeenCalled();
        expect(istUnbegrenzt(kontext)).toBe(true);
    });
});
