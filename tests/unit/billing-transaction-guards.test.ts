/**
 * Wächter der Abrechnungs-Transaktion (Layer 1)
 * 💳🛡️
 *
 * `performBillingAction` bucht Credits ab und schreibt den Token-Verbrauch
 * fort — alles in einer Prisma-Transaktion. Diese Datei prüft die Ausstiege,
 * bei denen NICHT gebucht werden darf.
 *
 * Anlass: Der Nutzer wurde aus der Datenbank geholt und ohne Prüfung
 * weiterverwendet. Fehlte er, lief der nächste Zugriff in einen TypeError statt
 * in eine verständliche Meldung. Verdeckt hat das ein `as any` auf dem
 * Abfrage-Ergebnis.
 */

const findUnique = jest.fn();
const userUpdate = jest.fn();
const workspaceUpdate = jest.fn();
const systemUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: (arbeit: (tx: unknown) => Promise<unknown>) => arbeit({
            user: { findUnique, update: userUpdate },
            workspace: { update: workspaceUpdate },
            systemSettings: { upsert: systemUpsert }
        })
    }
}));

jest.mock('@/lib/env-context', () => ({
    isLocalInstance: () => false,
    isDesktopTarget: () => false
}));

import { performBillingAction } from '@/lib/billing';

describe('performBillingAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userUpdate.mockResolvedValue({});
        workspaceUpdate.mockResolvedValue({ credits: 100 });
        systemUpsert.mockResolvedValue({});
    });

    /**
     * DER FALL, DER VORHER IN EINEN TypeError LIEF.
     *
     * Ein fehlender Nutzer ist kein unmoeglicher Zustand: die Abfrage laeuft
     * INNERHALB der Transaktion, und zwischen Anmeldung und Abrechnung kann ein
     * Konto geloescht worden sein.
     */
    it('bricht mit verstaendlicher Meldung ab, wenn der Nutzer fehlt', async () => {
        findUnique.mockResolvedValue(null);

        await expect(performBillingAction({
            logtoId: 'gibt-es-nicht',
            module: 'correction',
            inputTokens: 100,
            outputTokens: 50,
            creditCost: 1
        })).rejects.toThrow(/Nutzer für die Abrechnung nicht gefunden/);

        // Entscheidend: nichts wurde gebucht.
        expect(userUpdate).not.toHaveBeenCalled();
        expect(workspaceUpdate).not.toHaveBeenCalled();
    });

    it('bricht ab, wenn der Nutzer in keinem Workspace ist', async () => {
        findUnique.mockResolvedValue({
            logtoId: 'u1',
            activeWorkspaceId: null,
            memberships: []
        });

        await expect(performBillingAction({
            logtoId: 'u1',
            module: 'correction',
            inputTokens: 100,
            outputTokens: 50,
            creditCost: 1
        })).rejects.toThrow(/Workspace/);

        expect(workspaceUpdate).not.toHaveBeenCalled();
    });

    /**
     * Die Guthaben-Grenze. Ohne sie liefe der Workspace ins Minus — die
     * Anbieterkosten fallen naemlich trotzdem an.
     */
    it('bucht nicht ab, wenn das Guthaben nicht reicht', async () => {
        findUnique.mockResolvedValue({
            logtoId: 'u1',
            activeWorkspaceId: 'ws-1',
            memberships: [{
                workspaceId: 'ws-1',
                workspace: { id: 'ws-1', type: 'PERSONAL', credits: 2 }
            }]
        });

        await expect(performBillingAction({
            logtoId: 'u1',
            module: 'correction',
            inputTokens: 100,
            outputTokens: 50,
            creditCost: 5
        })).rejects.toThrow(/Nicht genügend Credits/);

        expect(workspaceUpdate).not.toHaveBeenCalled();
    });

    /**
     * Der Normalfall — und zugleich die Absicherung, dass die Ausstiege oben
     * nicht einfach ALLES blockieren. Ohne diesen Fall wuerde ein Waechter, der
     * versehentlich immer wirft, hier gruen melden.
     */
    it('bucht bei ausreichendem Guthaben ab', async () => {
        findUnique.mockResolvedValue({
            logtoId: 'u1',
            activeWorkspaceId: 'ws-1',
            memberships: [{
                workspaceId: 'ws-1',
                workspace: { id: 'ws-1', type: 'PERSONAL', credits: 100 }
            }]
        });

        await performBillingAction({
            logtoId: 'u1',
            module: 'correction',
            inputTokens: 1000,
            outputTokens: 500,
            creditCost: 3
        });

        expect(workspaceUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'ws-1' },
            data: expect.objectContaining({ credits: { decrement: 3 } })
        }));
        expect(userUpdate).toHaveBeenCalled();
    });

    /**
     * Kombinierte Abrechnung: manche Aufrufe kosten bewusst null Credits, weil
     * sie zusammen mit einem anderen Schritt abgerechnet werden. Der
     * Token-Verbrauch muss trotzdem fortgeschrieben werden — er entscheidet
     * ueber den Monatsdeckel der Instanz.
     */
    it('schreibt den Verbrauch auch bei null Credits fort', async () => {
        findUnique.mockResolvedValue({
            logtoId: 'u1',
            activeWorkspaceId: 'ws-1',
            memberships: [{
                workspaceId: 'ws-1',
                workspace: { id: 'ws-1', type: 'PERSONAL', credits: 0 }
            }]
        });

        await performBillingAction({
            logtoId: 'u1',
            module: 'ocr',
            inputTokens: 800,
            outputTokens: 200,
            creditCost: 0
        });

        expect(userUpdate).toHaveBeenCalled();
        expect(systemUpsert).toHaveBeenCalled();
    });
});
