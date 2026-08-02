import fs from 'fs';
import { logger } from '@/lib/logger';

/**
 * JSON Vault Utilities (Community & Desktop Persistence)
 * 🏮🛡️🏛️
 *
 * Die Community Edition speichert bewusst ohne Datenbank (siehe
 * docs/technical/community-edition-persistence.md). Die Haltbarkeitsgarantien,
 * die eine Datenbank mitbringen würde, müssen daher hier abgebildet werden.
 *
 * Dieses Modul kapselt genau das — damit die vier Local*Services sie nicht
 * jeweils einzeln (und unterschiedlich) implementieren.
 */

/**
 * Verschiebt eine unlesbare Datei zur Seite, statt sie beim nächsten
 * Schreibvorgang zu überschreiben.
 *
 * Wirft, wenn die Quarantäne selbst fehlschlägt: Der Aufrufer darf in diesem
 * Fall NICHT weiterschreiben, sonst wäre der Inhalt endgültig verloren.
 * Ein sichtbarer Fehler ist besser als stiller Datenverlust.
 */
function quarantineCorruptFile(storagePath: string, reason: string): boolean {
    const quarantinePath = `${storagePath}.corrupt-${Date.now()}`;

    try {
        fs.renameSync(storagePath, quarantinePath);
        logger.security('[JsonVault] Beschädigte Datei in Quarantäne verschoben', { quarantinePath, reason });
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[JsonVault] Quarantäne fehlgeschlagen', { storagePath, message });
        return false;
    }
}

type ReadMode = 'read' | 'update';

/**
 * Liest eine JSON-Datei. Ist der Inhalt unlesbar, wandert die Datei nach
 * `<datei>.corrupt-<zeitstempel>` und der Aufrufer erhält den Rückfallwert —
 * die alten Daten bleiben also wiederherstellbar.
 *
 * Zuvor wurde in diesem Fall stillschweigend mit einem leeren Datensatz
 * weitergearbeitet, den der nächste Speichervorgang dauerhaft festschrieb.
 *
 * Der Modus steuert, was passiert, wenn die Quarantäne selbst scheitert:
 * - `read`: nur protokollieren. Ein Lesezugriff zerstört nichts.
 * - `update`: werfen. Der Aufrufer würde anschließend schreiben und den
 *   beschädigten Inhalt damit endgültig überschreiben.
 */
function readJson<T>(storagePath: string, fallback: T, mode: ReadMode): T {
    if (!fs.existsSync(storagePath)) return fallback;

    let raw: string;
    try {
        raw = fs.readFileSync(storagePath, 'utf-8');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[JsonVault] Datei konnte nicht gelesen werden', { storagePath, message });
        if (mode === 'update') {
            throw new Error('Die gespeicherten Daten konnten nicht gelesen werden. Der Schreibvorgang wurde zum Schutz vor Datenverlust abgebrochen.');
        }
        return fallback;
    }

    // Eine leere Datei ist kein Korruptionsfall (z. B. gerade erst angelegt).
    if (raw.trim().length === 0) return fallback;

    try {
        return JSON.parse(raw) as T;
    } catch (err) {
        const quarantined = quarantineCorruptFile(storagePath, err instanceof Error ? err.message : String(err));

        if (!quarantined && mode === 'update') {
            throw new Error(
                'Die gespeicherten Daten sind beschädigt und konnten nicht gesichert werden. ' +
                'Zum Schutz vor Datenverlust wurde der Schreibvorgang abgebrochen.'
            );
        }

        return fallback;
    }
}

/** Lesezugriff: quarantäniert nach Möglichkeit, wirft aber nie. */
export function readJsonArray<T>(storagePath: string): T[] {
    const parsed = readJson<unknown>(storagePath, [], 'read');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/** Lesezugriff vor einem Schreibvorgang (Read-Modify-Write). */
export function readJsonArrayForUpdate<T>(storagePath: string): T[] {
    const parsed = readJson<unknown>(storagePath, [], 'update');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/** Objekt-Variante für die globalen Einstellungen. */
export function readJsonObject<T extends object>(storagePath: string, mode: ReadMode = 'read'): T | null {
    const parsed = readJson<unknown>(storagePath, null, mode);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
}

const writeQueues = new Map<string, Promise<unknown>>();

/**
 * Serialisiert Read-Modify-Write-Zyklen auf dieselbe Datei.
 *
 * Ohne das gewinnt bei zwei fast gleichzeitigen Speichervorgängen der zuletzt
 * schreibende vollständig — die andere Änderung verschwindet kommentarlos.
 * Betrifft vor allem `global_ai_settings.json`, die einzige von mehreren
 * Personen beschriebene Datei.
 *
 * Prozessintern und damit passend zur dokumentierten Topologie (ein Container).
 * Mehrere Instanzen auf demselben Volume wären ohnehin nicht unterstützt und
 * bräuchten ein echtes Dateilock.
 */
export function withFileMutex<T>(storagePath: string, task: () => T | Promise<T>): Promise<T> {
    const previous = writeQueues.get(storagePath) ?? Promise.resolve();

    // Der Nachfolger läuft unabhängig davon, ob der Vorgänger erfolgreich war.
    const result = previous.then(() => task(), () => task());

    const settled: Promise<unknown> = result
        .then(() => undefined, () => undefined)
        .then(() => {
            if (writeQueues.get(storagePath) === settled) {
                writeQueues.delete(storagePath);
            }
        });

    writeQueues.set(storagePath, settled);
    return result;
}
