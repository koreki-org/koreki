import { readFileSync } from 'fs';
import { join } from 'path';
import { checkCompliance, checkCreditsAvailable } from '../../src/lib/billing';
import prisma from '../../src/lib/prisma';

/**
 * Der Compliance-Riegel greift VOR dem Anbieter-Aufruf (Layer 1 + 2)
 * ⚖️🚧
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026 — und der Befund korrigiert eine frühere
 * Reparatur aus derselben Sitzung.
 *
 * Vier KI-Routen trugen über ihrem Aufruf von `resolveActiveWorkspace` die
 * Überschrift "COMPLIANCE EARLY GATEKEEPER". Diese Funktion prüft die
 * AVV-Zustimmung aber gar nicht und wirft überhaupt nie — sie schlägt nur
 * einen Workspace nach. Der Riegel war an dieser Stelle wirkungslos.
 *
 * Die einzige echte Prüfung stand in `performBillingAction`, und die läuft
 * NACH dem Anbieter-Aufruf. Wirkung: Schülertext ging raus, und erst
 * anschließend fiel auf, dass die Schule nie zugestimmt hatte. Der Riegel hat
 * gehalten — aber zu spät, um die Verarbeitung zu verhindern, die er
 * verhindern soll.
 *
 * Besonders lehrreich: Ich hatte kurz zuvor `second-opinion` "repariert",
 * indem ich dort denselben `resolveActiveWorkspace`-Aufruf in ein try/catch
 * setzte und einen Compliance-Fehler erwartete. Ein Blindgänger — die
 * Annahme, eine Funktion prüfe etwas, weil eine Überschrift darüber es
 * behauptet, war genau der Fehler, den ich anderswo gesucht habe.
 */

const mockPrisma = prisma as unknown as { user: { findUnique: jest.Mock } };

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: { user: { findUnique: jest.fn() } }
}));

jest.mock('../../src/lib/env-context', () => ({
    ...jest.requireActual('../../src/lib/env-context'),
    isLocalInstance: jest.fn(() => false)
}));

const nutzer = (p: {
    rolle?: string;
    modus?: string | null;
    avv?: boolean;
    typ?: string;
}) => ({
    id: 'u-1',
    role: p.rolle ?? 'USER',
    appMode: p.modus ?? 'STANDARD',
    activeWorkspaceId: 'ws-1',
    memberships: [{
        workspaceId: 'ws-1',
        workspace: { id: 'ws-1', avvAccepted: p.avv ?? false, type: p.typ ?? 'ORGANIZATION' }
    }]
});

describe('checkCompliance', () => {
    beforeEach(() => jest.clearAllMocks());

    /** DER BEFUND: ohne Zustimmung der Schulleitung keine Verarbeitung. */
    it('sperrt eine Organisation ohne AVV-Zustimmung', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: false, typ: 'ORGANIZATION' }));

        await expect(checkCompliance('logto-1')).resolves.toMatch(/Schulleitung/);
    });

    it('sperrt einen persoenlichen Workspace im Standard-Modus ohne AVV', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: false, typ: 'PERSONAL', modus: 'STANDARD' }));

        await expect(checkCompliance('logto-1')).resolves.toMatch(/AVV-Zustimmung/);
    });

    it('laesst durch, sobald zugestimmt wurde', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: true }));

        await expect(checkCompliance('logto-1')).resolves.toBeNull();
    });

    /** Der Probemodus darf ohne AVV erkunden — dort keine echten Schuelerdaten. */
    it('laesst den Probemodus durch', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: false, modus: 'TRIAL' }));

        await expect(checkCompliance('logto-1')).resolves.toBeNull();
    });

    it('laesst den Systemadministrator durch', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: false, rolle: 'ADMIN' }));

        await expect(checkCompliance('logto-1')).resolves.toBeNull();
    });
});

describe('Die Guthaben-Vorpruefung traegt den Riegel mit', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Der Riegel steht VOR der Abkürzung für kostenlose Läufe. Ein Lauf, der
     * bewusst nichts kostet (kombinierte Abrechnung, inklusive Läufe),
     * verarbeitet trotzdem Schülerdaten und braucht dieselbe Zustimmung.
     */
    it('greift auch bei einem Lauf, der nichts kostet', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: false }));

        await expect(checkCreditsAvailable('logto-1', 0)).resolves.toMatch(/Schulleitung/);
    });

    it('laesst einen kostenlosen Lauf mit Zustimmung durch', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(nutzer({ avv: true }));

        await expect(checkCreditsAvailable('logto-1', 0)).resolves.toBeNull();
    });
});

/**
 * Die Routen dürfen den Riegel nicht wieder gegen eine Funktion tauschen, die
 * gar nicht prüft. Genau das war der Befund.
 */
describe('Jede Route mit Schuelertext ruft den echten Riegel', () => {
    const ROUTEN = [
        'ai-correct.ts',
        'clean-and-analyze.ts',
        'clean-and-map.ts',
        'extract-image.ts',
        'second-opinion.ts'
    ];

    const ohneKommentare = (q: string): string =>
        q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    it.each(ROUTEN)('%s ruft checkCompliance', (datei) => {
        const quelltext = ohneKommentare(
            readFileSync(join(process.cwd(), 'src', 'pages', 'api', datei), 'utf8')
        );

        expect(quelltext).toContain('checkCompliance(');
        // `resolveActiveWorkspace` prueft nichts — als Riegel taugt es nicht.
        expect(quelltext).not.toContain('resolveActiveWorkspace(');
    });
});
