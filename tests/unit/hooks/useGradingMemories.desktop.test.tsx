import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GradingMemory } from '@/types';

/**
 * Desktop Persistence Audit (Layer 1)
 * 🏮🛡️ Erfahrungsschätze im localStorage
 *
 * Der Desktop-Modus erreicht die serverseitige Persistenz nicht — er wird als
 * statischer Export ohne API-Routen gebaut und schreibt direkt in den
 * localStorage. Diese Tests sichern genau diesen Pfad ab, weil dort
 * Schülertexte liegen (GradingMemoryCase.studentText).
 */

jest.mock('@/lib/env-context', () => ({
    isDesktopTarget: () => true,
    isLocalInstance: () => true
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: {
        get: jest.fn(),
        post: jest.fn().mockResolvedValue({ ok: true }),
        fetch: jest.fn()
    }
}));

import useGradingMemories from '@/hooks/useGradingMemories';

const MEMORY_KEY = 'koreki_local_grading_memories';

const memory = (id: string, name: string): GradingMemory => ({
    id,
    name,
    cases: [{
        id: `case-${id}`,
        studentText: 'Die Photosynthese findet in den Mitochondrien statt.',
        expectedCorrection: { pointsObtained: 0, correctionNotes: 'Verwechslung Chloroplast/Mitochondrium' }
    }]
});

const storedMemories = (): GradingMemory[] =>
    JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? '[]');

const quarantinedKeys = () =>
    Object.keys(window.localStorage).filter(k => k.startsWith(`${MEMORY_KEY}.corrupt-`));

const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

beforeEach(() => {
    window.localStorage.clear();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('useGradingMemories — Desktop persistence', () => {

    it('persists a new memory including its student cases', async () => {
        const { result } = renderHook(() => useGradingMemories(), { wrapper });

        act(() => {
            result.current.addLocalMemory(memory('m1', 'Biologie Klasse 9'));
        });

        await waitFor(() => expect(storedMemories()).toHaveLength(1));
        expect(storedMemories()[0].name).toBe('Biologie Klasse 9');
        expect(storedMemories()[0].cases[0].studentText).toContain('Photosynthese');
    });

    it('keeps existing memories when another one is added', async () => {
        window.localStorage.setItem(MEMORY_KEY, JSON.stringify([memory('m1', 'Biologie Klasse 9')]));
        const { result } = renderHook(() => useGradingMemories(), { wrapper });

        act(() => {
            result.current.addLocalMemory(memory('m2', 'Deutsch Klasse 10'));
        });

        await waitFor(() => expect(storedMemories()).toHaveLength(2));
        expect(storedMemories().map(m => m.name).sort()).toEqual(['Biologie Klasse 9', 'Deutsch Klasse 10']);
    });

    it('replaces a memory with the same id instead of duplicating it', async () => {
        window.localStorage.setItem(MEMORY_KEY, JSON.stringify([memory('m1', 'Biologie Klasse 9')]));
        const { result } = renderHook(() => useGradingMemories(), { wrapper });

        act(() => {
            result.current.addLocalMemory({ ...memory('m1', 'Biologie Klasse 9'), cases: [] });
        });

        await waitFor(() => expect(storedMemories()[0].cases).toHaveLength(0));
        expect(storedMemories()).toHaveLength(1);
    });

    it('removes only the deleted memory', async () => {
        window.localStorage.setItem(MEMORY_KEY, JSON.stringify([
            memory('m1', 'Biologie Klasse 9'),
            memory('m2', 'Deutsch Klasse 10')
        ]));
        const { result } = renderHook(() => useGradingMemories(), { wrapper });

        await act(async () => {
            await result.current.deleteMemory('m1');
        });

        await waitFor(() => expect(storedMemories()).toHaveLength(1));
        expect(storedMemories()[0].name).toBe('Deutsch Klasse 10');
    });

    /**
     * REGRESSIONSTEST für die stille Zerstörung.
     * Bislang wurde ein unlesbarer Eintrag als leer behandelt und vom nächsten
     * Speichervorgang endgültig überschrieben — die Erfahrungsschätze einer
     * Lehrkraft waren damit unwiederbringlich weg.
     */
    it('preserves a corrupt entry instead of overwriting it on the next save', async () => {
        const damaged = '[{"id":"m1","name":"Biologie Klasse 9","cases":[';
        window.localStorage.setItem(MEMORY_KEY, damaged);

        const { result } = renderHook(() => useGradingMemories(), { wrapper });

        act(() => {
            result.current.addLocalMemory(memory('m2', 'Deutsch Klasse 10'));
        });

        await waitFor(() => expect(storedMemories()).toHaveLength(1));

        const quarantined = quarantinedKeys();
        expect(quarantined).toHaveLength(1);
        expect(window.localStorage.getItem(quarantined[0])).toBe(damaged);
    });
});
