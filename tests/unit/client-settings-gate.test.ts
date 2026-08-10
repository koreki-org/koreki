import { sanitizeClientAiSettings } from '../../src/lib/ai/client-settings-gate';
import { isKeycloakAuth, isLocalInstance } from '../../src/lib/env-context';

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(),
    isKeycloakAuth: jest.fn()
}));

jest.mock('../../src/lib/logger', () => ({
    logger: { security: jest.fn() }
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

    beforeEach(() => jest.clearAllMocks());

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
