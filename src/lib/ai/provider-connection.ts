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

/**
 * Modell, wenn weder Einstellungen noch Env eines vorgeben.
 *
 * EINE Quelle (07.09.2026). Derselbe Wert stand zusaetzlich an vier Stellen als
 * Literal: im Platzhalter des Eingabefelds, in der SaaS-Auswahlkachel, im
 * OCR-Verteiler und im Anbieter selbst. Wer die Vorbelegung wechselt, muesste sonst
 * an fuenf Stellen daran denken — und die Oberflaeche zeigte ein anderes Modell an,
 * als der Anbieter tatsaechlich anspricht.
 *
 * Der Wert ist nicht beliebig: Die Kennzeichnung geprueft/experimentell haengt an
 * Anbieter UND Modell (`gepruefte-konfiguration.ts`). Eine Vorbelegung, die nicht
 * gemessen ist, darf nicht als geprueft erscheinen.
 */
export const DEFAULT_OPENAI_COMPATIBLE_MODEL = 'Qwen3.6-35B-A3B-FP8';

/**
 * KEINE Denktiefe als Vorgabe — das Modell entscheidet, wie bisher.
 *
 * GEMESSEN AM 07.09.2026 und wieder zurueckgenommen. `medium` war kurzzeitig gesetzt,
 * um einen Ausfall zu bekaempfen, bei dem sich `Qwen3.8-27B-NVFP4` in 13631 Zeichen
 * Denktext verrannte und ohne Antwort abschloss.
 *
 * Der volle Referenzsatz sagt dazu deutlich Nein:
 *
 * | Einstellung | mittlere Abweichung |
 * |---|---|
 * | ohne Angabe (Eigenverhalten) | **0,17 Punkte (4,2 %)** |
 * | `medium` | 0,88 Punkte (21,9 %) |
 *
 * Beide Schwellen der KI-Verordnung waren mit `medium` gerissen. Es kostet genau dort,
 * wo abgewogen werden muss: freier Text mit weiter Rubrik von 0,33 auf 2,00 Punkte,
 * Fachsprache von 0,25 auf 1,13. Bei Rechenaufgaben und engen Rubriken aendert sich
 * nichts.
 *
 * ZUR EINORDNUNG, damit niemand daraus "Denken schadet" liest: `medium` ist MEHR
 * Denken als das Eigenverhalten (1400 gegen 904 Zeichen im Vergleichsversuch), nicht
 * weniger. Und der Befund vom 24.08.2026, dass der Denkschritt hilft, betraf ein
 * ANDERES Modell — `qwen3.6:35b` mit 8 Bit gegen `Qwen3.8-27B-NVFP4` mit 4 Bit. Die
 * beiden Aussagen widersprechen sich nicht; sie handeln von verschiedenen Modellen.
 *
 * Der Schalter selbst bleibt: `AppSettings.reasoningEffort` reicht ihn bis zum
 * Anbieter durch. Ohne ihn haetten wir das nicht messen koennen.
 */
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
