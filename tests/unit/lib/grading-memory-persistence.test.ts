import {
    persistGradingMemory,
    bestaetigeSchatzName
} from '../../../src/lib/grading-memory-persistence';
import { isDesktopTarget } from '../../../src/lib/env-context';
import { apiClient } from '../../../src/lib/api-client';
import type { GradingMemory } from '../../../src/types';

jest.mock('../../../src/lib/env-context', () => ({ isDesktopTarget: jest.fn() }));
jest.mock('../../../src/lib/api-client', () => ({ apiClient: { post: jest.fn() } }));

/**
 * Erfahrungsschatz ablegen und die Rueckfrage davor (Layer 1)
 * 💾🛡️
 *
 * ANLASS, 18.08.2026: Ein Import hat einen gleichnamigen Erfahrungsschatz
 * wortlos ersetzt. Beide Ablagen ueberschreiben namensgleich — der localStorage
 * ueber `isSameName`, die Datenbank ueber `upsert`. Die Rueckfrage davor ist
 * damit das EINZIGE, was zwischen einem Import und dem Verlust der Arbeit
 * steht, die jemand nach dem Export am Original gemacht hat.
 *
 * Sie war ungeprueft (0 % Zweigabdeckung), obwohl der Import-Weg sie
 * uebersprungen hat und die Kollisionspruefung darin bereits einmal
 * auseinandergelaufen war: sie verglich den GESPEICHERTEN Namen ungetrimmt.
 */

const schatz = (name: string): GradingMemory => ({
    id: `id-${name}`,
    name,
    cases: [],
    userId: null,
    createdAt: '2026-08-18T00:00:00.000Z'
});

const bestaetige = (ja: boolean) => {
    window.confirm = jest.fn(() => ja);
};

beforeEach(() => {
    jest.clearAllMocks();
    (isDesktopTarget as jest.Mock).mockReturnValue(false);
});

describe('bestaetigeSchatzName', () => {
    it('verlangt einen Namen', () => {
        expect(bestaetigeSchatzName('   ', []).ok).toBe(false);
        expect(bestaetigeSchatzName('   ', []).fehler).toMatch(/Namen/);
    });

    it('laesst einen freien Namen ohne Rueckfrage durch', () => {
        bestaetige(false);

        expect(bestaetigeSchatzName('Neu', [schatz('Anderer')]).ok).toBe(true);
        expect(window.confirm).not.toHaveBeenCalled();
    });

    /** DIE STELLE, die den gemeldeten Datenverlust verhindert. */
    it('fragt bei einem belegten Namen und gehorcht der Antwort', () => {
        bestaetige(false);
        expect(bestaetigeSchatzName('Physik', [schatz('Physik')]).ok).toBe(false);

        bestaetige(true);
        expect(bestaetigeSchatzName('Physik', [schatz('Physik')]).ok).toBe(true);
    });

    /**
     * REGRESSION. Die Pruefung verglich den GESPEICHERTEN Namen ungetrimmt.
     * Ein Eintrag mit angehaengtem Leerzeichen galt damit als anderer Name —
     * die Rueckfrage blieb aus, die Ablage ueberschrieb ihn trotzdem.
     */
    it('erkennt die Namensgleichheit unabhaengig von Rand und Schreibweise', () => {
        bestaetige(false);

        expect(bestaetigeSchatzName('physik', [schatz('  Physik ')]).ok).toBe(false);
        expect(bestaetigeSchatzName('  PHYSIK  ', [schatz('Physik')]).ok).toBe(false);
        expect(window.confirm).toHaveBeenCalledTimes(2);
    });

    /**
     * DIE RUECKFRAGE MUSS SAGEN, WAS SIE ERSETZT.
     *
     * `overwriteQuestion` bekommt die Bezeichnung der Profil-Familie als
     * Parameter — dieselbe Funktion formuliert auch die Rueckfrage fuer
     * Expertise-Profile, KI-Profile und Skill-Sets. Steht dort die falsche oder
     * gar keine Bezeichnung, liest die Lehrkraft „Ein  mit dem Namen ...
     * existiert bereits" oder, schlimmer, den Namen einer anderen Familie — und
     * bestaetigt ein Ueberschreiben, das sie nicht gemeint hat.
     *
     * Der Mutationstest hat gezeigt, dass die Bezeichnung ungeprueft war: sie
     * liess sich durch eine leere Zeichenkette ersetzen, ohne dass ein Test
     * anschlug.
     */
    it('nennt in der Rueckfrage die Familie UND den Namen', () => {
        bestaetige(true);
        bestaetigeSchatzName('Physik', [schatz('Physik')]);

        const frage = (window.confirm as jest.Mock).mock.calls[0][0];
        expect(frage).toContain('Ein Erfahrungsschatz mit dem Namen');
        expect(frage).toContain('"Physik"');
    });

    /**
     * Der Name erscheint GETRIMMT. Sonst steht in der Rueckfrage
     * `"  Physik  "` — mit sichtbaren Leerzeichen zwischen den
     * Anfuehrungszeichen, was aussieht wie ein anderer Eintrag als der
     * gemeinte.
     */
    it('zeigt den Namen ohne Randleerzeichen', () => {
        bestaetige(true);
        bestaetigeSchatzName('  Physik  ', [schatz('Physik')]);

        expect((window.confirm as jest.Mock).mock.calls[0][0]).toContain('"Physik"');
    });
});

describe('persistGradingMemory', () => {
    /** Die Desktop-Fassung hat keine API-Routen — ein Netzaufruf ginge ins Leere. */
    it('legt auf dem Desktop lokal ab, ohne das Netz zu bemuehen', async () => {
        (isDesktopTarget as jest.Mock).mockReturnValue(true);
        const addLocalMemory = jest.fn();

        await persistGradingMemory({ name: 'Neu', cases: [], addLocalMemory });

        expect(apiClient.post).not.toHaveBeenCalled();
        const abgelegt = addLocalMemory.mock.calls[0][0];
        expect(abgelegt.name).toBe('Neu');
        expect(abgelegt.id).toMatch(/^local-grading-memory-\d+$/);
        expect(abgelegt.userId).toBeNull();
    });

    it('schickt ihn im Server-Betrieb an die Route', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'srv-1', name: 'Neu', cases: [] })
        });
        const addLocalMemory = jest.fn();

        await persistGradingMemory({ name: 'Neu', cases: [], addLocalMemory });

        expect(apiClient.post).toHaveBeenCalledWith('/api/user/grading-memories',
            { name: 'Neu', cases: [] });
        expect(addLocalMemory).toHaveBeenCalledWith({ id: 'srv-1', name: 'Neu', cases: [] });
    });

    /**
     * Der Stand des SERVERS kommt in die Liste, nicht der geschickte. Sonst
     * zeigte die Oberflaeche eine Kennung, die es in der Datenbank nicht gibt —
     * und die naechste Bearbeitung liefe ins Leere.
     */
    it('nimmt den Stand des Servers in die Liste auf', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'von-der-datenbank', name: 'Neu', cases: [{ id: 'c1' }] })
        });
        const addLocalMemory = jest.fn();

        await persistGradingMemory({ name: 'Neu', cases: [], addLocalMemory });

        expect(addLocalMemory.mock.calls[0][0].id).toBe('von-der-datenbank');
    });

    /**
     * Schlaegt das Speichern fehl, darf der Schatz NICHT in der Liste
     * erscheinen — sonst glaubt die Lehrkraft, er sei gesichert.
     */
    it('wirft bei Ablehnung und nimmt nichts in die Liste auf', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ message: 'Name bereits vergeben' })
        });
        const addLocalMemory = jest.fn();

        await expect(persistGradingMemory({ name: 'Neu', cases: [], addLocalMemory }))
            .rejects.toThrow('Name bereits vergeben');
        expect(addLocalMemory).not.toHaveBeenCalled();
    });

    it('wirft auch, wenn die Fehlerantwort kein JSON ist', async () => {
        (apiClient.post as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => { throw new Error('Unexpected token <'); }
        });

        await expect(persistGradingMemory({ name: 'Neu', cases: [], addLocalMemory: jest.fn() }))
            .rejects.toThrow('Fehler beim Speichern des Erfahrungsschatzes.');
    });
});
