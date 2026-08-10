import { isLocalInstance } from '../env-context';
import { logger } from '../logger';

/**
 * Anbieter-ADRESSEN, die ausschliesslich lokale Instanzen (Desktop / Community)
 * selbst bestimmen duerfen.
 *
 * Der Angriff haengt allein an der Adresse: setzt ein angemeldeter Nutzer eine
 * fremde `openaiUrl` und laesst den Schluessel weg, greift serverseitig der
 * Fallback auf OPENAI_API_KEY / MITTWALD_API_KEY — der produktive Server-
 * Schluessel geht dann als Bearer-Header an die fremde Adresse. Dieselbe Stelle
 * erlaubt Requests gegen interne Adressen (SSRF).
 *
 * Bewusst NICHT gefiltert werden:
 * - `provider`: die Wahl zwischen Mistral-OCR und Vision-Pfad ist die
 *   Schalterstellung "Hohe Genauigkeit" und eine legitime Nutzerentscheidung.
 * - `openaiKey` / `mistralKey`: eigene Schluessel sind das BYOK-Merkmal des
 *   PURE-Modus. Gegen die feste Server-Adresse gerichtet sind sie harmlos —
 *   sie kosten den Nutzer sein eigenes Kontingent, nicht unseres.
 */
const LOCAL_ONLY_CONNECTION_FIELDS = [
    'openaiUrl',
    'ollamaUrl'
] as const;

/**
 * Entfernt client-gelieferte Anbieter-Verbindungsdaten, sofern die Instanz
 * nicht lokal ist. Muss in JEDER API-Route aufgerufen werden, die `settings`
 * aus dem Request an einen Provider weiterreicht — direkt nach der
 * Zod-Validierung, damit alle nachgelagerten Aufrufe die bereinigte Fassung
 * sehen. Der Audit-Test in tests/unit/security-audit.test.ts erzwingt das.
 */
export function sanitizeClientAiSettings<T>(settings: T, endpoint?: string): T {
    if (!settings || typeof settings !== 'object' || isLocalInstance()) return settings;

    const source = settings as Record<string, unknown>;
    const stripped = LOCAL_ONLY_CONNECTION_FIELDS.filter(field => source[field] !== undefined);
    if (stripped.length === 0) return settings;

    const sanitized: Record<string, unknown> = { ...source };
    stripped.forEach(field => delete sanitized[field]);

    logger.security('Client-gelieferte Anbieter-Verbindungsdaten im SaaS verworfen', {
        endpoint: endpoint || 'unbekannt',
        fields: stripped.join(', ')
    });

    return sanitized as T;
}
