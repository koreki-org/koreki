import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from './constants';
import { AIConfigError } from './provider-error';

/**
 * Aufloesung der OpenAI-kompatiblen Anbieter-Verbindung.
 * 🏮🛡️
 *
 * Diese Fallback-Kette stand vorher wortgleich an zwoelf Stellen. Das war nicht
 * nur Wartungsaufwand: die Duplikation WAR die kritische Sicherheitsluecke.
 * Weil `settings.openaiUrl` an zwoelf Stellen ungeprueft vor den Env-Wert
 * gezogen wurde, musste auch der Fix zwoelfmal angefasst werden — und eine
 * einzige uebersehene Kopie haette gereicht, um den Server-Schluessel weiter an
 * fremde Adressen auszuliefern.
 *
 * Die Verbindung wird deshalb an genau einer Stelle aufgeloest. Wer die Kette
 * aendern will, aendert sie hier — und nur hier.
 *
 * WICHTIG: Diese Funktionen loesen die SERVERSEITIGE Verbindung auf, inklusive
 * Env-Fallback. Der Client-seitige PURE-Pfad (Browser, eigener Schluessel des
 * Nutzers) nutzt sie bewusst NICHT — dort gibt es keinen Env-Fallback, und ein
 * fehlender Schluessel ist ein anderer Fehlerfall.
 *
 * Vorgelagert gilt weiterhin `sanitizeClientAiSettings`: im SaaS und in
 * Community Multi-User ist `settings.openaiUrl` zu diesem Zeitpunkt bereits
 * entfernt, sodass die Kette dort zwangslaeufig auf die Env faellt.
 */

/** Modell, wenn weder Einstellungen noch Env eines vorgeben. */
export const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'Qwen3.6-35B-A3B-FP8';

/** Nur die Felder, die fuer die Verbindung zaehlen. */
export interface OpenAiConnectionSettings {
    openaiUrl?: string;
    openaiKey?: string;
    openaiModel?: string;
}

export interface OpenAiConnection {
    baseUrl: string;
    apiKey?: string;
    model: string;
}

/** Verbindung mit gesichertem Schluessel — Ergebnis von `requireOpenAiConnection`. */
export interface VerifiedOpenAiConnection extends OpenAiConnection {
    apiKey: string;
}

/**
 * Loest Adresse, Schluessel und Modell auf, ohne einen fehlenden Schluessel zu
 * beanstanden. Fuer die wenigen Stellen, die einen fehlenden Schluessel als
 * regulaeren Fall behandeln (optionaler Verfeinerungsschritt statt Abbruch).
 */
export function resolveOpenAiConnection(
    settings?: OpenAiConnectionSettings | null
): OpenAiConnection {
    return {
        baseUrl:
            settings?.openaiUrl ||
            process.env.OPENAI_API_BASE ||
            process.env.OPENAI_API_URL ||
            DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
        apiKey:
            settings?.openaiKey ||
            process.env.OPENAI_API_KEY ||
            process.env.MITTWALD_API_KEY,
        model:
            settings?.openaiModel ||
            process.env.OPENAI_API_MODEL ||
            process.env.OPENAI_MODEL ||
            DEFAULT_OPENAI_COMPATIBLE_MODEL
    };
}

/**
 * Wie `resolveOpenAiConnection`, bricht aber ab, wenn kein Schluessel
 * vorliegt — der Regelfall fuer jede Route, die ohne Anbieter nichts liefern
 * kann.
 *
 * Der Fehler ist bewusst ein `AIConfigError` (→ HTTP 503, "Instanz ohne
 * konfigurierten KI-Zugang"). Zwei der urspruenglichen Fundstellen warfen einen
 * nackten `Error` und landeten damit auf 500, also ununterscheidbar von einem
 * echten Absturz. Das war eine Unstimmigkeit, keine Absicht.
 */
export function requireOpenAiConnection(
    settings?: OpenAiConnectionSettings | null
): VerifiedOpenAiConnection {
    const connection = resolveOpenAiConnection(settings);

    if (!connection.apiKey) {
        throw new AIConfigError('Mittwald/OpenAI API-Key fehlt.');
    }

    return connection as VerifiedOpenAiConnection;
}
