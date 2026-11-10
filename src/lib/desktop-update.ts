import { create } from 'zustand';
import type { Update, DownloadEvent } from '@tauri-apps/plugin-updater';
import { isDesktopTarget } from './env-context';
import { logger } from './logger';
import { toErrorMessage } from './error-message';

/**
 * Selbst-Aktualisierung der Desktop-App.
 *
 * Bis Version 0.9.98 gab es keine: wer Koreki Desktop installiert hatte, blieb
 * auf dieser Version, und nichts in der App sagte, dass es eine neuere gibt.
 *
 * ABLAUF
 * Beim Start fragt die App EINMAL bei GitHub nach (latest.json des neuesten
 * veroeffentlichten Releases — Entwuerfe zaehlen nicht, die Freigabe bleibt ein
 * Handgriff). Gibt es eine neuere Version, erscheint ein Hinweis. Installiert
 * wird NUR auf Klick: Schuelerdaten leben ausschliesslich im Arbeitsspeicher
 * (`architectural-vision` §2), der Neustart nach dem Einspielen loescht sie.
 * Wer gerade korrigiert, darf davon nicht ueberrascht werden.
 *
 * Die Pakete sind signiert; das Plugin verweigert alles, was nicht zum
 * oeffentlichen Schluessel in tauri.conf.json passt.
 */

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

export const useDesktopUpdateStore = create<UpdateStore>((set) => ({
    zustand: { art: 'unbekannt' },
    setze: (zustand) => set({ zustand })
}));

/** Das Update-Objekt des Plugins traegt die Download-Faehigkeit; im Store
 *  steht nur, was die Oberflaeche anzeigt. */
let gefundenesUpdate: Update | null = null;
let pruefungLaeuft: Promise<void> | null = null;

/**
 * Fragt einmal pro Programmstart nach einer neueren Version. Mehrfache Aufrufe
 * (Kopfleiste mobil und breit, Neu-Rendern) teilen sich dieselbe Anfrage.
 * Ein Fehlschlag (offline, GitHub nicht erreichbar) ist kein Fehler fuer die
 * Lehrkraft: dann gibt es eben keinen Hinweis.
 */
export function pruefeAufNeueVersion(): Promise<void> {
    if (!isDesktopTarget()) return Promise.resolve();
    if (!pruefungLaeuft) {
        pruefungLaeuft = (async () => {
            try {
                const { check } = await import('@tauri-apps/plugin-updater');
                const update = await check();
                gefundenesUpdate = update;
                useDesktopUpdateStore.getState().setze(
                    update ? { art: 'verfuegbar', version: update.version } : { art: 'aktuell' }
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
 * Laedt, installiert und startet neu. Unter Windows beendet der Installer die
 * App selbst; der Neustart darunter greift dann nicht mehr und muss es nicht.
 */
export async function installiereNeueVersion(): Promise<void> {
    const update = gefundenesUpdate;
    if (!update) return;
    const { setze } = useDesktopUpdateStore.getState();
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
    useDesktopUpdateStore.setState({ zustand: { art: 'unbekannt' } });
}
