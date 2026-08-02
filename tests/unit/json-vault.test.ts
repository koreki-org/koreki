/**
 * @jest-environment node
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    readJsonArray,
    readJsonArrayForUpdate,
    readJsonObject,
    withFileMutex,
    writeJsonAtomic
} from '@/lib/services/json-vault';

/**
 * Industrial Persistence Audit (Layer 1)
 * 🏮🛡️ Community & Desktop Vault
 *
 * Prüft gegen ein echtes Dateisystem — nicht gegen gemocktes fs, damit die
 * Tests den Vertrag belegen und nicht die Implementierung nachzeichnen.
 */

let vaultDir: string;

const filePath = (name: string) => path.join(vaultDir, name);

const writeRaw = (name: string, content: string): string => {
    const target = filePath(name);
    fs.writeFileSync(target, content, 'utf-8');
    return target;
};

const quarantinedFilesFor = (name: string): string[] =>
    fs.readdirSync(vaultDir).filter(f => f.startsWith(`${name}.corrupt-`));

beforeEach(() => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'koreki-vault-'));
});

afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(vaultDir, { recursive: true, force: true });
});

describe('JSON Vault — reading', () => {

    it('returns the stored array for a valid file', () => {
        writeRaw('profiles.json', JSON.stringify([{ name: 'Deutsch Oberstufe' }]));
        expect(readJsonArray<{ name: string }>(filePath('profiles.json'))).toEqual([{ name: 'Deutsch Oberstufe' }]);
    });

    it('returns an empty array when the file does not exist', () => {
        expect(readJsonArray(filePath('fehlt.json'))).toEqual([]);
    });

    it('treats an empty file as empty, not as corrupt', () => {
        writeRaw('profiles.json', '   ');

        expect(readJsonArray(filePath('profiles.json'))).toEqual([]);
        // Eine frisch angelegte, leere Datei darf nicht in Quarantäne wandern.
        expect(quarantinedFilesFor('profiles.json')).toHaveLength(0);
        expect(fs.existsSync(filePath('profiles.json'))).toBe(true);
    });

    it('returns an empty array when the JSON is not an array', () => {
        writeRaw('profiles.json', JSON.stringify({ unerwartet: true }));
        expect(readJsonArray(filePath('profiles.json'))).toEqual([]);
    });
});

describe('JSON Vault — corruption handling', () => {

    it('preserves a corrupt file instead of letting the next write destroy it', () => {
        const damaged = '[{"name":"Erfahrungsschatz Klasse 9",';
        writeRaw('grading_memories.json', damaged);

        expect(readJsonArray(filePath('grading_memories.json'))).toEqual([]);

        const quarantined = quarantinedFilesFor('grading_memories.json');
        expect(quarantined).toHaveLength(1);
        // Entscheidend: der ursprüngliche Inhalt ist wiederherstellbar.
        expect(fs.readFileSync(path.join(vaultDir, quarantined[0]), 'utf-8')).toBe(damaged);
        // Und der Originalpfad ist frei, der nächste Schreibvorgang beginnt sauber.
        expect(fs.existsSync(filePath('grading_memories.json'))).toBe(false);
    });

    it('quarantines before an update as well', () => {
        writeRaw('profiles.json', 'kein JSON');

        expect(readJsonArrayForUpdate(filePath('profiles.json'))).toEqual([]);
        expect(quarantinedFilesFor('profiles.json')).toHaveLength(1);
    });

    it('blocks an update when the corrupt file cannot be quarantined', () => {
        writeRaw('profiles.json', 'kein JSON');
        jest.spyOn(fs, 'renameSync').mockImplementation(() => {
            throw new Error('EPERM: operation not permitted');
        });

        // Ohne Quarantäne würde der folgende Schreibvorgang die Daten endgültig
        // überschreiben — deshalb muss der Aufruf hier scheitern.
        expect(() => readJsonArrayForUpdate(filePath('profiles.json'))).toThrow(/Datenverlust/);
    });

    it('does not block a plain read when quarantine fails', () => {
        writeRaw('profiles.json', 'kein JSON');
        jest.spyOn(fs, 'renameSync').mockImplementation(() => {
            throw new Error('EPERM: operation not permitted');
        });

        // Ein Lesezugriff zerstört nichts und darf die Anzeige nicht blockieren.
        expect(readJsonArray(filePath('profiles.json'))).toEqual([]);
    });
});

describe('JSON Vault — atomic writing', () => {

    const tempArtefacts = () => fs.readdirSync(vaultDir).filter(f => f.includes('.tmp-'));

    it('writes the payload and leaves no temporary artefacts behind', () => {
        const target = filePath('profiles.json');
        writeJsonAtomic(target, [{ name: 'Deutsch Oberstufe' }]);

        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual([{ name: 'Deutsch Oberstufe' }]);
        expect(tempArtefacts()).toHaveLength(0);
    });

    it('replaces existing content completely', () => {
        const target = writeRaw('profiles.json', JSON.stringify([{ name: 'alt' }, { name: 'ebenfalls alt' }]));
        writeJsonAtomic(target, [{ name: 'neu' }]);

        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual([{ name: 'neu' }]);
    });

    it('leaves the previous content intact when serialisation fails', () => {
        const target = writeRaw('profiles.json', JSON.stringify([{ name: 'unversehrt' }]));

        const circular: Record<string, unknown> = {};
        circular.self = circular;

        expect(() => writeJsonAtomic(target, circular)).toThrow();
        // Der alte Stand muss unangetastet bleiben — genau das leistet Temp+Rename.
        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual([{ name: 'unversehrt' }]);
        expect(tempArtefacts()).toHaveLength(0);
    });

    /**
     * Unter Windows kann das Umbenennen über eine bestehende Datei mit EPERM
     * scheitern (Virenscanner, offene Handles). Der Rückfall auf einen direkten
     * Schreibvorgang darf die Funktion nicht verlieren.
     */
    it('falls back to a direct write when renaming keeps failing', () => {
        const target = writeRaw('profiles.json', JSON.stringify([{ name: 'alt' }]));
        const renameSpy = jest.spyOn(fs, 'renameSync').mockImplementation(() => {
            throw new Error('EPERM: operation not permitted, rename');
        });

        writeJsonAtomic(target, [{ name: 'neu' }]);

        expect(renameSpy).toHaveBeenCalledTimes(3);
        expect(JSON.parse(fs.readFileSync(target, 'utf-8'))).toEqual([{ name: 'neu' }]);
        expect(tempArtefacts()).toHaveLength(0);
    });
});

describe('JSON Vault — write serialisation', () => {

    /** Simuliert einen Read-Modify-Write-Zyklus mit einer Pause dazwischen. */
    const appendEntry = async (target: string, name: string): Promise<void> => {
        const current = readJsonArray<{ name: string }>(target);
        await new Promise(resolve => setTimeout(resolve, 5));
        fs.writeFileSync(target, JSON.stringify([...current, { name }]), 'utf-8');
    };

    it('keeps concurrent updates from overwriting each other', async () => {
        const target = writeRaw('global_ai_settings.json', JSON.stringify([]));

        await Promise.all([
            withFileMutex(target, () => appendEntry(target, 'Admin A')),
            withFileMutex(target, () => appendEntry(target, 'Admin B'))
        ]);

        // Ohne Serialisierung läge hier nur ein Eintrag — der Verlierer des Rennens.
        const stored = readJsonArray<{ name: string }>(target);
        expect(stored).toHaveLength(2);
        expect(stored.map(e => e.name).sort()).toEqual(['Admin A', 'Admin B']);
    });

    it('runs the next task even after the previous one failed', async () => {
        const target = writeRaw('global_ai_settings.json', JSON.stringify([]));

        const failing = withFileMutex(target, () => Promise.reject(new Error('Platte voll')));
        await expect(failing).rejects.toThrow('Platte voll');

        await withFileMutex(target, () => appendEntry(target, 'Admin B'));
        expect(readJsonArray<{ name: string }>(target)).toEqual([{ name: 'Admin B' }]);
    });

    it('serialises per file, so unrelated users are not blocked', async () => {
        const a = writeRaw('profiles_a.json', JSON.stringify([]));
        const b = writeRaw('profiles_b.json', JSON.stringify([]));

        await Promise.all([
            withFileMutex(a, () => appendEntry(a, 'Lehrkraft A')),
            withFileMutex(b, () => appendEntry(b, 'Lehrkraft B'))
        ]);

        expect(readJsonArray<{ name: string }>(a)).toEqual([{ name: 'Lehrkraft A' }]);
        expect(readJsonArray<{ name: string }>(b)).toEqual([{ name: 'Lehrkraft B' }]);
    });
});

describe('JSON Vault — object reads', () => {

    it('returns the stored object', () => {
        writeRaw('global_ai_settings.json', JSON.stringify({ provider: 'ollama' }));
        expect(readJsonObject(filePath('global_ai_settings.json'))).toEqual({ provider: 'ollama' });
    });

    it('returns null for a missing file so callers can fall back to env defaults', () => {
        expect(readJsonObject(filePath('fehlt.json'))).toBeNull();
    });

    it('returns null when the stored JSON is an array', () => {
        writeRaw('global_ai_settings.json', JSON.stringify([1, 2, 3]));
        expect(readJsonObject(filePath('global_ai_settings.json'))).toBeNull();
    });
});
