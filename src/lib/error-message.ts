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

    return err === undefined || err === null ? fallback : String(err);
}
