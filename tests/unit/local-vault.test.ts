import { readLocalArray, readLocalArrayForUpdate, writeLocalArray } from '@/lib/local-vault';

/**
 * Industrial Persistence Audit (Layer 1)
 * 🏮🛡️ Desktop Vault (localStorage)
 *
 * Gegenstück zu json-vault.test.ts. Im Desktop-Modus existieren keine
 * API-Routen, die Hooks schreiben direkt in den localStorage — dasselbe
 * Zerstörungsmuster galt dort bis zuletzt.
 */

const KEY = 'koreki_local_profiles';

const quarantinedKeys = () =>
    Object.keys(window.localStorage).filter(k => k.startsWith(`${KEY}.corrupt-`));

beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
});

describe('Local Vault — reading', () => {

    it('returns the stored array', () => {
        window.localStorage.setItem(KEY, JSON.stringify([{ name: 'Deutsch Oberstufe' }]));
        expect(readLocalArray<{ name: string }>(KEY)).toEqual([{ name: 'Deutsch Oberstufe' }]);
    });

    it('returns an empty array for a missing key', () => {
        expect(readLocalArray(KEY)).toEqual([]);
    });

    it('returns an empty array when the value is not an array', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ unerwartet: true }));
        expect(readLocalArray(KEY)).toEqual([]);
    });

    it('treats an empty value as empty, not as corrupt', () => {
        window.localStorage.setItem(KEY, '   ');

        expect(readLocalArray(KEY)).toEqual([]);
        expect(quarantinedKeys()).toHaveLength(0);
    });
});

describe('Local Vault — corruption handling', () => {

    it('preserves a corrupt entry instead of letting the next save destroy it', () => {
        const damaged = '[{"name":"Erfahrungsschatz Klasse 9",';
        window.localStorage.setItem(KEY, damaged);

        expect(readLocalArray(KEY)).toEqual([]);

        const quarantined = quarantinedKeys();
        expect(quarantined).toHaveLength(1);
        // Entscheidend: der ursprüngliche Inhalt bleibt wiederherstellbar.
        expect(window.localStorage.getItem(quarantined[0])).toBe(damaged);
        expect(window.localStorage.getItem(KEY)).toBeNull();
    });

    it('quarantines before an update as well', () => {
        window.localStorage.setItem(KEY, 'kein JSON');

        expect(readLocalArrayForUpdate(KEY)).toEqual([]);
        expect(quarantinedKeys()).toHaveLength(1);
    });

    it('blocks an update when the corrupt entry cannot be quarantined', () => {
        window.localStorage.setItem(KEY, 'kein JSON');
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => readLocalArrayForUpdate(KEY)).toThrow(/Datenverlust/);
    });

    it('does not block a plain read when quarantine fails', () => {
        window.localStorage.setItem(KEY, 'kein JSON');
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(readLocalArray(KEY)).toEqual([]);
    });

    it('leaves the corrupt entry untouched when quarantine fails', () => {
        window.localStorage.setItem(KEY, 'kein JSON');
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        readLocalArray(KEY);

        // Nichts darf gelöscht werden, solange keine Sicherung existiert.
        expect(window.localStorage.getItem(KEY)).toBe('kein JSON');
    });
});

describe('Local Vault — writing', () => {

    it('round-trips through read', () => {
        writeLocalArray(KEY, [{ name: 'neu' }]);
        expect(readLocalArray<{ name: string }>(KEY)).toEqual([{ name: 'neu' }]);
    });

    it('replaces existing content completely', () => {
        window.localStorage.setItem(KEY, JSON.stringify([{ name: 'alt' }, { name: 'ebenfalls alt' }]));
        writeLocalArray(KEY, [{ name: 'neu' }]);

        expect(readLocalArray<{ name: string }>(KEY)).toEqual([{ name: 'neu' }]);
    });
});
