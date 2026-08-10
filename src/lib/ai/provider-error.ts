/**
 * Fehlerübersetzung zwischen KI-Anbieter und Client
 * 🏮🛡️🏛️
 *
 * Bisher warf jeder Provider einen nackten `Error`, in dessen Text der
 * Upstream-Status nur noch als Zeichenkette steckte ("Mistral API Error: 401").
 * Die zehn KI-Routen versuchten daraus per `message.includes(...)` einen
 * HTTP-Code zu erraten — in fünf voneinander abweichenden Varianten. Alles,
 * was dieses Raster verfehlte, wurde zu einem 500.
 *
 * Praktische Folge: Ein abgelaufener oder budgetierter Anbieter-Schlüssel kam
 * beim Nutzer als "Interner Serverfehler" an und war von einem echten Absturz
 * nicht zu unterscheiden. Diese Datei macht den Status zu einem Feld statt zu
 * Prosa und übersetzt ihn an genau einer Stelle.
 *
 * 🛡️ Der Antworttext des Anbieters wird bewusst NICHT an den Client
 * durchgereicht: Er kann Modellnamen, Proxy-Interna oder Teile der Anfrage
 * enthalten. Der Client bekommt eine feste, fachliche Meldung; das Detail
 * landet über den Logger auf dem Server.
 */

import { logger } from '@/lib/logger';

/**
 * Fehler eines externen KI-Anbieters — mit erhaltenem Upstream-Status.
 */
export class AIProviderError extends Error {
    readonly provider: string;
    readonly upstreamStatus: number;
    /** Originaltext des Anbieters. Nur für den Server-Log, nie für den Client. */
    readonly upstreamDetail: string;

    constructor(provider: string, upstreamStatus: number, upstreamDetail: string = '') {
        super(`${provider} antwortete mit HTTP ${upstreamStatus}`);
        this.name = 'AIProviderError';
        this.provider = provider;
        this.upstreamStatus = upstreamStatus;
        this.upstreamDetail = upstreamDetail;
    }
}

export const isAIProviderError = (err: unknown): err is AIProviderError =>
    err instanceof AIProviderError;

/**
 * Fehlt der Schlüssel schon vor dem ersten Aufruf, ist das kein Anbieter-,
 * sondern ein Konfigurationsfehler der Instanz — und verdient eine andere
 * Meldung als ein abgelehnter Schlüssel.
 */
export class AIConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AIConfigError';
    }
}

const RATE_LIMIT_MESSAGE =
    'KI-Server überlastet. Bitte warten Sie ca. 30 Sekunden und versuchen es erneut.';

const AUTH_MESSAGE =
    'Der KI-Anbieter hat den Zugang abgelehnt. Der hinterlegte API-Schlüssel ist ungültig ' +
    'oder sein Kontingent ist aufgebraucht. Bitte den Administrator informieren.';

const REQUEST_REJECTED_MESSAGE =
    'Der KI-Anbieter hat die Anfrage abgelehnt — vermutlich ist das konfigurierte Modell ' +
    'dort nicht (mehr) verfügbar. Bitte den Administrator informieren.';

const UNREACHABLE_MESSAGE =
    'Der KI-Anbieter ist derzeit nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.';

/**
 * Übersetzt einen beliebigen Fehler aus der KI-Pipeline in eine HTTP-Antwort.
 *
 * Die Reihenfolge ist fachlich, nicht technisch sortiert: Was der Nutzer selbst
 * beeinflussen kann (Credits, Einwilligung), steht vor dem, was nur der
 * Administrator beheben kann (Schlüssel, Modell).
 *
 * 🏮 Anbieter-Auth-Fehler werden zu **502**, niemals zu 401. Ein 401 aus einer
 * Koreki-Route bedeutet "Sitzung abgelaufen" und löst in `apiClient.fetch`
 * einen automatischen Wiederholungsversuch aus — bei einer Korrektur also einen
 * zweiten, kostenpflichtigen KI-Aufruf ins Leere.
 */
export function resolveAiHttpError(
    err: unknown,
    fallbackMessage: string
): { status: number; message: string } {
    const rawMessage = err instanceof Error ? err.message : String(err ?? '');

    // 1. Nutzerseitig behebbar: Guthaben und Einwilligung.
    if (rawMessage.includes('Credits')) {
        return { status: 402, message: rawMessage };
    }
    if (rawMessage.includes('Compliance') || rawMessage.includes('AVV')) {
        return { status: 403, message: rawMessage };
    }

    // 2. Instanz ohne konfigurierten KI-Zugang.
    if (err instanceof AIConfigError) {
        return { status: 503, message: rawMessage };
    }

    // 3. Anbieter hat geantwortet — der Status ist erhalten geblieben.
    if (isAIProviderError(err)) {
        logger.error('[AI] Upstream-Fehler vom KI-Anbieter', {
            provider: err.provider,
            upstreamStatus: err.upstreamStatus,
            upstreamDetail: err.upstreamDetail
        });

        const status = err.upstreamStatus;
        if (status === 401 || status === 403 || status === 402) {
            return { status: 502, message: AUTH_MESSAGE };
        }
        if (status === 429) {
            return { status: 429, message: RATE_LIMIT_MESSAGE };
        }
        if (status === 400 || status === 404 || status === 422) {
            return { status: 502, message: REQUEST_REJECTED_MESSAGE };
        }
        return { status: 502, message: UNREACHABLE_MESSAGE };
    }

    // 4. Rückfall für Fehler, die den Status weiterhin nur im Text tragen
    //    (Desktop-Proxy, Ollama-Verbindungsabbrüche, fremde Bibliotheken).
    if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('rate limit')) {
        return { status: 429, message: RATE_LIMIT_MESSAGE };
    }

    return { status: 500, message: rawMessage || fallbackMessage };
}
