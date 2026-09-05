import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { UnifiedAiConfig } from '../../../src/components/settings/UnifiedAiConfig';
import { AppSettings } from '../../../src/types';
import { getKorekiMode, isSingleUserInstance } from '@/lib/env-context';

// Mock dependencies
jest.mock('@/lib/env-context', () => ({
    getKorekiMode: jest.fn(() => 'community'),
    isDesktopTarget: jest.fn(() => false),
    isSingleUserInstance: jest.fn(() => false)
}));

const alsEinzelbenutzer = (ja: boolean) => (isSingleUserInstance as jest.Mock).mockReturnValue(ja);
const alsCommunity = () => (getKorekiMode as jest.Mock).mockReturnValue('community');

describe('UnifiedAiConfig (Layer 2 Integration)', () => {
    const mockSettings: Partial<AppSettings> = {
        provider: 'ollama',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'gemma4:31b'
    };

    const mockOnSave = jest.fn();

    beforeEach(() => {
        alsCommunity();
        alsEinzelbenutzer(false);
    });

    it('should render the provider selection tabs', () => {
        render(<UnifiedAiConfig settings={mockSettings} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(screen.getByText('Mistral API')).toBeDefined();
        expect(screen.getByText('Ollama Lokal')).toBeDefined();
        expect(screen.getByText('OpenAI Kompatibel')).toBeDefined();
    });

    it('should show the Ollama configuration by default (as per mockSettings)', () => {
        render(<UnifiedAiConfig settings={mockSettings} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(screen.getByLabelText(/Ollama Adresse/i)).toBeDefined();
        expect(screen.getByText('Verbindung prüfen')).toBeDefined();
    });

    /**
     * GEAENDERT AM 05.09.2026. Der Titel sagte nur "in community mode" — die Aussage
     * gilt aber allein fuer den MEHRBENUTZER-Betrieb. Im Einzelbenutzer-Betrieb ist das
     * Gegenteil richtig (siehe unten): Dort gibt es keine Administration, die zentral
     * konfiguriert.
     */
    it('verbirgt die eigene Mistral-Konfiguration im Community-Mehrbenutzerbetrieb', () => {
        const mistralSettings = { ...mockSettings, provider: 'mistral' as const };
        render(<UnifiedAiConfig settings={mistralSettings} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(screen.queryByLabelText(/Mistral API Key/i)).toBeNull();
        expect(screen.getByText('System-Standard aktiv')).toBeDefined();
    });
});

/**
 * ANLASS (05.09.2026). Beide Cloud-Panels blendeten ihre Eingabefelder in JEDER
 * Community-Instanz aus, mit dem Hinweis, das Institut konfiguriere zentral. Fuer den
 * Mehrbenutzer-Betrieb ist das richtig; im Einzelbenutzer-Betrieb gibt es niemanden
 * sonst, und die eigene Konfiguration war dadurch unerreichbar.
 *
 * Geprueft wird beides und fuer BEIDE Anbieter — die wiederkehrende Fehlerklasse dieses
 * Projekts ist die Regel, die in einer Familie gilt und in der Schwester fehlt.
 */
describe('Community: Einzelbenutzer- gegen Mehrbenutzerbetrieb', () => {
    const mockOnSave = jest.fn();
    const basis: Partial<AppSettings> = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:31b' };

    beforeEach(alsCommunity);

    const faelle = [
        { anbieter: 'mistral' as const, kasten: 'System-Standard aktiv', feld: /Mistral API Key/i },
        { anbieter: 'openai-compatible' as const, kasten: 'Mittwald AI API aktiv', feld: /^Modell$/i }
    ];

    describe.each(faelle)('$anbieter', ({ anbieter, kasten, feld }) => {
        it('zeigt im Einzelbenutzerbetrieb die eigene Konfiguration', () => {
            alsEinzelbenutzer(true);
            render(<UnifiedAiConfig settings={{ ...basis, provider: anbieter }} onSave={mockOnSave} mode="USER_SETUP" />);

            expect(screen.queryByText(kasten)).toBeNull();
            expect(screen.getByLabelText(feld)).toBeDefined();
        });

        it('verweist im Mehrbenutzerbetrieb weiter auf die Administration', () => {
            alsEinzelbenutzer(false);
            render(<UnifiedAiConfig settings={{ ...basis, provider: anbieter }} onSave={mockOnSave} mode="USER_SETUP" />);

            expect(screen.getByText(kasten)).toBeDefined();
            expect(screen.queryByLabelText(feld)).toBeNull();
        });
    });

    /**
     * Der Satz ueber die "direkte Browser-Verbindung" und der CORS-Hinweis auf
     * koreki.org gelten fuer den Pure-Modus, wo der Browser selbst beim Anbieter
     * anfragt. Auf einer selbst betriebenen Instanz waeren beide schlicht falsch.
     */
    it('erklaert den eigenen Betrieb nicht mit dem Pure-Modus', () => {
        alsEinzelbenutzer(true);
        render(<UnifiedAiConfig settings={{ ...basis, provider: 'mistral' }} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(screen.queryByText(/Pure Mode/i)).toBeNull();
        expect(screen.queryByText(/koreki\.org/i)).toBeNull();
    });
});

/**
 * ANLASS (05.09.2026). Im Anbieter-Panel stand ein zweiter "Deep Reasoning"-Schalter,
 * gespeist aus demselben Feld wie der im KI-Intelligenz-Modal — nur las die Kopie ein
 * ungesetztes Feld als AUS und das Original als AN. Er ist entfallen; die Bedienung hat
 * genau einen Ort. Siehe `tests/unit/ai/denkschritt-standard.test.ts`.
 */
describe('Deep Reasoning', () => {
    const mockOnSave = jest.fn();
    const basis: Partial<AppSettings> = {
        provider: 'openai-compatible' as const,
        openaiUrl: 'https://llm.aihosting.mittwald.de/v1',
        openaiModel: 'Qwen3.6-35B-A3B-FP8'
    };

    beforeEach(() => {
        alsCommunity();
        alsEinzelbenutzer(true);
    });

    it('wird im Anbieter-Panel nicht ein zweites Mal angeboten', () => {
        render(<UnifiedAiConfig settings={basis} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(screen.queryByText('Deep Reasoning')).toBeNull();
    });

    /** Die eigentliche Konfiguration muss dabei stehen bleiben. */
    it('laesst Adresse, Schlüssel und Modell unberührt', () => {
        render(<UnifiedAiConfig settings={basis} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(screen.getByLabelText(/Base URL/i)).toBeDefined();
        expect(screen.getByLabelText(/^Modell$/i)).toBeDefined();
    });
});

/**
 * ANLASS (05.09.2026). Gemessen ist genau eine Kombination — Qwen 3.6 ueber lokales
 * Ollama (Anhang IV §4.6 der technischen Dokumentation). In der Oberflaeche stand davon
 * nichts: Wer Gemma waehlte, bekam dieselbe Darstellung wie im gemessenen Fall.
 */
describe('Kennzeichnung ungepruefter Konfigurationen', () => {
    const mockOnSave = jest.fn();
    const basis: Partial<AppSettings> = { provider: 'ollama', ollamaUrl: 'http://localhost:11434' };

    beforeEach(() => {
        alsCommunity();
        alsEinzelbenutzer(false);
    });

    const kachel = (name: string) => screen.getByText(name).closest('button') as HTMLElement;

    it('kennzeichnet die beiden Cloud-Anbieter, nicht aber Ollama', () => {
        render(<UnifiedAiConfig settings={{ ...basis, ollamaModel: 'qwen3.6:35b' }} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(within(kachel('Mistral API')).getByText('Experimentell')).toBeDefined();
        expect(within(kachel('OpenAI Kompatibel')).getByText('Experimentell')).toBeDefined();
        expect(within(kachel('Ollama Lokal')).queryByText('Experimentell')).toBeNull();
    });

    it('kennzeichnet in der Modell-Liste alles ausser Qwen 3.6', () => {
        render(<UnifiedAiConfig settings={{ ...basis, ollamaModel: 'qwen3.6:35b' }} onSave={mockOnSave} mode="USER_SETUP" />);

        expect(within(kachel('Qwen 3.6')).queryByText('Experimentell')).toBeNull();
        expect(within(kachel('Mistral Small 3.2')).getByText('Experimentell')).toBeDefined();
        expect(within(kachel('Gemma 31B')).getByText('Experimentell')).toBeDefined();
    });

    /**
     * Von Hand kann auch das gemessene Modell eingetragen werden. Stuende das
     * Kennzeichen fest auf der Karte, behauptete es dort das Gegenteil der Wahrheit.
     */
    it('richtet sich bei der eigenen Konfiguration nach dem eingetragenen Modell', () => {
        const karte = 'Eigene Modell-Konfiguration';

        const { unmount } = render(<UnifiedAiConfig settings={{ ...basis, ollamaModel: 'llama3:latest' }} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(within(kachel(karte)).getByText('Experimentell')).toBeDefined();
        unmount();

        render(<UnifiedAiConfig settings={{ ...basis, ollamaModel: 'qwen3.6:35b' }} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(within(kachel(karte)).queryByText('Experimentell')).toBeNull();
    });
});
