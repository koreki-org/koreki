import { useState, useEffect } from 'react';
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
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
) => {
    const [sessionProfileName, setSessionProfileName] = useState<string>('Standard');
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
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
                        setSettings(prev => ({
                            ...prev,
                            correctionPrompt: profile.correctionPrompt
                        }));
                        return;
                    }
                }

                // Fallback: Standard profile
                const standard = allProfiles.find((p: any) => p.name === 'Standard');
                if (standard) {
                    setSessionProfileName('Standard');
                    setSettings(prev => ({
                        ...prev,
                        correctionPrompt: standard.correctionPrompt
                    }));
                }
                return;
            }

            // --- SERVER PATH (Community Multi-User / SaaS) ---
            try {
                const res = await apiClient.get('/api/user/prompt-profiles');
                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);

                    // --- INDUSTRIAL CONTEXT HYDRATION ---
                    // Priority: DB field (SaaS) → localStorage fallback (Community)
                    const activePromptId = userData?.activePromptProfileId
                        || localStorage.getItem('koreki_active_prompt_profile_id')
                        || null;
                    
                    if (activePromptId) {
                        const profile = data.find(
                            (p: any) => p.id === activePromptId || p.name === activePromptId
                        );
                        if (profile) {
                            setSessionProfileName(profile.name);
                            setSettings(prev => ({
                                ...prev,
                                correctionPrompt: profile.correctionPrompt
                            }));
                            return;
                        }
                    }

                    // Fallback to Standard
                    const standard = data.find((p: any) => p.name === 'Standard');
                    if (standard) {
                        setSessionProfileName('Standard');
                        setSettings(prev => ({
                            ...prev,
                            correctionPrompt: standard.correctionPrompt
                        }));
                    }
                }
            } catch (err) {
                console.error("Fehler beim Laden der Profile", err);
            }
        };

        if (userData) hydratePromptProfile();
    }, [userData?.id, setSettings]);

    return {
        profiles,
        sessionProfileName,
        setSessionProfileName,
        setProfiles
    };
};
