import {
    alsVerbindungsfehler,
    beschreibeVerbindungsfehler,
    fetchMitVerbindungsfehler,
    istVerbindungsfehler
} from '../../../src/lib/ai/verbindungsfehler';

/**
 * Verbindungsfehler zum KI-Server (Layer 1)
 * 🔌
 *
 * ANLASS, 15.11.2026: Bei unerreichbarem KI-Server las die Lehrkraft nur
 * „fetch failed". Node legt den Grund in `cause` ab — so, wie er hier gebaut
 * wird, kam er am 15.11.2026 tatsaechlich an (UND_ERR_CONNECT_TIMEOUT).
 */

/** Ein Netzfehler, wie Node/undici ihn wirft. */
const netzfehler = (code?: string): Error => {
    const err = new TypeError('fetch failed');
    if (code) Object.assign(err, { cause: Object.assign(new Error('innen'), { code }) });
    return err;
};

const ADRESSE = 'http://192.168.250.12:11434/api/chat';

describe('beschreibeVerbindungsfehler', () => {
    it('nennt Server und Grund statt „fetch failed"', () => {
        const text = beschreibeVerbindungsfehler(netzfehler('UND_ERR_CONNECT_TIMEOUT'), ADRESSE);
        expect(text).toContain('Der KI-Server 192.168.250.12:11434 ist nicht erreichbar.');
        expect(text).toContain('keine Antwort');
        expect(text).not.toContain('fetch failed');
        expect(text).not.toContain('/api/chat');
    });

    it.each([
        ['ECONNREFUSED', 'lehnt die Verbindung ab'],
        ['ENOTFOUND', 'Adresse ist unbekannt'],
        ['UND_ERR_HEADERS_TIMEOUT', '5 Minuten'],
        ['ECONNRESET', 'mitten in der Arbeit getrennt']
    ])('unterscheidet %s', (code, erwartet) => {
        expect(beschreibeVerbindungsfehler(netzfehler(code), ADRESSE)).toContain(erwartet);
    });

    it('nennt einen unbekannten Grund mit seinem Code, damit man ihn melden kann', () => {
        expect(beschreibeVerbindungsfehler(netzfehler('UND_ERR_NEU'), ADRESSE)).toContain('(Code: UND_ERR_NEU)');
    });
});

describe('istVerbindungsfehler', () => {
    it('erkennt Netzfehler aus Node und dem Browser', () => {
        expect(istVerbindungsfehler(netzfehler())).toBe(true);
        expect(istVerbindungsfehler(new TypeError('Failed to fetch'))).toBe(true);
    });

    /** Ein Abbruch durch die Lehrkraft ist gewollt — er darf nicht wie ein Netzproblem aussehen. */
    it('laesst einen Abbruch und gewoehnliche Fehler in Ruhe', () => {
        const abbruch = Object.assign(new Error('aborted'), { name: 'AbortError' });
        expect(istVerbindungsfehler(abbruch)).toBe(false);
        expect(alsVerbindungsfehler(abbruch, ADRESSE)).toBe(abbruch);
        const anders = new Error('Ollama JSON-Parse fehlgeschlagen');
        expect(alsVerbindungsfehler(anders, ADRESSE)).toBe(anders);
    });

    it('behaelt die Ursache fuers Protokoll', () => {
        const original = netzfehler('ECONNREFUSED');
        expect((alsVerbindungsfehler(original, ADRESSE) as Error & { cause?: unknown }).cause).toBe(original);
    });
});

describe('fetchMitVerbindungsfehler', () => {
    const echtesFetch = global.fetch;
    afterEach(() => { global.fetch = echtesFetch; });

    it('wirft bei einem Netzfehler die lesbare Meldung', async () => {
        global.fetch = jest.fn().mockRejectedValue(netzfehler('UND_ERR_CONNECT_TIMEOUT'));
        await expect(fetchMitVerbindungsfehler(ADRESSE)).rejects.toThrow('Der KI-Server 192.168.250.12:11434 ist nicht erreichbar.');
    });

    it('reicht eine Antwort unveraendert durch', async () => {
        const antwort = { ok: true } as Response;
        global.fetch = jest.fn().mockResolvedValue(antwort);
        await expect(fetchMitVerbindungsfehler(ADRESSE)).resolves.toBe(antwort);
    });
});
