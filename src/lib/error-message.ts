/**
 * Fehlertext aus einem gefangenen Wert.
 * 🧾
 *
 * `catch (err: any)` stand 67-mal in 43 Dateien — jedes Mal, um an
 * `err.message` zu kommen. Das `any` schaltet dabei die Pruefung fuer den
 * gesamten Block ab, nicht nur fuer diesen einen Zugriff.
 *
 * Die richtige Form (`err instanceof Error ? err.message : String(err)`) stand
 * bereits dreimal ausgeschrieben im Projekt — in audit-service,
 * auth-keycloak-server und local-vault. Sie liegt jetzt an einer Stelle.
 *
 * Geworfen werden kann in JavaScript alles: ein String, ein Objekt aus einer
 * fremden Bibliothek, `undefined`. Deshalb `unknown` als Eingabe und eine
 * Fallunterscheidung statt eines Zugriffs auf gut Glueck.
 */
export function toErrorMessage(err: unknown, fallback = 'Unbekannter Fehler'): string {
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === 'string') return err || fallback;

    // Fremde Bibliotheken werfen gelegentlich Objekte mit `message`, ohne von
    // Error abzuleiten — etwa ueber Prozessgrenzen serialisierte Fehler.
    if (err && typeof err === 'object' && 'message' in err) {
        const message = (err as { message: unknown }).message;
        if (typeof message === 'string' && message) return message;
    }

    if (err === undefined || err === null) return fallback;

    // `String({})` ergibt "[object Object]" — als Meldung im Bildschirm sagt das
    // dem Lehrer weniger als der Rueckfalltext des Aufrufers.
    const text = String(err);
    return text === '[object Object]' ? fallback : text;
}

/**
 * Wurde die Anfrage abgebrochen?
 *
 * `AbortController` meldet den Abbruch als Fehler — die Pipeline muss ihn vom
 * echten Fehlschlag trennen, sonst faerbt ein vom Nutzer gestoppter Lauf alle
 * Dateien rot. Geprueft wird der `name`, nicht der Typ: je nach Umgebung kommt
 * eine `DOMException` oder ein `Error`.
 */
export function isAbortError(err: unknown): boolean {
    return !!err && typeof err === 'object' && 'name' in err
        && (err as { name: unknown }).name === 'AbortError';
}

/**
 * Hat der KI-Anbieter wegen Ueberlastung abgewiesen?
 *
 * Die Anbieter melden das uneinheitlich: HTTP 429, der Klartext "rate limit"
 * oder — bei Mistral auf Deutsch — "ueberlastet". Die Abfrage stand dreimal
 * wortgleich in den Verarbeitungs-Hooks; sie gehoert an eine Stelle, sonst
 * kennt beim naechsten Anbieter nur eine der drei Kopien dessen Wortlaut.
 *
 * Der Unterschied ist fuer den Nutzer wesentlich: bei Ueberlastung hilft
 * Warten, bei jedem anderen Fehler nicht.
 */
export function isRateLimitError(err: unknown): boolean {
    const message = toErrorMessage(err).toLowerCase();
    return message.includes('429') || message.includes('rate limit') || message.includes('überlastet');
}

/**
 * Fehlercode einer Bibliothek, sofern vorhanden.
 *
 * Prisma meldet Verletzungen der Eindeutigkeit als `P2002`, Logto abgelaufene
 * Sitzungen als `sign_in_session.not_found`. Beide haengen den Code an den
 * Fehler, ohne dass ein gemeinsamer Typ existiert.
 */
export function toErrorCode(err: unknown): string | undefined {
    if (!err || typeof err !== 'object' || !('code' in err)) return undefined;
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
}
