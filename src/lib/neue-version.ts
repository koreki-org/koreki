import { create } from 'zustand';
import type { Update, DownloadEvent } from '@tauri-apps/plugin-updater';
import { isDesktopTarget, isLocalInstance } from './env-context';
import { apiClient } from './api-client';
import { logger } from './logger';
import { toErrorMessage } from './error-message';

/**
 * Hinweis auf eine neuere freigegebene Version — Desktop und Community.
 *
 * Bis Version 0.9.98 gab es keinen: wer Koreki installiert hatte, blieb auf
 * dieser Version, und nichts sagte, dass es eine neuere gibt.
 *
 * QUELLE
 * Beide fragen den Update-Kanal (latest.json im Branch `update-kanal`), den
 * update-channel.yml beim Veroeffentlichen eines Releases fuellt. Entwuerfe
 * zaehlen nicht — die Freigabe bleibt ein Handgriff.
 *
 * DREI BETRIEBSARTEN
 * - Desktop: das Tauri-Plugin fragt den Kanal selbst, laedt, prueft die
 *   Signatur, installiert und startet neu — aber NUR auf Klick. Schuelerdaten
 *   leben ausschliesslich im Arbeitsspeicher (`architectural-vision` §2), der
 *   Neustart loescht sie.
 * - Community: der Server fragt den Kanal (/api/neue-version). Installieren
 *   kann die App sich nicht — sie laeuft in Docker und kann ihren eigenen
 *   Container nicht ersetzen. Sie zeigt den Befehl dafuer.
 * - SaaS: nichts. Er wird bei jedem Push auf `main` ausgeliefert.
 */

export type Betriebsart = 'desktop' | 'community';

export type UpdateZustand =
    | { art: 'unbekannt' }
    | { art: 'aktuell' }
    | { art: 'verfuegbar'; version: string }
    | { art: 'laedt'; version: string; prozent: number | null }
    | { art: 'fehler'; version: string; meldung: string };

interface UpdateStore {
    zustand: UpdateZustand;
    setze: (zustand: UpdateZustand) => void;
}

export const useNeueVersionStore = create<UpdateStore>((set) => ({
    zustand: { art: 'unbekannt' },
    setze: (zustand) => set({ zustand })
}));

/** Welche Art von Hinweis diese Instanz zeigt; null im SaaS. */
export function betriebsart(): Betriebsart | null {
    if (isDesktopTarget()) return 'desktop';
    if (isLocalInstance()) return 'community';
    return null;
}

/** Das Update-Objekt des Plugins traegt die Download-Faehigkeit; im Store
 *  steht nur, was die Oberflaeche anzeigt. */
let gefundenesUpdate: Update | null = null;
let pruefungLaeuft: Promise<void> | null = null;

async function neuesteVersion(art: Betriebsart): Promise<string | null> {
    if (art === 'desktop') {
        const { check } = await import('@tauri-apps/plugin-updater');
        gefundenesUpdate = await check();
        return gefundenesUpdate?.version ?? null;
    }
    const res = await apiClient.get('/api/neue-version');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const daten = (await res.json()) as { neueste: string | null };
    return daten.neueste;
}

/**
 * Fragt einmal pro Programmstart nach einer neueren Version. Mehrfache Aufrufe
 * (Kopfleiste mobil und breit, Neu-Rendern) teilen sich dieselbe Anfrage.
 * Ein Fehlschlag (offline, GitHub nicht erreichbar) ist kein Fehler fuer die
 * Lehrkraft: dann gibt es eben keinen Hinweis.
 */
export function pruefeAufNeueVersion(): Promise<void> {
    const art = betriebsart();
    if (!art) return Promise.resolve();
    if (!pruefungLaeuft) {
        pruefungLaeuft = (async () => {
            try {
                const version = await neuesteVersion(art);
                useNeueVersionStore.getState().setze(
                    version ? { art: 'verfuegbar', version } : { art: 'aktuell' }
                );
            } catch (err) {
                logger.warn('Pruefung auf neue Version fehlgeschlagen', toErrorMessage(err));
            }
        })();
    }
    return pruefungLaeuft;
}

/** Prozent aus den Download-Ereignissen; null, solange die Groesse unbekannt ist. */
export function fortschrittAus(geladen: number, gesamt: number | undefined): number | null {
    if (!gesamt) return null;
    return Math.min(100, Math.round((geladen / gesamt) * 100));
}

/**
 * Nur Desktop: laedt, installiert und startet neu. Unter Windows beendet der
 * Installer die App selbst; der Neustart darunter greift dann nicht mehr und
 * muss es nicht.
 */
export async function installiereNeueVersion(): Promise<void> {
    const update = gefundenesUpdate;
    if (!update) return;
    const { setze } = useNeueVersionStore.getState();
    const version = update.version;
    let gesamt: number | undefined;
    let geladen = 0;

    setze({ art: 'laedt', version, prozent: null });
    try {
        await update.downloadAndInstall((ereignis: DownloadEvent) => {
            if (ereignis.event === 'Started') gesamt = ereignis.data.contentLength;
            if (ereignis.event === 'Progress') {
                geladen += ereignis.data.chunkLength;
                setze({ art: 'laedt', version, prozent: fortschrittAus(geladen, gesamt) });
            }
        });
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
    } catch (err) {
        logger.error('Aktualisierung fehlgeschlagen', toErrorMessage(err));
        setze({ art: 'fehler', version, meldung: toErrorMessage(err) });
    }
}

/** Nur fuer Tests: Modulzustand zuruecksetzen. */
export function __setzeZurueck(): void {
    gefundenesUpdate = null;
    pruefungLaeuft = null;
    useNeueVersionStore.setState({ zustand: { art: 'unbekannt' } });
}
