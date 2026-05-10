import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { STANDARD_PROFILES } from '@/lib/ai/standard-profiles';

/**
 * Prompt Profile Governance Hook (Industrial Standard)
 * 🏮🛡️🏛️
 * Ensures the last-used pedagogical prompt profile is hydrated on session start.
 * 
 * Persistence Strategy (Hybrid Sync — Arch Principle §2):
 * - SaaS: DB-persistent via `User.activePromptProfileId`
 * - Desktop: localStorage (`koreki_active_prompt_profile_id`) — no backend available
 * - Community: API-fetched profiles + localStorage fallback for active selection
 */
export const usePromptGovernance = (
    userData: any,
    authLoading: boolean,
    settings: AppSettings,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
) => {
    const { isHydrated } = useDashboardStore();
    const [sessionProfileName, setSessionProfileName] = useState<string>('Standard');
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
        if (authLoading || !isHydrated || !userData?.id) return;

        const hydratePromptProfile = async () => {
            // --- DESKTOP PATH (Static Export — No Backend) ---
            // Profiles live exclusively in localStorage (§2 File-Sync/Hybrid).
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_profiles');
                let customProfiles: any[] = [];
                if (stored) {
                    try { customProfiles = JSON.parse(stored); } catch (e) { /* noop */ }
                }
                const allProfiles = [...STANDARD_PROFILES, ...customProfiles];
                setProfiles(allProfiles);

                const activePromptId = localStorage.getItem('koreki_active_prompt_profile_id');
                if (activePromptId) {
                    const profile = allProfiles.find(
                        (p: any) => p.id === activePromptId || p.name === activePromptId
                    );
                    if (profile) {
                        setSessionProfileName(profile.name);
                        setSettings(prev => {
                            if (prev.correctionPrompt === profile.correctionPrompt && prev.activePromptProfileId === activePromptId) return prev;
                            return {
                                ...prev,
                                correctionPrompt: profile.correctionPrompt,
                                activePromptProfileId: activePromptId
                            };
                        });
                        return;
                    }
                }

                // Fallback: Standard profile
                const standard = allProfiles.find((p: any) => p.name === 'Standard');
                if (standard) {
                    setSessionProfileName('Standard');
                    setSettings(prev => {
                        if (prev.correctionPrompt === standard.correctionPrompt && prev.activePromptProfileId === 'system-standard') return prev;
                        return {
                            ...prev,
                            correctionPrompt: standard.correctionPrompt,
                            activePromptProfileId: 'system-standard'
                        };
                    });
                }
                return;
            }

            // --- SERVER PATH (Community Multi-User / SaaS) ---
            // Fast Sync: If it is a static standard profile, hydrate instantly without waiting for network request
            const activePromptId = settings.activePromptProfileId
                || userData?.activePromptProfileId
                || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_prompt_profile_id') : null);

            if (activePromptId) {
                const standardProfile = STANDARD_PROFILES.find(
                    (p: any) => p.id === activePromptId || p.name === activePromptId
                );
                if (standardProfile) {
                    setSessionProfileName(standardProfile.name);
                    setSettings(prev => {
                        if (prev.correctionPrompt === standardProfile.correctionPrompt && prev.activePromptProfileId === activePromptId) return prev;
                        return {
                            ...prev,
                            correctionPrompt: standardProfile.correctionPrompt,
                            activePromptProfileId: activePromptId
                        };
                    });
                }
            }

            try {
                const res = await apiClient.get('/api/user/prompt-profiles');
                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);

                    // --- INDUSTRIAL CONTEXT HYDRATION ---
                    // Priority: settings state → DB field (SaaS) → localStorage fallback (Community)
                    const currentActiveId = settings.activePromptProfileId
                        || userData?.activePromptProfileId
                        || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_prompt_profile_id') : null);

                    if (currentActiveId) {
                        const profile = data.find(
                            (p: any) => p.id === currentActiveId || p.name === currentActiveId
                        );
                        if (profile) {
                            setSessionProfileName(profile.name);
                            setSettings(prev => {
                                if (prev.correctionPrompt === profile.correctionPrompt && prev.activePromptProfileId === currentActiveId) return prev;
                                return {
                                    ...prev,
                                    correctionPrompt: profile.correctionPrompt,
                                    activePromptProfileId: currentActiveId
                                };
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Fehler beim Laden der Profile", err);
            }
        };

        hydratePromptProfile();
    }, [userData?.id, userData?.activePromptProfileId, settings.activePromptProfileId, authLoading, isHydrated, setSettings]);

    return {
        profiles,
        sessionProfileName,
        setSessionProfileName,
        setProfiles
    };
};
