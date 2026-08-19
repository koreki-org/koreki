import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../src/lib/security';
import extractImageHandler from '../../src/pages/api/extract-image';
import { performBillingAction, checkCreditsAvailable } from '../../src/lib/billing';
import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';

/**
 * Den Preis einer OCR-Anfrage bestimmt der Server (Layer 2)
 * 💳🔒
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. In `extract-image` stand:
 *
 *     const isScan = req.body.isScan === true;
 *     const OCR_CREDIT_COST = effectivePageCount * (isScan ? 1 : 0);
 *
 * Damit entschied der Browser mit, ob ein Lauf überhaupt etwas kostet — der
 * Server glaubte ihm. Der Anbieter wurde unabhängig davon gerufen: Ein
 * `isScan: false` hätte echte Kosten auf unserem Schlüssel erzeugt und null
 * Credits gebucht.
 *
 * FÜR ECHTE NUTZER ÄNDERT SICH NICHTS, und das gehört zum Befund dazu. Jeder
 * Weg, der hier ankommt, meldet `isScan: true`:
 *
 *   - Digitale PDFs nehmen in `extraction-logic.ts` einen anderen Weg (Text
 *     lokal per pdf.js) und erreichen diese Route gar nicht.
 *   - Gescannte PDFs und Bilder rufen sie mit `true`.
 *   - Der Schwärzungs-Pfad setzt fest `isScanned: true`.
 *
 * Der Null-Fall war nur von Hand erreichbar. Das Feld selbst bleibt: Es
 * entscheidet weiterhin über die Wahl des Verfahrens beim Anbieter — nur die
 * Abrechnung hört nicht mehr darauf. Genau diese Trennung prüfen die Tests
 * unten.
 */

jest.mock('../../src/lib/billing', () => ({
    resolveActiveWorkspace: jest.fn(async () => ({ id: 'ws-1' })),
    checkAiBudget: jest.fn(async () => null),
    checkCreditsAvailable: jest.fn(async () => null),
    performBillingAction: jest.fn(async () => true)
}));

jest.mock('../../src/lib/ai/mistral-provider', () => ({
    executeMistralRequest: jest.fn(async () => ({ text: 'erkannt', usage: {} }))
}));
jest.mock('../../src/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn() }));
jest.mock('../../src/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn() }));

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: { user: { findUnique: jest.fn(async () => ({ id: 'u-1' })) } }
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: unknown) => handler,
    requireUserId: jest.fn(() => 'logto-1'),
    AuthenticatedRequest: {}
}));

jest.mock('../../src/lib/env-context', () => ({
    ...jest.requireActual('../../src/lib/env-context'),
    isLocalInstance: jest.fn(() => false)
}));

const mockBilling = performBillingAction as jest.Mock;
const mockVorpruefung = checkCreditsAvailable as jest.Mock;
const mockMistral = executeMistralRequest as jest.Mock;

const SEITE = Buffer.from('bild').toString('base64');

const anfrage = (body: Record<string, unknown>) => ({
    method: 'POST',
    url: '/api/extract-image',
    body: {
        buffers: [SEITE, SEITE, SEITE],
        mimeType: 'image/jpeg',
        settings: { provider: 'mistral', mistralKey: 'K' },
        ...body
    }
}) as unknown as AuthenticatedRequest;

const antwort = () => {
    const gelesen = { statusCode: 0 };
    return {
        status(code: number) { gelesen.statusCode = code; return this; },
        json() { return this; },
        setHeader() { return this; },
        gelesen
    } as unknown as NextApiResponse & { gelesen: { statusCode: number } };
};

/** Wie viele Credits wurden tatsächlich gebucht? */
const gebucht = (): number | undefined => {
    const aufrufe = mockBilling.mock.calls as unknown as { creditCost?: number }[][];
    return aufrufe[0]?.[0]?.creditCost;
};

describe('OCR-Preis haengt nicht mehr am Browser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVorpruefung.mockResolvedValue(null);
        mockMistral.mockResolvedValue({ text: 'erkannt', usage: {} });
    });

    /** DER BEFUND: Vorher wurden hier 0 Credits gebucht. */
    it('rechnet auch dann ab, wenn der Browser "kein Scan" behauptet', async () => {
        await extractImageHandler(anfrage({ isScan: false }), antwort());

        expect(gebucht()).toBe(3);
    });

    it('rechnet ab, wenn das Feld ganz fehlt', async () => {
        await extractImageHandler(anfrage({}), antwort());

        expect(gebucht()).toBe(3);
    });

    /** Der uebliche Fall — unveraendert. Das ist die Zusicherung. */
    it('rechnet einen echten Scan wie bisher ab', async () => {
        await extractImageHandler(anfrage({ isScan: true }), antwort());

        expect(gebucht()).toBe(3);
    });

    /**
     * Die Trennung ist der Punkt: Das Feld verschwindet nicht, es entscheidet
     * nur nicht mehr ueber den Preis. Beim Anbieter waehlt es weiterhin das
     * Verfahren.
     */
    it('reicht isScan weiterhin an den Anbieter durch', async () => {
        await extractImageHandler(anfrage({ isScan: true }), antwort());

        expect(mockMistral).toHaveBeenCalledWith(
            expect.anything(), expect.anything(), expect.anything(),
            expect.objectContaining({ isScan: true })
        );
    });

    /** Die Vorpruefung sieht denselben Betrag wie die Abrechnung. */
    it('prueft das Guthaben gegen denselben Betrag', async () => {
        await extractImageHandler(anfrage({ isScan: false }), antwort());

        expect(mockVorpruefung).toHaveBeenCalledWith('logto-1', 3);
    });
});
