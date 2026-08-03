import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { STANDARD_AI_PROFILE, MATH_AI_PROFILE } from './useAiProfiles';
import { isDesktopTarget } from '@/lib/env-context';
import { awaitSettlingSlot, SettlingSlot } from '@/lib/session-settling';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

/**
 * AI Parameter Governance Hook (Stage 18)
 * Ensures that whenever a session starts, the appropriate custom or standard AI parameter
 * profile is hydrated and synced.
 */
export const useAiGovernance = (
    userData: any,
    authLoading: boolean,
    settings: AppSettings,
    setSettings: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void
) => {
    const { isHydrated } = useDashboardStore();
    const [sessionAiProfileName, setSessionAiProfileName] = useState<string>('Standard');

    useEffect(() => {
        if (authLoading || !isHydrated || !userData?.id) return;

        const fetchAiProfileOnStart = async () => {
            let activeProfile = STANDARD_AI_PROFILE;
            // Hybrid Sync (Arch §2): localStorage (Desktop/Community) → DB field (SaaS)
            const activeId = settings.activeAiProfileId
                || userData?.activeAiProfileId
                || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_ai_profile_id') : null);

            if (activeId === 'system-math') {
                activeProfile = MATH_AI_PROFILE;
            } else if (activeId === 'system-standard') {
                activeProfile = STANDARD_AI_PROFILE;
            } else if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_ai_profiles');
                if (stored) {
                    try {
                        const customProfiles = JSON.parse(stored);
                        if (activeId) {
                            const found = customProfiles.find((p: any) => p.id === activeId);
                            if (found) activeProfile = found;
                        }
                    } catch (e) {}
                }
            } else if (userData) {
                await awaitSettlingSlot(SettlingSlot.AI_PROFILES);

                try {
                    let res = await apiClient.get('/api/user/ai-profiles');

                    if (res.ok) {
                        const data = await res.json();
                        
                        // If local database bypass signal is active
                        if (data && typeof data === 'object' && data.local) {
                            const stored = localStorage.getItem('koreki_local_ai_profiles');
                            if (stored) {
                                try {
                                    const customProfiles = JSON.parse(stored);
                                    if (activeId) {
                                        const found = customProfiles.find((p: any) => p.id === activeId);
                                        if (found) activeProfile = found;
                                    }
                                } catch (e) {}
                            }
                        } else if (Array.isArray(data)) {
                            if (activeId) {
                                const found = data.find((p: any) => p.id === activeId);
                                if (found) {
                                    activeProfile = found;
                                } else if (activeId !== 'system-standard' && activeId !== 'system-math') {
                                    // Custom ID specified but not found in returned profiles array (yet).
                                    // Do NOT reset to standard — preserve selection to prevent wiping local storage.
                                    console.warn(`[AI Governance] Custom AI profile ID "${activeId}" not found in fetched profiles.`);
                                    return;
                                }
                            }
                        }
                    } else if (activeId && activeId !== 'system-standard' && activeId !== 'system-math') {
                        // API request failed. Preserve current selection.
                        console.warn(`[AI Governance] API failed. Preserving current custom profile ID "${activeId}".`);
                        return;
                    }
                } catch (err) {
                    console.error("Fehler beim Laden der KI-Profile", err);
                    if (activeId && activeId !== 'system-standard' && activeId !== 'system-math') {
                        return;
                    }
                }
            }

            setSessionAiProfileName(activeProfile.name);
            setSettings(prev => {
                const targetActiveAiProfileId = activeProfile.id === 'system-standard' ? undefined : activeProfile.id;
                // Prevent redundant state updates & subsequent hook re-triggers
                if (
                    prev.temperature === activeProfile.temperature &&
                    prev.topP === activeProfile.topP &&
                    prev.maxTokens === activeProfile.maxTokens &&
                    prev.presencePenalty === activeProfile.presencePenalty &&
                    prev.enableThinking === activeProfile.enableThinking &&
                    prev.visionTemperature === activeProfile.visionTemperature &&
                    prev.visionTopP === activeProfile.visionTopP &&
                    prev.visionMaxTokens === activeProfile.visionMaxTokens &&
                    prev.visionPresencePenalty === activeProfile.visionPresencePenalty &&
                    prev.activeAiProfileId === targetActiveAiProfileId
                ) {
                    return prev;
                }
                return {
                    ...prev,
                    temperature: activeProfile.temperature,
                    topP: activeProfile.topP,
                    maxTokens: activeProfile.maxTokens,
                    presencePenalty: activeProfile.presencePenalty,
                    enableThinking: activeProfile.enableThinking,
                    visionTemperature: activeProfile.visionTemperature,
                    visionTopP: activeProfile.visionTopP,
                    visionMaxTokens: activeProfile.visionMaxTokens,
                    visionPresencePenalty: activeProfile.visionPresencePenalty,
                    activeAiProfileId: targetActiveAiProfileId
                };
            });
        };

        fetchAiProfileOnStart();
    }, [userData?.id, userData?.activeAiProfileId, settings.activeAiProfileId, authLoading, isHydrated, setSettings]);

    return {
        sessionAiProfileName,
        setSessionAiProfileName
    };
};
