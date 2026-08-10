import {
    AIConfigError,
    AIProviderError,
    isAIProviderError,
    resolveAiHttpError
} from '../../src/lib/ai/provider-error';

jest.mock('../../src/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), security: jest.fn() }
}));

describe('resolveAiHttpError', () => {
    describe('Anbieter-Fehler behalten ihren Status', () => {
        // Der Kern der Regression: Ein abgelehnter Schlüssel kam als 500 an und war
        // damit von einem echten Absturz nicht zu unterscheiden.
        it.each([401, 403, 402])('uebersetzt Upstream-%i in 502 mit Zugangs-Hinweis', (upstream) => {
            const { status, message } = resolveAiHttpError(
                new AIProviderError('Mittwald', upstream, 'Authentication error.'),
                'Fallback'
            );
            expect(status).toBe(502);
            expect(message).toContain('Zugang abgelehnt');
            expect(message).toContain('Kontingent');
        });

        it('gibt niemals 401 zurueck — das loest im apiClient einen teuren Retry aus', () => {
            const statuses = [400, 401, 402, 403, 404, 422, 429, 500, 502, 503];
            for (const upstream of statuses) {
                const { status } = resolveAiHttpError(
                    new AIProviderError('Mittwald', upstream, ''),
                    'Fallback'
                );
                expect(status).not.toBe(401);
            }
        });

        it('reicht 429 als 429 durch', () => {
            const { status, message } = resolveAiHttpError(
                new AIProviderError('Mistral', 429, 'rate limited'),
                'Fallback'
            );
            expect(status).toBe(429);
            expect(message).toContain('überlastet');
        });

        it.each([400, 404, 422])('meldet Upstream-%i als abgelehnte Anfrage', (upstream) => {
            const { status, message } = resolveAiHttpError(
                new AIProviderError('Mittwald', upstream, 'model not found'),
                'Fallback'
            );
            expect(status).toBe(502);
            expect(message).toContain('Modell');
        });

        it('meldet Upstream-5xx als nicht erreichbar', () => {
            const { status, message } = resolveAiHttpError(
                new AIProviderError('Ollama', 503, ''),
                'Fallback'
            );
            expect(status).toBe(502);
            expect(message).toContain('nicht erreichbar');
        });
    });

    describe('Der Antworttext des Anbieters bleibt auf dem Server', () => {
        it('reicht das Upstream-Detail nicht an den Client durch', () => {
            const detail = 'Bearer sk-cmJrGEHEIM im Request-Header abgelehnt';
            const { message } = resolveAiHttpError(
                new AIProviderError('Mittwald', 401, detail),
                'Fallback'
            );
            expect(message).not.toContain('sk-cmJr');
            expect(message).not.toContain(detail);
        });
    });

    describe('Nutzerseitige Faelle behalten Vorrang', () => {
        it('meldet fehlende Credits als 402 mit Originaltext', () => {
            const { status, message } = resolveAiHttpError(
                new Error('Nicht genügend Credits vorhanden.'),
                'Fallback'
            );
            expect(status).toBe(402);
            expect(message).toBe('Nicht genügend Credits vorhanden.');
        });

        it('meldet fehlende AVV-Zustimmung als 403', () => {
            const { status } = resolveAiHttpError(new Error('AVV nicht akzeptiert'), 'Fallback');
            expect(status).toBe(403);
        });

        it('stellt Credits ueber einen gleichzeitigen Anbieter-Fehler', () => {
            // Billing wirft, bevor der Anbieter überhaupt gefragt wird — die
            // fachliche Meldung darf nicht von einem 502 verdeckt werden.
            const err = new AIProviderError('Mittwald', 401, '');
            (err as unknown as { message: string }).message = 'Nicht genügend Credits';
            expect(resolveAiHttpError(err, 'Fallback').status).toBe(402);
        });
    });

    describe('Konfigurations- und Rueckfallpfade', () => {
        it('meldet einen fehlenden Schluessel als 503', () => {
            const { status, message } = resolveAiHttpError(
                new AIConfigError('Mittwald/OpenAI API-Key fehlt.'),
                'Fallback'
            );
            expect(status).toBe(503);
            expect(message).toBe('Mittwald/OpenAI API-Key fehlt.');
        });

        it('erkennt ein Rate-Limit weiterhin am Text (Desktop-Proxy ohne Status)', () => {
            const { status } = resolveAiHttpError(
                new Error('Desktop Proxy Fehler: rate limit exceeded'),
                'Fallback'
            );
            expect(status).toBe(429);
        });

        it('faellt fuer unbekannte Fehler auf 500 zurueck', () => {
            expect(resolveAiHttpError(new Error('Kaputt'), 'Fallback')).toEqual({
                status: 500,
                message: 'Kaputt'
            });
        });

        it('nutzt die Fallback-Meldung, wenn der Fehler keinen Text traegt', () => {
            expect(resolveAiHttpError(new Error(''), 'Fallback-Meldung')).toEqual({
                status: 500,
                message: 'Fallback-Meldung'
            });
        });
    });
});

describe('AIProviderError', () => {
    it('bewahrt Anbieter, Status und Detail fuer den Server-Log', () => {
        const err = new AIProviderError('Mittwald', 401, 'Authentication error.');
        expect(isAIProviderError(err)).toBe(true);
        expect(err.provider).toBe('Mittwald');
        expect(err.upstreamStatus).toBe(401);
        expect(err.upstreamDetail).toBe('Authentication error.');
    });

    it('erkennt fremde Fehler nicht faelschlich als Anbieter-Fehler', () => {
        expect(isAIProviderError(new Error('irgendwas'))).toBe(false);
        expect(isAIProviderError(null)).toBe(false);
    });
});
