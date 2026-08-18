import { createProfileStore, type ProfilBasis } from '../../../src/lib/services/profile-store';
import { isDesktopTarget } from '../../../src/lib/env-context';
import { apiClient } from '../../../src/lib/api-client';

jest.mock('../../../src/lib/env-context', () => ({ isDesktopTarget: jest.fn() }));
jest.mock('../../../src/lib/api-client', () => ({
    apiClient: { get: jest.fn(), post: jest.fn(), fetch: jest.fn() }
}));

/**
 * Ablage der Profil-Familien (Layer 1)
 * 🗄️🛡️
 *
 * DIE ENTSCHEIDENDE UNTERSCHEIDUNG. Koreki persistiert in DREI Betriebsarten
 * verschieden:
 *
 * 1. Desktop   → localStorage der Webview. Die App wird als statischer Export
 *                gebaut und hat ueberhaupt keine API-Routen.
 * 2. Community → Dateien unter ./data/prompts, ueber eine API-Route.
 * 3. SaaS      → PostgreSQL via Prisma, ueber DIESELBE API-Route.
 *
 * Diese Datei betrifft die CLIENT-Seite, und dort gibt es deshalb nur ZWEI
 * Faelle: „es gibt keinen Server" (Desktop) und „es gibt einen" (Community und
 * SaaS). Die Unterscheidung zwischen 2 und 3 faellt SERVERSEITIG in der Route
 * ueber `isLocalInstance()` — und das ist Absicht: haette der Client sie
 * ebenfalls, koennten Community und SaaS auseinanderlaufen.
 *
 * Die Tests unten halten genau diese Grenze fest.
 */

const alsDesktop = (ja: boolean) => (isDesktopTarget as jest.Mock).mockReturnValue(ja);
const antwort = (ok: boolean, body: unknown) => ({ ok, json: async () => body });

interface TestProfil extends ProfilBasis {
    nutzlast?: string;
}

const store = createProfileStore<TestProfil>({
    speicherSchluessel: 'test_profile',
    endpunkt: '/api/user/test-profiles',
    idPraefix: 'local-test'
});

const abgelegt = (): TestProfil[] => JSON.parse(localStorage.getItem('test_profile') || '[]');

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

describe('Desktop: localStorage, niemals das Netz', () => {
    beforeEach(() => alsDesktop(true));

    /**
     * Die ausgelieferte Desktop-App hat KEINE API-Routen (statischer Export).
     * Ein Netzaufruf von hier ginge ins Leere — und zwar still.
     */
    it('ruft beim Laden keine API auf', async () => {
        localStorage.setItem('test_profile', JSON.stringify([{ id: 'a', name: 'A' }]));

        expect(await store.lade()).toEqual([{ id: 'a', name: 'A' }]);
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('legt ein neues Profil mit eigener Kennung an', async () => {
        const neu = await store.speichere({ zielId: '', name: 'Neu', nutzdaten: { nutzlast: 'x' } });

        expect(neu.id).toMatch(/^local-test-\d+$/);
        expect(neu.name).toBe('Neu');
        expect(neu.nutzlast).toBe('x');
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    /** Beim Bearbeiten entscheidet die KENNUNG, nicht der Name. */
    it('trifft beim Bearbeiten den Eintrag mit der Kennung', async () => {
        localStorage.setItem('test_profile', JSON.stringify([
            { id: 'a', name: 'Gleich', nutzlast: 'alt' },
            { id: 'b', name: 'Gleich', nutzlast: 'alt' }
        ]));

        await store.speichere({ zielId: 'b', name: 'Gleich', nutzdaten: { nutzlast: 'neu' } });

        expect(abgelegt()[0].nutzlast).toBe('alt');
        expect(abgelegt()[1].nutzlast).toBe('neu');
    });

    /** Nur BEIM NEUANLEGEN faellt die Entscheidung ueber den Namen. */
    it('ueberschreibt beim Neuanlegen einen Namensgleichen', async () => {
        localStorage.setItem('test_profile', JSON.stringify([{ id: 'a', name: 'Physik', nutzlast: 'alt' }]));

        await store.speichere({ zielId: '', name: '  physik ', nutzdaten: { nutzlast: 'neu' } });

        expect(abgelegt()).toHaveLength(1);
        expect(abgelegt()[0].nutzlast).toBe('neu');
        // Der abgelegte Name bleibt: Speichern ist kein Umbenennen.
        expect(abgelegt()[0].name).toBe('Physik');
    });

    it('loescht ueber die Kennung', async () => {
        localStorage.setItem('test_profile', JSON.stringify([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]));

        await store.loesche('a');

        expect(abgelegt()).toEqual([{ id: 'b', name: 'B' }]);
        expect(apiClient.fetch).not.toHaveBeenCalled();
    });

    /** Zwei gleichnamige Profile waeren in der Seitenleiste ununterscheidbar. */
    it('lehnt ein Umbenennen auf einen vergebenen Namen ab', async () => {
        localStorage.setItem('test_profile', JSON.stringify([
            { id: 'a', name: 'Physik' },
            { id: 'b', name: 'Chemie' }
        ]));

        expect(await store.benenneUm('b', '  PHYSIK ')).toBe(false);
        expect(abgelegt()[1].name).toBe('Chemie');
    });

    it('benennt auf einen freien Namen um', async () => {
        localStorage.setItem('test_profile', JSON.stringify([{ id: 'a', name: 'Alt' }]));

        expect(await store.benenneUm('a', ' Neu ')).toBe(true);
        expect(abgelegt()[0].name).toBe('Neu');
    });

    /** Ein beschaedigter Eintrag darf die Profilverwaltung nicht lahmlegen. */
    it('faellt bei unlesbarem Speicher auf eine leere Liste zurueck', async () => {
        localStorage.setItem('test_profile', 'kein JSON');

        expect(await store.lade()).toEqual([]);
    });
});

describe('Community und SaaS: dieselbe Route, kein Unterschied im Client', () => {
    beforeEach(() => alsDesktop(false));

    /**
     * Der Client darf Community und SaaS NICHT unterscheiden. Beide sprechen
     * dieselbe Route an; ob dahinter eine Datei oder Postgres liegt, entscheidet
     * die Route selbst ueber `isLocalInstance()`. Zoege der Client die Grenze
     * ein zweites Mal, koennten beide Betriebsarten auseinanderlaufen — genau
     * das Muster, das in diesem Projekt schon mehrfach Fehler erzeugt hat.
     */
    it('laedt ueber die API und fasst den lokalen Speicher nicht an', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue(antwort(true, [{ id: 'srv', name: 'S' }]));
        localStorage.setItem('test_profile', JSON.stringify([{ id: 'lokal', name: 'L' }]));

        expect(await store.lade()).toEqual([{ id: 'srv', name: 'S' }]);
        expect(apiClient.get).toHaveBeenCalledWith('/api/user/test-profiles');
    });

    it('nimmt eine unerwartete Antwortform als leere Liste', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue(antwort(true, { fehler: 'ups' }));

        expect(await store.lade()).toEqual([]);
    });

    it('speichert ueber die Route und gibt den Server-Stand zurueck', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue(
            antwort(true, { id: 'srv-1', name: 'Neu', nutzlast: 'bereinigt' })
        );

        const neu = await store.speichere({ zielId: '', name: 'Neu', nutzdaten: { nutzlast: 'roh' } });

        expect(neu.nutzlast).toBe('bereinigt');
        expect(apiClient.post).toHaveBeenCalledWith('/api/user/test-profiles', {
            nutzlast: 'roh', id: undefined, name: 'Neu'
        });
        expect(localStorage.getItem('test_profile')).toBeNull();
    });

    it('reicht die Kennung beim Bearbeiten mit', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue(antwort(true, { id: 'x', name: 'N' }));

        await store.speichere({ zielId: 'x', name: 'N', nutzdaten: {} });

        expect((apiClient.post as jest.Mock).mock.calls[0][1].id).toBe('x');
    });

    it('loescht ueber die Route', async () => {
        (apiClient.fetch as jest.Mock).mockResolvedValue(antwort(true, {}));

        await store.loesche('a');

        expect(apiClient.fetch).toHaveBeenCalledWith('/api/user/test-profiles?id=a', { method: 'DELETE' });
    });

    /**
     * Die Namenspruefung liegt serverseitig — die Datenbank hat `@@unique`, die
     * Community-Ablage prueft in ihrem Dienst. Der Client meldet deshalb `true`
     * und laesst einen Fehler durch; er darf die Pruefung NICHT ein zweites Mal
     * selbst machen, sonst weichen die Regeln voneinander ab.
     */
    it('ueberlaesst die Namenspruefung dem Server', async () => {
        (apiClient.fetch as jest.Mock).mockResolvedValue(antwort(true, {}));

        expect(await store.benenneUm('a', 'Neu')).toBe(true);
    });

    it('reicht die Fehlermeldung des Servers durch', async () => {
        (apiClient.fetch as jest.Mock).mockResolvedValue(antwort(false, { message: 'Name vergeben' }));

        await expect(store.benenneUm('a', 'Neu')).rejects.toThrow('Name vergeben');
    });

    /** Antwortet der Server HTML statt JSON, darf das Lesen nicht selbst werfen. */
    it('wirft eine brauchbare Meldung, wenn die Antwort kein JSON ist', async () => {
        (apiClient.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => { throw new Error('Unexpected token <'); }
        });

        await expect(store.loesche('a')).rejects.toThrow('Loeschen fehlgeschlagen');
    });
});
