import { logger } from './logger';
import { toErrorMessage } from './error-message';

/**
 * Freigegebene Koreki-Version aus dem Update-Kanal.
 *
 * Dieselbe Quelle wie die Desktop-App (src-tauri/tauri.conf.json) und der
 * Installer (scripts/cli/index.mjs): die latest.json im Branch `update-kanal`,
 * die update-channel.yml beim Veroeffentlichen eines Releases schreibt. Was
 * dort steht, hat Andreas freigegeben — nie ein beliebiger Stand von `main`.
 *
 * Abgefragt wird vom SERVER, nicht vom Browser: so sieht GitHub die Adresse
 * der Schule, nicht die jeder Lehrkraft, und die Content-Security-Policy
 * bleibt, wie sie ist.
 */
export const UPDATE_KANAL_URL = 'https://raw.githubusercontent.com/koreki-org/koreki/update-kanal/latest.json';

/** Eine Abfrage alle sechs Stunden reicht: Releases kommen im Abstand von Tagen. */
const GUELTIG_MS = 6 * 60 * 60 * 1000;

let zwischenspeicher: { version: string | null; geholt: number } | null = null;

/** Vergleicht "a.b.c"-Versionen numerisch; 0.9.100 ist neuer als 0.9.99. */
export function istNeuer(kandidat: string, aktuell: string): boolean {
    const teile = (v: string) => v.split('.').map((t) => Number.parseInt(t, 10) || 0);
    const k = teile(kandidat);
    const a = teile(aktuell);
    for (let i = 0; i < Math.max(k.length, a.length); i++) {
        const diff = (k[i] ?? 0) - (a[i] ?? 0);
        if (diff !== 0) return diff > 0;
    }
    return false;
}

/** null, wenn der Kanal nicht erreichbar ist — dann gibt es eben keinen Hinweis. */
export async function holeFreigegebeneVersion(jetzt = Date.now()): Promise<string | null> {
    if (zwischenspeicher && jetzt - zwischenspeicher.geholt < GUELTIG_MS) {
        return zwischenspeicher.version;
    }
    let version: string | null = null;
    try {
        const res = await fetch(UPDATE_KANAL_URL, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const daten: unknown = await res.json();
            const kandidat = (daten as { version?: unknown } | null)?.version;
            if (typeof kandidat === 'string' && /^\d+\.\d+\.\d+$/.test(kandidat)) version = kandidat;
        }
    } catch (err) {
        logger.warn('Update-Kanal nicht erreichbar', toErrorMessage(err));
    }
    zwischenspeicher = { version, geholt: jetzt };
    return version;
}

/** Nur fuer Tests. */
export function __leereZwischenspeicher(): void {
    zwischenspeicher = null;
}
