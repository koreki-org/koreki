import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { STANDARD_AI_PROFILE } from './useAiProfiles';
import { isDesktopTarget } from '@/lib/env-context';

/**
 * AI Parameter Governance Hook (Stage 18)
 * Ensures that whenever a session starts, the appropriate custom or standard AI parameter
 * profile is hydrated and synced.
 */
export const useAiGovernance = (
    userData: any,
    settings: AppSettings,
    setSettings: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void
) => {
    const [sessionAiProfileName, setSessionAiProfileName] = useState<string>('Koreki Standard');

    useEffect(() => {
        const fetchAiProfileOnStart = async () => {
            let activeProfile = STANDARD_AI_PROFILE;

            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_ai_profiles');
                if (stored) {
                    try {
                        const customProfiles = JSON.parse(stored);
                        const activeId = settings.activeAiProfileId;
                        if (activeId) {
                            const found = customProfiles.find((p: any) => p.id === activeId);
                            if (found) activeProfile = found;
                        }
                    } catch (e) {}
                }
            } else if (userData) {
                try {
                    const res = await apiClient.get('/api/user/ai-profiles');
                    if (res.ok) {
                        const data = await res.json();
                        
                        // If local database bypass signal is active
                        if (data && typeof data === 'object' && data.local) {
                            const stored = localStorage.getItem('koreki_local_ai_profiles');
                            if (stored) {
                                try {
                                    const customProfiles = JSON.parse(stored);
                                    const activeId = settings.activeAiProfileId;
                                    if (activeId) {
                                        const found = customProfiles.find((p: any) => p.id === activeId);
                                        if (found) activeProfile = found;
                                    }
                                } catch (e) {}
                            }
                        } else if (Array.isArray(data)) {
                            const activeId = settings.activeAiProfileId;
                            if (activeId) {
                                const found = data.find((p: any) => p.id === activeId);
                                if (found) activeProfile = found;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Fehler beim Laden der KI-Profile", err);
                }
            }

            setSessionAiProfileName(activeProfile.name);
            setSettings(prev => ({
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
                activeAiProfileId: activeProfile.id === 'system-standard' ? undefined : activeProfile.id
            }));
        };

        fetchAiProfileOnStart();
    }, [userData?.logtoId, settings.activeAiProfileId]);

    return {
        sessionAiProfileName,
        setSessionAiProfileName
    };
};
