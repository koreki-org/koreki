/**
 * Verbindungsfehler zum KI-Server verstaendlich machen.
 * 🔌
 *
 * ANLASS (15.11.2026). Der KI-Server war nicht erreichbar, und die Lehrkraft las:
 * „Fehler bei Musterlösung: fetch failed". Node meldet jeden Netzfehler mit
 * diesem einen Satz; WARUM es scheiterte, steht nur in `err.cause` — und dort
 * warf Koreki es weg. Nachgestellt: `UND_ERR_CONNECT_TIMEOUT` nach 10 s, also
 * „keine Antwort beim Verbindungsaufbau". Das verlangt etwas ganz anderes
 * (Netz, VPN, Server an?) als „Verbindung abgelehnt" (Ollama laeuft nicht)
 * oder „Verbindung mitten in der Arbeit getrennt" (ausgelastet, neu gestartet).
 *
 * Gilt fuer alle Anbieter-Wege, die selbst `fetch` aufrufen: Ollama und
 * `fetchWithRetry` (OpenAI-kompatibel, Mistral). Ein Abbruch durch die
 * Lehrkraft (`AbortError`) ist kein Verbindungsfehler und bleibt, wie er ist.
 */

interface MitUrsache {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    cause?: unknown;
}

/** Der Fehlercode aus der Ursachenkette (`cause`), den Node bzw. undici setzt. */
function ursachenCode(err: unknown): string | undefined {
    let aktuell: unknown = err;
    for (let tiefe = 0; tiefe < 4 && aktuell && typeof aktuell === 'object'; tiefe++) {
        const { code, cause } = aktuell as MitUrsache;
        if (typeof code === 'string') return code;
        aktuell = cause;
    }
    return undefined;
}

/** Scheiterte schon die Verbindung, nicht erst die Antwort des Servers? */
export function istVerbindungsfehler(err: unknown): boolean {
    if (!(err instanceof Error) || err.name === 'AbortError') return false;
    return err.message === 'fetch failed' || err.message === 'Failed to fetch' || ursachenCode(err) !== undefined;
}

const GRUENDE: [string[], string][] = [
    [['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'],
        'Beim Verbindungsaufbau kam keine Antwort. Ist der Server eingeschaltet und das Netz verbunden (bei einem Schulserver von zu Hause: VPN)?'],
    [['ECONNREFUSED'],
        'Der Server lehnt die Verbindung ab. Läuft der KI-Dienst dort (bei Ollama: die Ollama-App)?'],
    [['ENOTFOUND', 'EAI_AGAIN'],
        'Die Adresse ist unbekannt. Prüfe sie in den Einstellungen.'],
    [['UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'],
        'Der Server hat 5 Minuten lang nicht geantwortet. Vermutlich ist er ausgelastet — versuche es später erneut.'],
    [['ECONNRESET', 'UND_ERR_SOCKET', 'UND_ERR_CLOSED', 'EPIPE'],
        'Der Server hat die Verbindung mitten in der Arbeit getrennt. Vermutlich ist er ausgelastet oder wurde neu gestartet — versuche es erneut.']
];

/** Rechner und Port aus der Adresse — der Pfad sagt der Lehrkraft nichts. */
function server(adresse: string): string {
    try {
        return new URL(adresse).host;
    } catch {
        return adresse;
    }
}

/**
 * Die Meldung fuer die Lehrkraft. Nennt den Server und den Grund; einen
 * unbekannten Grund mit seinem Code, damit man ihn melden kann.
 */
export function beschreibeVerbindungsfehler(err: unknown, adresse: string): string {
    const code = ursachenCode(err);
    const grund = GRUENDE.find(([codes]) => code !== undefined && codes.includes(code))?.[1]
        ?? `Bitte versuche es erneut.${code ? ` (Code: ${code})` : ''}`;
    return `Der KI-Server ${server(adresse)} ist nicht erreichbar. ${grund}`;
}

/** Ein Verbindungsfehler als lesbarer Fehler; alles andere unveraendert. */
export function alsVerbindungsfehler(err: unknown, adresse: string): unknown {
    if (!istVerbindungsfehler(err)) return err;
    // Die Ursache bleibt fuers Server-Protokoll erhalten.
    return Object.assign(new Error(beschreibeVerbindungsfehler(err, adresse)), { cause: err });
}

/** `fetch`, dessen Netzfehler die Lehrkraft lesen kann. */
export async function fetchMitVerbindungsfehler(url: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (err) {
        throw alsVerbindungsfehler(err, url);
    }
}
