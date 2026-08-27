import extractImageHandler from '../../src/pages/api/extract-image';
import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../src/lib/ai/openai-provider';
import { executeOllamaRequest } from '../../src/lib/ai/ollama-logic';
import { isLocalInstance } from '../../src/lib/env-context';
import { MISTRAL_OCR_MODEL } from '../../src/lib/ai/constants';

jest.mock('../../src/lib/billing', () => ({
    // Der Compliance-Riegel vor dem Anbieter-Aufruf: null = darf verarbeiten.
    checkCompliance: jest.fn(async () => null),
    resolveActiveWorkspace: jest.fn(async () => ({ activeWorkspaceId: 'ws-1' })),
    performBillingAction: jest.fn(async () => true),
    checkCreditsAvailable: jest.fn(async () => null),
    checkAiBudget: jest.fn(async () => null)
}));

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn(() => ({ id: 'u-1', activeWorkspaceId: 'ws-1' })) },
        systemSettings: { findUnique: jest.fn(() => ({})) }
    }
}));

jest.mock('../../src/lib/ai/mistral-provider', () => ({ executeMistralRequest: jest.fn() }));
jest.mock('../../src/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn() }));
jest.mock('../../src/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn() }));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => false),
    isKeycloakAuth: jest.fn(() => false)
}));

jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = { claims: { sub: 'user-id-123' } };
        return handler(req, res);
    },
    requireUserId: (req: any) => req.user?.claims?.sub
}));

jest.mock('../../src/lib/logger', () => ({
    // `security` gehoert zwingend dazu: sanitizeClientAiSettings meldet darueber
    // verworfene Anbieter-Adressen. Fehlt die Methode, laeuft die Route in ihren
    // Catch-Block und der Test misst einen Fehler statt der Weiche.
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn(), security: jest.fn() }
}));

/**
 * Waechter fuer die Anbieter-Weiche der Bilderkennung.
 *
 * Die Weiche ist eine einzige Zeile in extract-image.ts:
 *   const useOpenAI = settings?.provider === 'openai-compatible' || isComplex;
 *
 * Sie entscheidet, ob eine Seite an Mistrals dedizierten OCR-Endpunkt geht oder an
 * Qwen. Beides ist gewollt — aber die Zuordnung darf sich nicht unbemerkt drehen:
 * Der Schalter "Hohe Genauigkeit" heisst fuer die Lehrkraft "langsamer, dafuer
 * Handschrift", und ein Vertauschen wuerde bei ausgeschaltetem Schalter still das
 * teure Modell ziehen (oder umgekehrt Handschrift durch das falsche Modell jagen).
 *
 * Zusaetzlich festgehalten: Die OCR-Aktion laeuft ueber `action: 'ocr'`, nicht ueber
 * 'vision'. 'vision' waere mistral-large ueber /chat/completions und damit gerade
 * NICHT der OCR-Endpunkt.
 *
 * GELTUNGSBEREICH — der Schalter existiert nur im SaaS:
 * BatchHeader blendet ihn unter `!isLocalInstance() && provider === 'mistral'` ein.
 * In Community und Desktop ist er ausgeblendet, `ocrStrategy` bleibt auf 'standard'
 * und `isComplex` damit dauerhaft false. Dort fuehrt kein Weg ueber den Schalter zum
 * Qwen-Pfad; wer dort Handschrift verarbeiten will, wechselt den Provider (eigener
 * openai-kompatibler Endpunkt oder Ollama-Vision).
 *
 * Serverseitig ist die Weiche dennoch fuer alle Editionen dieselbe — extract-image
 * wertet `isLocalInstance` nicht aus. Die Faelle unten gelten deshalb unveraendert,
 * nur sind die Schalterstellungen ausserhalb des SaaS nicht frei waehlbar.
 */
describe('extract-image: Anbieter-Weiche der Bilderkennung (SaaS)', () => {
    let res: any;

    const baseBody = (isComplex: boolean | undefined, provider: string) => ({
        buffers: ['YmFzZTY0'],
        mimeType: 'image/jpeg',
        pageCount: 1,
        ...(isComplex === undefined ? {} : { isComplex }),
        settings: { provider, mistralKey: 'm-key', openaiKey: 'o-key', openaiUrl: 'https://example.invalid/v1', openaiModel: 'Qwen3.6-35B-A3B-FP8' }
    });

    const run = async (body: any) => {
        const req: any = { method: 'POST', body, url: '/api/extract-image' };
        await (extractImageHandler as any)(req, res);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MISTRAL_API_KEY = 'mock-mistral-key';
        process.env.OPENAI_API_KEY = 'mock-openai-key';
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
        (executeMistralRequest as jest.Mock).mockResolvedValue({ text: 'mistral-text', usage: {} });
        (executeOpenAIRequest as jest.Mock).mockResolvedValue({ text: 'openai-text', usage: {} });
        (executeOllamaRequest as jest.Mock).mockResolvedValue({ text: 'ollama-text', usage: {} });
        (isLocalInstance as jest.Mock).mockReturnValue(false);
    });

    it('nimmt bei ausgeschaltetem Schalter Mistral, nicht Qwen', async () => {
        await run(baseBody(false, 'mistral'));

        expect(executeMistralRequest).toHaveBeenCalled();
        expect(executeOpenAIRequest).not.toHaveBeenCalled();
    });

    it('ruft dabei den dedizierten OCR-Endpunkt auf, nicht die Vision-Aktion', async () => {
        await run(baseBody(false, 'mistral'));

        expect((executeMistralRequest as jest.Mock).mock.calls[0][0]).toBe('ocr');
    });

    it('laesst dem Provider die Wahl des OCR-Modells (kein Override am Aufrufort)', async () => {
        // Der vierte Parameter darf kein abweichendes OCR-Modell erzwingen — sonst
        // liefe die zentrale Konstante ins Leere.
        await run(baseBody(false, 'mistral'));

        const options = (executeMistralRequest as jest.Mock).mock.calls[0][3] || {};
        expect(options.model).toBeUndefined();
        // Feste Version statt beweglicher Kennung — siehe tests/unit/model-pinning-governance.test.ts.
        // Diese Zeile ist als Bremsschwelle gedacht: Ein Modellwechsel MUSS hier auffallen.
        expect(MISTRAL_OCR_MODEL).toBe('mistral-ocr-4-1');
    });

    it('schaltet bei eingeschaltetem Schalter auf Qwen um', async () => {
        await run(baseBody(true, 'mistral'));

        expect(executeOpenAIRequest).toHaveBeenCalled();
        expect(executeMistralRequest).not.toHaveBeenCalled();
    });

    it('bleibt ohne Angabe des Schalters bei Mistral', async () => {
        // Fehlt das Feld, darf die Route NICHT ins teure Modell rutschen.
        await run(baseBody(undefined, 'mistral'));

        expect(executeMistralRequest).toHaveBeenCalled();
        expect(executeOpenAIRequest).not.toHaveBeenCalled();
    });

    it('respektiert eine ausdrueckliche Anbieterwahl auch bei ausgeschaltetem Schalter', async () => {
        await run(baseBody(false, 'openai-compatible'));

        expect(executeOpenAIRequest).toHaveBeenCalled();
        expect(executeMistralRequest).not.toHaveBeenCalled();
    });

    it('laesst Ollama-Instanzen unberuehrt', async () => {
        await run(baseBody(true, 'ollama'));

        expect(executeOllamaRequest).toHaveBeenCalled();
        expect(executeMistralRequest).not.toHaveBeenCalled();
        expect(executeOpenAIRequest).not.toHaveBeenCalled();
    });
});
