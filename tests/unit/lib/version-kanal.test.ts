import { istNeuer, holeFreigegebeneVersion, __leereZwischenspeicher, UPDATE_KANAL_URL } from '@/lib/version-kanal';

/**
 * Freigegebene Version aus dem Update-Kanal (Community-Server).
 * Wichtig: numerisch vergleichen — als Text waere "0.9.99" neuer als "0.9.100".
 */

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }));

const antwort = (version: unknown, ok = true) =>
    Promise.resolve({ ok, json: async () => ({ version }) } as Response);

describe('istNeuer', () => {
    it('vergleicht numerisch, nicht als Text', () => {
        expect(istNeuer('0.9.100', '0.9.99')).toBe(true);
        expect(istNeuer('0.9.99', '0.9.100')).toBe(false);
        expect(istNeuer('1.0.0', '0.9.100')).toBe(true);
    });

    it('gleiche Version ist nicht neuer', () => {
        expect(istNeuer('0.9.100', '0.9.100')).toBe(false);
    });
});

describe('holeFreigegebeneVersion', () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    beforeEach(() => {
        __leereZwischenspeicher();
        fetchSpy.mockReset();
    });

    afterAll(() => fetchSpy.mockRestore());

    it('liest die Version aus dem Kanal', async () => {
        fetchSpy.mockImplementation(() => antwort('0.9.101'));
        await expect(holeFreigegebeneVersion()).resolves.toBe('0.9.101');
        expect(fetchSpy.mock.calls[0][0]).toBe(UPDATE_KANAL_URL);
    });

    it('fragt innerhalb von sechs Stunden nur einmal', async () => {
        fetchSpy.mockImplementation(() => antwort('0.9.101'));
        await holeFreigegebeneVersion(0);
        await holeFreigegebeneVersion(5 * 60 * 60 * 1000);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        await holeFreigegebeneVersion(7 * 60 * 60 * 1000);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('nimmt nichts an, was keine Versionsnummer ist', async () => {
        fetchSpy.mockImplementation(() => antwort('<script>'));
        await expect(holeFreigegebeneVersion()).resolves.toBeNull();
    });

    it('bleibt still, wenn der Kanal nicht erreichbar ist', async () => {
        fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
        await expect(holeFreigegebeneVersion()).resolves.toBeNull();
    });
});
