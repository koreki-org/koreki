import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { isLocalInstance, getKorekiMode, isKeycloakAuth, isDesktopTarget } from '@/lib/env-context';
import { User, AiStatus } from '../types';
import { getOidcUser, handleOidcCallback } from '@/lib/auth-keycloak';

export const useAuth = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    // --- AUTH BYPASS (CENTRALIZED) ---
    const localInstance = isLocalInstance();
    if (localInstance && typeof window !== 'undefined') {
        console.log(`🏮 Koreki ${getKorekiMode()} Mode Active (Local Instance)`);
    }

    // 1. Fetch User Data with TanStack Query
    const {
        data: authData,
        isLoading: authLoading,
        isFetched,
        refetch: checkAuth
    } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            // 🛡️ AUTH BYPASS / JIT BRANCH
            // Desktop instances handle identity locally without a backend.
            if (isDesktopTarget()) {
                return {
                    user: {
                        id: 'local-desktop-user',
                        username: 'Desktop User',
                        role: 'ADMIN',
                        appMode: 'PURE',
                        credits: 9999,
                        avvAccepted: true,
                        canEditPrompts: true,
                        hasGlobalAiKey: process.env.NEXT_PUBLIC_HAS_GLOBAL_MISTRAL_KEY === 'true'
                    } as User,
                    aiStatus: { ocrBrakeActive: false, correctionBrakeActive: false, message: '' } as AiStatus,
                    globalAiSettings: null
                };
            }

            // 🏛️ COMMUNITY MULTI-USER (KEYCLOAK) PRE-SYNC
            // Ensure session is active before pinging /api/user.
            if (isKeycloakAuth()) {
                await handleOidcCallback();
                const oidcUser = await getOidcUser();
                if (!oidcUser) {
                    return null; // Triggers redirect in AuthGuard
                }
                // 🛡️ Identität wird NICHT im LocalStorage gespiegelt. Der Backend-Zugriff
                // erfolgt ausschließlich über das signierte Access Token (siehe api-client.ts).
            }

            // Standard Path: Fetch user data from backend (SaaS or Community Multi-User)
            try {
                const res = await apiClient.fetch('/api/user');
                const data = await res.json();
                if (data.loggedIn && data.user) {
                    return { 
                        user: data.user as User, 
                        aiStatus: data.aiStatus as AiStatus,
                        globalAiSettings: data.globalAiSettings
                    };
                }
                return null;
            } catch (err) {
                console.error("[useAuth] CRITICAL: Auth check failed", err);
                return null;
            }
        },
        retry: 1,
        staleTime: 5000,
    });

    /**
     * Functional state update via TanStack Query Cache 🏮🛡️
     * Ensures consistent credit management across all components.
     */
    const setUserData = useCallback((updater: any) => {
        queryClient.setQueryData(['user'], (oldData: any) => {
            if (!oldData) return null;
            const newUserData = typeof updater === 'function' ? updater(oldData.user) : updater;
            return { ...oldData, user: newUserData };
        });
    }, [queryClient]);

    // 2. AI Status (Derived or fetched)
    const {
        data: aiStatus,
        refetch: fetchAiStatus
    } = useQuery({
        queryKey: ['aiStatus'],
        queryFn: async () => {
            if (localInstance) return authData?.aiStatus || null;
            const res = await apiClient.fetch('/api/ai-status');
            if (res.ok) return await res.json() as AiStatus;
            return null;
        },
        enabled: !!authData && !localInstance,
        initialData: authData?.aiStatus,
        refetchInterval: localInstance ? undefined : 60000,
    });

    return {
        userData: authData?.user || null,
        setUserData,
        aiStatus: aiStatus || authData?.aiStatus || null,
        globalAiSettings: authData?.globalAiSettings || null,
        authLoading,
        isFetched,
        checkAuth,
        fetchAiStatus
    };
};
