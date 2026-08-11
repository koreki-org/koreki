import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkillProfiles } from '../../../src/hooks/useSkillProfiles';
import { apiClient } from '../../../src/lib/api-client';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));

jest.mock('../../../src/lib/api-client', () => ({
    apiClient: { get: jest.fn(), post: jest.fn() }
}));

jest.mock('../../../src/hooks/store/useDashboardStore', () => ({
    useDashboardStore: { getState: () => ({ aiSettings: null, setAiSettings: jest.fn() }) }
}));

const mockGet = apiClient.get as jest.Mock;

/**
 * Gegenstueck zu usePromptProfiles.test.ts.
 *
 * Beide Profil-Familien trugen dieselbe Konstruktion: der Lade-Effekt hing
 * ueber `fetchProfiles` -> `uebernehmeProfile` an `selectedProfileId`, und
 * `uebernehmeProfile` SETZTE diese Auswahl. Ein Effekt, der seine eigene
 * Abhaengigkeit veraendert.
 *
 * Beim Kopieren setzt `handleStartNew` die Auswahl auf '', um in den
 * Anlege-Modus zu gehen. Der dadurch ausgeloeste Nachladevorgang stellte sie
 * ueber `currentProfileRef` zurueck — die Ansicht zeigte danach ein fremdes
 * Set als geaendert, und Speichern haette dieses getroffen.
 */
describe('useSkillProfiles — Auswahl beim Anlegen', () => {
    const serverProfiles = [
        { id: 'id-fisi', name: 'FISI-Wara', isSystem: false, activeSkillIds: ['skill-a'], customSkills: {} },
        { id: 'id-bad', name: 'Bad Teacher', isSystem: false, activeSkillIds: ['skill-b'], customSkills: {} }
    ];

    const settings = {} as AppSettings;

    const mounte = () =>
        renderHook(() => useSkillProfiles(settings, jest.fn(), jest.fn(), 'id-fisi'));

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockResolvedValue({ ok: true, json: async () => serverProfiles });
    });

    /**
     * Laesst anstehende Effekte und ihre Zusagen vollstaendig durchlaufen.
     * Ohne diesen Durchlauf messen die Tests, BEVOR der Nachladevorgang landet —
     * und haetten den Fehler durchgelassen.
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
            result.current.handleStartNew(['skill-b'], 'Kopie von Bad Teacher');
        });

        await laufenLassen();

        // Genau hier sprang die Auswahl frueher auf FISI-Wara zurueck.
        expect(result.current.isCreatingNew).toBe(true);
        expect(result.current.newProfileName).toBe('Kopie von Bad Teacher');
        expect(result.current.selectedProfile).toBe('');
    });

    it('behaelt die kopierten Skills, statt die des alten Sets zu laden', async () => {
        const { result } = mounte();
        await waitFor(() => expect(result.current.selectedProfile).toBe('FISI-Wara'));

        act(() => {
            result.current.handleStartNew(['skill-b'], 'Kopie von Bad Teacher');
        });

        await laufenLassen();

        // Frueher schrieb hydrateFromProfile die Skills des zurueckgestellten
        // Sets ueber die kopierten — die Kopie enthielt danach fremde Inhalte.
        expect(result.current.activeSkillIds).toEqual(['skill-b']);
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
