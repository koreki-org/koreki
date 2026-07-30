import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { STANDARD_SKILL_PROFILES } from '@/lib/ai/standard-skills-profiles';

/**
 * Skill Profile Governance Hook (Industrial Standard)
 * 🏮🛡️🏛️
 * Ensures the last-used modular skill profile and its configurations are hydrated on session start.
 * Symmetrical to usePromptGovernance.ts.
 */
export const useSkillGovernance = (
    userData: any,
    authLoading: boolean,
    settings: AppSettings,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>
) => {
    const { isHydrated } = useDashboardStore();
    const [sessionSkillsProfileName, setSessionSkillsProfileName] = useState<string>('MINT Standard (Allgemein)');
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
        if (authLoading || !isHydrated || !userData?.id) return;

        const hydrateSkillProfile = async () => {
            // Load custom skills from localStorage
            let customSkills = {};
            if (typeof window !== 'undefined') {
                const customStored = localStorage.getItem('koreki_custom_skills');
                if (customStored) {
                    try { customSkills = JSON.parse(customStored); } catch (e) { /* noop */ }
                }
            }

            // --- DESKTOP PATH (Static Export — No Backend) ---
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_skill_profiles');
                let customProfiles: any[] = [];
                if (stored) {
                    try { customProfiles = JSON.parse(stored); } catch (e) { /* noop */ }
                }
                const allProfiles = [...STANDARD_SKILL_PROFILES, ...customProfiles];
                setProfiles(allProfiles);

                const activeSkillId = localStorage.getItem('koreki_active_skill_profile_id');
                if (activeSkillId) {
                    const profile = allProfiles.find(
                        (p: any) => p.id === activeSkillId || p.name === activeSkillId
                    );
                    if (profile) {
                        setSessionSkillsProfileName(profile.name);
                        setSettings(prev => {
                            if (prev.activeSkillProfileId === activeSkillId) return prev;
                            return {
                                ...prev,
                                activeSkillProfileId: activeSkillId,
                                activeSkillIds: profile.activeSkillIds || [],
                                customSkills: customSkills
                            };
                        });
                        return;
                    }
                }

                // Fallback: MINT Standard profile
                const standard = allProfiles.find((p: any) => p.name === 'MINT Standard (Allgemein)');
                if (standard) {
                    setSessionSkillsProfileName('MINT Standard (Allgemein)');
                    setSettings(prev => {
                        if (prev.activeSkillProfileId === 'system-mint-standard') return prev;
                        return {
                            ...prev,
                            activeSkillProfileId: 'system-mint-standard',
                            activeSkillIds: standard.activeSkillIds || [],
                            customSkills: customSkills
                        };
                    });
                }
                return;
            }

            // --- SERVER PATH (Community Multi-User / SaaS) ---
            const activeSkillId = settings.activeSkillProfileId
                || userData?.activeSkillProfileId
                || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_skill_profile_id') : null);

            if (activeSkillId) {
                const standardProfile = STANDARD_SKILL_PROFILES.find(
                    (p: any) => p.id === activeSkillId || p.name === activeSkillId
                );
                if (standardProfile) {
                    setSessionSkillsProfileName(standardProfile.name);
                    setSettings(prev => {
                        if (prev.activeSkillProfileId === activeSkillId) return prev;
                        return {
                            ...prev,
                            activeSkillProfileId: activeSkillId,
                            activeSkillIds: standardProfile.activeSkillIds || [],
                            customSkills: customSkills
                        };
                    });
                }
            }

            // 🛡️ Staggered Cookie Settling Delay (SaaS Only — Slot 2/3)
            // Serializes Logto session cookie reads across governance hooks to prevent
            // parallel withLogtoApiRoute calls from corrupting each other's session state.
            if (!isLocalInstance()) {
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            try {
                let res = await apiClient.get('/api/user/skill-profiles');

                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);

                    const currentActiveId = settings.activeSkillProfileId
                        || userData?.activeSkillProfileId
                        || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_skill_profile_id') : null);

                    if (currentActiveId) {
                        const profile = data.find(
                            (p: any) => p.id === currentActiveId || p.name === currentActiveId
                        );
                        if (profile) {
                            setSessionSkillsProfileName(profile.name);
                            setSettings(prev => {
                                if (prev.activeSkillProfileId === currentActiveId) return prev;
                                return {
                                    ...prev,
                                    activeSkillProfileId: currentActiveId,
                                    activeSkillIds: profile.activeSkillIds || [],
                                    customSkills: customSkills
                                };
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Fehler beim Laden der Skill-Profile", err);
            }
        };

        hydrateSkillProfile();
    }, [userData?.id, userData?.activeSkillProfileId, settings.activeSkillProfileId, authLoading, isHydrated, setSettings]);

    return {
        profiles,
        sessionSkillsProfileName,
        setSessionSkillsProfileName,
        setProfiles
    };
};
