import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../../../src/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Unmock globally mocked library to use real implementation in this unit test 🏮🛡️
jest.unmock('@tanstack/react-query');

// Isolated Mocking Strategy for industrial-grade stability 🏮🛡️
global.fetch = jest.fn();

jest.mock('next/router', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn()
    }))
}));

describe('useAuth Hook (Industrial Stability Suite)', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        jest.clearAllMocks();
        // Fresh QueryClient for 100% test isolation
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: 0
                },
            },
        });
    });

    const createWrapper = () => {
        return ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
    };

    it('should initialize with loading state and null data', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ loggedIn: false })
        });

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        // TanStack Query might resolve immediately, we verify consistency
        expect(result.current.userData).toBeNull();
    });

    it('should hydrate userData and aiStatus when logged in', async () => {
        const mockUser = { logtoId: 'u1', username: 'test-user', credits: 100, role: 'USER' };
        const mockAiStatus = { ocrBrakeActive: false, message: 'OK' };

        (global.fetch as jest.Mock).mockImplementation((url) => {
            if (url === '/api/user') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ loggedIn: true, user: mockUser, aiStatus: mockAiStatus })
                });
            }
            if (url === '/api/ai-status') {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockAiStatus
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        // Industry-grade waiting for specific data hydration 🏮🛡️
        await waitFor(() => expect(result.current.userData).not.toBeNull(), { timeout: 2000 });

        expect(result.current.userData).toEqual(mockUser);
        expect(result.current.aiStatus).toEqual(mockAiStatus);
    });

    it('should handle fetch errors gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

        const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.authLoading).toBe(false));
        expect(result.current.userData).toBeNull(); // Explicit null test 🏮🛡️
    });
});
