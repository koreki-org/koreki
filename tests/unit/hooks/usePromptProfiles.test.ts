import { renderHook, act, waitFor } from '@testing-library/react';
import { usePromptProfiles } from '../../../src/hooks/usePromptProfiles';
import { apiClient } from '../../../src/lib/api-client';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));

jest.mock('../../../src/lib/api-client', () => ({
    apiClient: { get: jest.fn(), post: jest.fn() }
}));

const mockGet = apiClient.get as jest.Mock;

/**
 * REGRESSIONSTEST fuer ein Flackern beim Kopieren eines Profils.
 *
 * Der Lade-Effekt hing ueber `fetchProfiles` -> `uebernehmeProfile` an
 * `selectedProfileId` — und `uebernehmeProfile` SETZTE diese Auswahl. Ein
 * Effekt, der seine eigene Abhaengigkeit veraendert.
 *
 * Beim Kopieren setzt `handleStartNew` die Auswahl auf '', um in den
 * Anlege-Modus zu gehen. Der dadurch ausgeloeste Nachladevorgang fand ueber
 * `currentProfileRef` das bisher zugewiesene Profil und stellte die Auswahl
 * zurueck. Sichtbar war ein Hin- und Herspringen der Beschriftung; gefaehrlich
 * war der Zustand danach: die Ansicht zeigte ein FREMDES Profil als
 * "ungespeichert", waehrend im Editor der kopierte Prompt stand. Ein Klick auf
 * Speichern haette das fremde Profil ueberschrieben.
 */
describe('usePromptProfiles — Auswahl beim Anlegen', () => {
    const profile = (id: string, name: string, correctionPrompt: string) =>
        ({ id, name, correctionPrompt, isSystem: false });

    const serverProfiles = [
        profile('id-fisi', 'FISI-Wara', 'Prompt von FISI-Wara'),
        profile('id-bad', 'Bad Teacher', 'Prompt von Bad Teacher')
    ];

    const settings = { correctionPrompt: '' } as AppSettings;

    const antwortet = (data: any[]) => {
        mockGet.mockResolvedValue({ ok: true, json: async () => data });
    };

    const mounte = () =>
        renderHook(() => usePromptProfiles(settings, jest.fn(), jest.fn(), 'id-fisi'));

    beforeEach(() => {
        jest.clearAllMocks();
        antwortet(serverProfiles);
    });

    /**
     * Laesst anstehende Effekte und ihre Zusagen vollstaendig durchlaufen.
     *
     * Noetig, weil der fehlerhafte Zustand erst NACH dem Nachladevorgang
     * entstand. Ohne diesen Durchlauf haetten die Tests unten auch mit dem
     * Fehler bestanden — sie haetten gemessen, bevor der Schaden eintrat.
     * Der Mock loest ueber Microtasks auf, der Durchlauf ist damit
     * deterministisch und haengt nicht an einer Wartezeit.
     */
    const laufenLassen = async () => {
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
    };

    it('richtet die Auswahl beim Laden auf den uebergebenen Verweis aus', async () => {
        const { result } = mounte();

        await waitFor(() => expect(result.current.selectedProfile).toBe('FISI-Wara'));
    });

    it('bleibt im Anlege-Modus, wenn waehrend des Kopierens nachgeladen wird', async () => {
        const { result } = mounte();
        await waitFor(() => expect(result.current.selectedProfile).toBe('FISI-Wara'));

        act(() => {
            result.current.handleStartNew('Prompt von Bad Teacher', 'Kopie von Bad Teacher');
        });

        // Genau hier sprang die Auswahl frueher auf FISI-Wara zurueck.
        await laufenLassen();
        expect(result.current.isCreatingNew).toBe(true);
        expect(result.current.newProfileName).toBe('Kopie von Bad Teacher');
        expect(result.current.selectedProfile).toBe('');
    });

    it('meldet den kopierten Stand nicht als Aenderung an einem fremden Profil', async () => {
        const { result } = mounte();
        await waitFor(() => expect(result.current.selectedProfile).toBe('FISI-Wara'));

        act(() => {
            result.current.handleStartNew('Prompt von Bad Teacher', 'Kopie von Bad Teacher');
        });

        await laufenLassen();
        expect(result.current.isCreatingNew).toBe(true);

        // Frueher zeigte die Ansicht FISI-Wara als "ungespeichert", waehrend im
        // Editor der Prompt von Bad Teacher stand — Speichern haette FISI-Wara
        // ueberschrieben.
        expect(result.current.selectedProfile).not.toBe('FISI-Wara');
        expect(result.current.correctionPrompt).toBe('Prompt von Bad Teacher');
    });

    it('laedt nicht endlos nach, wenn sich die Auswahl aendert', async () => {
        const { result } = mounte();
        await waitFor(() => expect(result.current.selectedProfile).toBe('FISI-Wara'));

        const nachErstemLauf = mockGet.mock.calls.length;

        act(() => {
            result.current.handleSelectProfile(serverProfiles[1]);
        });

        await waitFor(() => expect(result.current.selectedProfile).toBe('Bad Teacher'));

        // Die Auswahl zu wechseln ist kein Grund, die Liste erneut zu holen.
        expect(mockGet.mock.calls.length).toBe(nachErstemLauf);
    });
});
