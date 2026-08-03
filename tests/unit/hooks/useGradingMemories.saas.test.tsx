import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Netzwerkpfad-Audit (Layer 1)
 * 🛡️ Absicherung gegen 401-Fehler auf /api/user/grading-memories
 *
 * Zwei Regressionen werden hier festgenagelt:
 *
 * 1. AUTH-GATE — Der Hook wird in app.tsx im Component-Body aufgerufen, also
 *    außerhalb des AuthGuard. Ohne Gate feuert er auch dann, wenn noch keine
 *    Session existiert (Login, abgelaufene Session, Redirect zum Login) und
 *    erzeugt ein garantiertes 401 in der Browser-Konsole.
 *
 * 2. REQUEST-VERSTÄRKUNG — Der Hook ist mehrfach gleichzeitig gemountet
 *    (app.tsx, GradingMemoryModal, je eine Instanz pro BatchTaskAnalysisCard).
 *    Ein notifizierender Mount-Fetch löste über den window-Event-Listener in
 *    jeder Instanz einen weiteren Fetch aus: N + N² Requests auf denselben
 *    Endpoint. In der Batch-Done-Ansicht mit 5 Tasks waren das 56 Requests.
 *
 * Gefahren wird als Community Multi-User (isLocalInstance=true, isDesktopTarget=false):
 * derselbe Netzwerkpfad wie SaaS, aber ohne den 1500ms Cookie-Settling-Delay.
 * Beide geprüften Verhalten liegen vor bzw. unabhängig von dieser Verzweigung,
 * die Assertions gelten für den SaaS-Modus unverändert.
 */

jest.mock('@/lib/env-context', () => ({
    isDesktopTarget: () => false,
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
import { apiClient } from '@/lib/api-client';

const mockGet = apiClient.get as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

/** Lässt Microtasks und fällige Timer durchlaufen, damit späte Fetches sichtbar werden. */
const settle = async (ms = 50) => {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, ms));
    });
};

const SESSION = { id: 'user-1' };

beforeEach(() => {
    window.localStorage.clear();
    mockGet.mockReset();
    mockGet.mockResolvedValue({ ok: true, json: async () => [] });
});

describe('useGradingMemories — Netzwerkpfad', () => {

    it('sendet keinen Request, solange keine Session aufgelöst ist', async () => {
        renderHook(() => useGradingMemories(undefined), { wrapper });

        await settle();

        expect(mockGet).not.toHaveBeenCalled();
    });

    it('lädt, sobald die Session verfügbar wird', async () => {
        const { rerender } = renderHook(
            ({ user }: { user: any }) => useGradingMemories(user),
            { wrapper, initialProps: { user: undefined as any } }
        );

        await settle();
        expect(mockGet).not.toHaveBeenCalled();

        rerender({ user: SESSION });

        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
        expect(mockGet).toHaveBeenCalledWith('/api/user/grading-memories');
    });

    /**
     * REGRESSIONSTEST für die Request-Verstärkung.
     * Vor dem Fix: 3 Instanzen → 3 + 3² = 12 Requests.
     */
    it('verstärkt Requests nicht, wenn mehrere Instanzen gemountet sind', async () => {
        renderHook(() => {
            useGradingMemories(SESSION);
            useGradingMemories(SESSION);
            useGradingMemories(SESSION);
        }, { wrapper });

        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(3));

        // Eine event-getriebene zweite Welle würde verzögert eintreffen.
        await settle();

        expect(mockGet).toHaveBeenCalledTimes(3);
    });

    /**
     * Gegenprobe zum Fix oben: Die Cross-Instanz-Synchronisation nach einer
     * Mutation muss erhalten bleiben — nur der Mount-Fetch darf nicht mehr
     * notifizieren.
     */
    it('synchronisiert weiterhin alle Instanzen nach selectMemory', async () => {
        const { result } = renderHook(() => {
            const first = useGradingMemories(SESSION);
            useGradingMemories(SESSION);
            return first;
        }, { wrapper });

        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
        mockGet.mockClear();

        act(() => {
            result.current.selectMemory('memory-1');
        });

        await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });
});
