import { istAbrechenbar } from '../../../src/lib/ai/billing-gate';
import * as envContext from '../../../src/lib/env-context';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/env-context', () => ({
    ...jest.requireActual('../../../src/lib/env-context'),
    isLocalInstance: jest.fn()
}));

const mockLokal = envContext.isLocalInstance as jest.Mock;

/**
 * Wann eine PURE-Anfrage Guthaben kostet (Layer 1)
 * 💳⚖️
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. Die Regel stand an zwei Aufrufstellen mit
 * ZWEI VERSCHIEDENEN Bedingungen: Der `ai-orchestrator` nahm Ollama aus, der
 * `ocr-orchestrator` nicht. Wer im PURE-Modus ein lokales Ollama betrieb,
 * zahlte für OCR-Seiten — für Korrekturen nicht. Der Kommentar an der ersten
 * Stelle nannte "OLLAMA MODE" ausdrücklich als abrechnungsfrei; die zweite
 * Stelle hatte davon nie erfahren.
 *
 * Die Bedingung steht jetzt einmal in `billing-gate.ts`. Das ist bewusst die
 * stärkere Lösung als ein Wächter: Was nur an einer Stelle existiert, kann
 * nicht auseinanderlaufen.
 */

const mit = (provider?: string): AppSettings => ({ provider } as unknown as AppSettings);

describe('istAbrechenbar', () => {
    describe('auf einer abrechnenden Instanz (SaaS)', () => {
        beforeEach(() => mockLokal.mockReturnValue(false));

        it('rechnet einen fremden Anbieter ab', () => {
            expect(istAbrechenbar(mit('mistral'))).toBe(true);
            expect(istAbrechenbar(mit('openai-compatible'))).toBe(true);
        });

        /** DER BEFUND: Das Modell läuft auf der Maschine der Lehrkraft. */
        it('rechnet ein lokales Ollama NICHT ab', () => {
            expect(istAbrechenbar(mit('ollama'))).toBe(false);
        });

        /** Ohne gesetzten Anbieter greift der Mistral-Rückfall — der kostet. */
        it('rechnet ohne gesetzten Anbieter ab', () => {
            expect(istAbrechenbar(mit(undefined))).toBe(true);
            expect(istAbrechenbar(undefined)).toBe(true);
        });
    });

    describe('auf einer lokalen Instanz (Desktop/Community)', () => {
        beforeEach(() => mockLokal.mockReturnValue(true));

        it('rechnet gar nichts ab', () => {
            ['mistral', 'openai-compatible', 'ollama', undefined].forEach(p => {
                expect(istAbrechenbar(mit(p))).toBe(false);
            });
        });
    });
});
