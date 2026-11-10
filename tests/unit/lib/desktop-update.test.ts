import {
    pruefeAufNeueVersion,
    installiereNeueVersion,
    fortschrittAus,
    useDesktopUpdateStore,
    __setzeZurueck
} from '@/lib/desktop-update';
import { isDesktopTarget } from '@/lib/env-context';

/**
 * Selbst-Aktualisierung der Desktop-App.
 *
 * Geprueft wird vor allem, was NICHT passieren darf: ausserhalb des Desktops
 * nachfragen, mehrfach nachfragen, oder von selbst installieren. Der Neustart
 * nach dem Einspielen loescht die geladenen Arbeiten — er darf nur auf Klick
 * kommen.
 */

const check = jest.fn();
const relaunch = jest.fn();

jest.mock('@tauri-apps/plugin-updater', () => ({ check: () => check() }));
jest.mock('@tauri-apps/plugin-process', () => ({ relaunch: () => relaunch() }));
jest.mock('@/lib/env-context', () => ({ isDesktopTarget: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const zustand = () => useDesktopUpdateStore.getState().zustand;

type Ereignis =
    | { event: 'Started'; data: { contentLength?: number } }
    | { event: 'Progress'; data: { chunkLength: number } }
    | { event: 'Finished' };

const updateMit = (ereignisse: Ereignis[], fehler?: Error) => ({
    version: '1.0.0',
    downloadAndInstall: jest.fn(async (onEvent: (e: Ereignis) => void) => {
        ereignisse.forEach(onEvent);
        if (fehler) throw fehler;
    })
});

beforeEach(() => {
    __setzeZurueck();
    check.mockReset();
    relaunch.mockReset();
    (isDesktopTarget as jest.Mock).mockReturnValue(true);
});

describe('pruefeAufNeueVersion', () => {
    it('fragt ausserhalb des Desktops gar nicht erst nach', async () => {
        (isDesktopTarget as jest.Mock).mockReturnValue(false);
        await pruefeAufNeueVersion();
        expect(check).not.toHaveBeenCalled();
        expect(zustand()).toEqual({ art: 'unbekannt' });
    });

    it('meldet eine neuere Version', async () => {
        check.mockResolvedValue(updateMit([]));
        await pruefeAufNeueVersion();
        expect(zustand()).toEqual({ art: 'verfuegbar', version: '1.0.0' });
    });

    it('meldet "aktuell", wenn es nichts Neueres gibt', async () => {
        check.mockResolvedValue(null);
        await pruefeAufNeueVersion();
        expect(zustand()).toEqual({ art: 'aktuell' });
    });

    it('fragt pro Programmstart nur einmal, auch bei mehreren Aufrufern', async () => {
        check.mockResolvedValue(null);
        await Promise.all([pruefeAufNeueVersion(), pruefeAufNeueVersion()]);
        await pruefeAufNeueVersion();
        expect(check).toHaveBeenCalledTimes(1);
    });

    it('bleibt still, wenn GitHub nicht erreichbar ist', async () => {
        check.mockRejectedValue(new Error('offline'));
        await expect(pruefeAufNeueVersion()).resolves.toBeUndefined();
        expect(zustand()).toEqual({ art: 'unbekannt' });
    });

    it('installiert nie von selbst', async () => {
        const update = updateMit([]);
        check.mockResolvedValue(update);
        await pruefeAufNeueVersion();
        expect(update.downloadAndInstall).not.toHaveBeenCalled();
        expect(relaunch).not.toHaveBeenCalled();
    });
});

describe('installiereNeueVersion', () => {
    it('tut nichts, solange keine neue Version gefunden wurde', async () => {
        await installiereNeueVersion();
        expect(relaunch).not.toHaveBeenCalled();
    });

    it('laedt, installiert und startet danach neu', async () => {
        const update = updateMit([
            { event: 'Started', data: { contentLength: 200 } },
            { event: 'Progress', data: { chunkLength: 50 } },
            { event: 'Finished' }
        ]);
        check.mockResolvedValue(update);
        await pruefeAufNeueVersion();
        await installiereNeueVersion();
        expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
        expect(relaunch).toHaveBeenCalledTimes(1);
        expect(zustand()).toEqual({ art: 'laedt', version: '1.0.0', prozent: 25 });
    });

    it('zeigt den Fehler und startet nicht neu, wenn das Einspielen scheitert', async () => {
        check.mockResolvedValue(updateMit([], new Error('Signatur ungueltig')));
        await pruefeAufNeueVersion();
        await installiereNeueVersion();
        expect(relaunch).not.toHaveBeenCalled();
        expect(zustand()).toEqual({ art: 'fehler', version: '1.0.0', meldung: 'Signatur ungueltig' });
    });
});

describe('fortschrittAus', () => {
    it('kennt ohne Gesamtgroesse keinen Prozentwert', () => {
        expect(fortschrittAus(10, undefined)).toBeNull();
        expect(fortschrittAus(10, 0)).toBeNull();
    });

    it('rundet und kappt bei 100', () => {
        expect(fortschrittAus(1, 3)).toBe(33);
        expect(fortschrittAus(300, 200)).toBe(100);
    });
});
