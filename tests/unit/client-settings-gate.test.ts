import { sanitizeClientAiSettings } from '../../src/lib/ai/client-settings-gate';
import { isKeycloakAuth, isLocalInstance } from '../../src/lib/env-context';

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(),
    isKeycloakAuth: jest.fn()
}));

jest.mock('../../src/lib/logger', () => ({
    logger: { security: jest.fn(), error: jest.fn() }
}));

const mockAdminSettings = { getSettingsSync: jest.fn() };
jest.mock('../../src/lib/services/global-settings-service', () => ({
    GlobalSettingsService: {
        getSettingsSync: (...args: unknown[]) => mockAdminSettings.getSettingsSync(...args)
    }
}));

const mockIsLocalInstance = isLocalInstance as jest.Mock;
const mockIsKeycloakAuth = isKeycloakAuth as jest.Mock;

/**
 * Der Gate entscheidet, ob eine Instanz ihre Anbieter-Adresse selbst bestimmen
 * darf. Massgeblich ist nicht "lokal", sondern "Instanz und Nutzer sind
 * dieselbe Partei" — Community Multi-User erfuellt das nicht.
 */
describe('sanitizeClientAiSettings', () => {
    const clientSettings = {
        provider: 'openai-compatible',
        openaiUrl: 'https://angreifer.example/v1',
        ollamaUrl: 'http://169.254.169.254',
        openaiKey: 'sk-eigener-schluessel',
        mistralKey: 'eigener-mistral-schluessel',
        openaiModel: 'Qwen3.6-35B-A3B-FP8'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Standardfall: Der Administrator hat nichts hinterlegt.
        mockAdminSettings.getSettingsSync.mockReturnValue({});
    });

    describe('SaaS (nicht lokal)', () => {
        beforeEach(() => {
            mockIsLocalInstance.mockReturnValue(false);
            mockIsKeycloakAuth.mockReturnValue(false);
        });

        it('entfernt client-gelieferte Anbieter-Adressen', () => {
            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.openaiUrl).toBeUndefined();
            expect(result.ollamaUrl).toBeUndefined();
        });

        it('behaelt eigene Schluessel — BYOK ist das Merkmal des PURE-Modus', () => {
            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.openaiKey).toBe('sk-eigener-schluessel');
            expect(result.mistralKey).toBe('eigener-mistral-schluessel');
        });

        it('behaelt die Providerwahl — das ist der Schalter "Hohe Genauigkeit"', () => {
            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.provider).toBe('openai-compatible');
            expect(result.openaiModel).toBe('Qwen3.6-35B-A3B-FP8');
        });

        it('veraendert das uebergebene Objekt nicht', () => {
            sanitizeClientAiSettings(clientSettings);

            expect(clientSettings.openaiUrl).toBe('https://angreifer.example/v1');
        });
    });

    describe('Community Multi-User (Keycloak)', () => {
        beforeEach(() => {
            mockIsLocalInstance.mockReturnValue(true);
            mockIsKeycloakAuth.mockReturnValue(true);
        });

        it('entfernt Anbieter-Adressen, weil der Schluessel der Schule gehoert', () => {
            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.openaiUrl).toBeUndefined();
            expect(result.ollamaUrl).toBeUndefined();
        });

        /**
         * Entfernen allein reichte nicht (09.09.2026). Der Server hat die
         * Admin-Einstellungen nie selbst gelesen — sie kamen ueber den Browser
         * zurueck, und genau diesen Rueckweg kappt der Filter. Danach stand der
         * Server ohne Adresse da und jede Korrektur endete im 500.
         */
        it('setzt die Adresse ein, die der Administrator im Modal hinterlegt hat', () => {
            mockAdminSettings.getSettingsSync.mockReturnValue({
                ollamaUrl: 'http://host.docker.internal:11434',
                openaiUrl: 'https://sso-intern.example/v1'
            });

            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.ollamaUrl).toBe('http://host.docker.internal:11434');
            expect(result.openaiUrl).toBe('https://sso-intern.example/v1');
        });

        it('nimmt dabei die Adresse des Administrators, nie die des Clients', () => {
            mockAdminSettings.getSettingsSync.mockReturnValue({
                ollamaUrl: 'http://host.docker.internal:11434'
            });

            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            // Der Client hatte 169.254.169.254 geschickt — die Metadaten-Adresse
            // der Cloud-Instanz, also der klassische SSRF-Versuch.
            expect(result.ollamaUrl).not.toBe('http://169.254.169.254');
        });
    });

    describe('Desktop / Community Single-User', () => {
        beforeEach(() => {
            mockIsLocalInstance.mockReturnValue(true);
            mockIsKeycloakAuth.mockReturnValue(false);
        });

        it('laesst die Einstellungen unveraendert — die Instanz gehoert dem Nutzer', () => {
            const result = sanitizeClientAiSettings(clientSettings) as Record<string, unknown>;

            expect(result.openaiUrl).toBe('https://angreifer.example/v1');
            expect(result.ollamaUrl).toBe('http://169.254.169.254');
        });
    });

    it('kommt mit fehlenden Settings zurecht', () => {
        mockIsLocalInstance.mockReturnValue(false);
        mockIsKeycloakAuth.mockReturnValue(false);

        expect(sanitizeClientAiSettings(undefined)).toBeUndefined();
        expect(sanitizeClientAiSettings(null)).toBeNull();
    });
});
