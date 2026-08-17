import { logger } from './logger';
import { isSameName } from './services/profile-naming';
import { toErrorMessage } from './error-message';

/**
 * Local Vault Utilities (Desktop Persistence)
 * 🏮🛡️
 *
 * Das Gegenstück zu `services/json-vault.ts` für den Desktop-Modus: Dort
 * existieren keine API-Routen (`output: 'export'`), die Hooks schreiben direkt
 * in den `localStorage` der Tauri-Webview.
 *
 * Damit gilt dort dasselbe Risiko wie zuvor serverseitig: Ein beschädigter
 * Eintrag wurde still als leer behandelt, und der nächste Speichervorgang
 * schrieb diesen leeren Zustand dauerhaft fest.
 */

/**
 * Legt einen unlesbaren Eintrag beiseite, statt ihn überschreiben zu lassen.
 * Schlägt auch das fehl (etwa bei erschöpftem Speicherkontingent), wird der
 * Originaleintrag NICHT angetastet — der Aufrufer erfährt es über den
 * Rückgabewert.
 */
function quarantineCorruptEntry(key: string, raw: string, reason: string): boolean {
    const quarantineKey = `${key}.corrupt-${Date.now()}`;

    try {
        window.localStorage.setItem(quarantineKey, raw);
        window.localStorage.removeItem(key);
        logger.security('[LocalVault] Beschädigter Eintrag in Quarantäne verschoben', { quarantineKey, reason });
        return true;
    } catch (err) {
        const message = toErrorMessage(err);
        logger.error('[LocalVault] Quarantäne fehlgeschlagen', { key, message });
        return false;
    }
}

type ReadMode = 'read' | 'update';

function readParsed<T>(key: string, mode: ReadMode): T | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(key);
    if (!raw || raw.trim().length === 0) return null;

    try {
        return JSON.parse(raw) as T;
    } catch (err) {
        const reason = toErrorMessage(err);
        const quarantined = quarantineCorruptEntry(key, raw, reason);

        if (!quarantined && mode === 'update') {
            throw new Error(
                'Die lokal gespeicherten Daten sind beschädigt und konnten nicht gesichert werden. ' +
                'Zum Schutz vor Datenverlust wurde der Speichervorgang abgebrochen.'
            );
        }

        return null;
    }
}

/** Lesezugriff: quarantäniert nach Möglichkeit, wirft aber nie. */
export function readLocalArray<T>(key: string): T[] {
    const parsed = readParsed<unknown>(key, 'read');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/** Lesezugriff vor einem Schreibvorgang (Read-Modify-Write). */
export function readLocalArrayForUpdate<T>(key: string): T[] {
    const parsed = readParsed<unknown>(key, 'update');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/** Schreibt einen Eintrag zurück. */
export function writeLocalArray(key: string, data: unknown[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Sucht einen fremden Eintrag gleichen Namens — Gegenstück zu `assertNameIsFree`
 * in local-profile-service.ts für die Desktop-App, die keine API-Routen kennt.
 *
 * 🏮 Gespeichert und ausgewählt wird über den NAMEN. Zwei gleichnamige Profile
 * sind danach ununterscheidbar: Bearbeitungen landen stets beim ersten Treffer,
 * der zweite Eintrag bleibt als Karteileiche in der Liste stehen.
 */
export function findNameCollision<T extends { id?: string; name?: string }>(
    entries: T[],
    id: string,
    newName: string
): T | undefined {
    return entries.find(e => e?.id !== id && isSameName(e?.name, newName));
}
