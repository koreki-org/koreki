import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';

export const usePromptGovernance = (
    userData: any,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
) => {
    const [sessionProfileName, setSessionProfileName] = useState<string>('Standard');
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const res = await apiClient.get('/api/user/prompt-profiles');
                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);

                    // --- INDUSTRIAL CONTEXT HYDRATION ---
                    // Source the Pedagogical Memory (PromptProfile)
                    const activePromptId = userData?.activePromptProfileId;
                    
                    if (activePromptId) {
                        const profile = data.find((p: any) => p.id === activePromptId || p.name === activePromptId);
                        if (profile) {
                            setSessionProfileName(profile.name);
                            setSettings(prev => ({
                                ...prev,
                                correctionPrompt: profile.correctionPrompt
                            }));
                        }
                    } else {
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
                }
            } catch (err) {
                console.error("Fehler beim Laden der Profile", err);
            }
        };
        if (userData) fetchProfiles();
    }, [userData?.logtoId, setSettings]);

    return {
        profiles,
        sessionProfileName,
        setSessionProfileName,
        setProfiles
    };
};
