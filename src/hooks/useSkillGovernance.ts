import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { awaitSettlingSlot, SettlingSlot } from '@/lib/session-settling';
import { STANDARD_SKILL_PROFILES, DEFAULT_SKILL_PROFILE_NAME, DEFAULT_SKILL_PROFILE_ID } from '@/lib/ai/standard-skills-profiles';
import { resolveProfileRef } from '@/lib/services/profile-naming';

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
                const profile = resolveProfileRef(allProfiles, activeSkillId);
                if (profile) {
                    // Die kanonische ID zurueckschreiben: Wurde die Referenz nur
                    // ueber den Namen aufgeloest (Altbestand), steht ab jetzt die
                    // ID dort — ein spaeteres Umbenennen bricht sie nicht mehr.
                    const kanonischeId = profile.id || activeSkillId!;
                    if (kanonischeId !== activeSkillId) {
                        localStorage.setItem('koreki_active_skill_profile_id', kanonischeId);
                    }
                    setSessionSkillsProfileName(profile.name);
                    setSettings(prev => {
                        if (prev.activeSkillProfileId === kanonischeId) return prev;
                        return {
                            ...prev,
                            activeSkillProfileId: kanonischeId,
                            activeSkillIds: profile.activeSkillIds || [],
                            customSkills: customSkills
                        };
                    });
                    return;
                }

                // Fallback: MINT Standard profile
                const standard = allProfiles.find((p: any) => p.id === DEFAULT_SKILL_PROFILE_ID);
                if (standard) {
                    setSessionSkillsProfileName(DEFAULT_SKILL_PROFILE_NAME);
                    setSettings(prev => {
                        if (prev.activeSkillProfileId === DEFAULT_SKILL_PROFILE_ID) return prev;
                        return {
                            ...prev,
                            activeSkillProfileId: DEFAULT_SKILL_PROFILE_ID,
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

            const standardProfile = resolveProfileRef(STANDARD_SKILL_PROFILES, activeSkillId);
            if (standardProfile) {
                setSessionSkillsProfileName(standardProfile.name);
                setSettings(prev => {
                    if (prev.activeSkillProfileId === standardProfile.id) return prev;
                    return {
                        ...prev,
                        activeSkillProfileId: standardProfile.id,
                        activeSkillIds: standardProfile.activeSkillIds || [],
                        customSkills: customSkills
                    };
                });
            }

            await awaitSettlingSlot(SettlingSlot.SKILL_PROFILES);

            try {
                let res = await apiClient.get('/api/user/skill-profiles');

                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data);

                    const currentActiveId = settings.activeSkillProfileId
                        || userData?.activeSkillProfileId
                        || (typeof window !== 'undefined' ? localStorage.getItem('koreki_active_skill_profile_id') : null);

                    const profile = resolveProfileRef<any>(data, currentActiveId);

                    if (profile) {
                        const kanonischeId = profile.id || currentActiveId;
                        if (typeof window !== 'undefined' && kanonischeId !== currentActiveId) {
                            localStorage.setItem('koreki_active_skill_profile_id', kanonischeId);
                        }
                        setSessionSkillsProfileName(profile.name);
                        setSettings(prev => {
                            if (prev.activeSkillProfileId === kanonischeId) return prev;
                            return {
                                ...prev,
                                activeSkillProfileId: kanonischeId,
                                activeSkillIds: profile.activeSkillIds || [],
                                customSkills: customSkills
                            };
                        });
                    } else {
                        // Ohne ausdrueckliche Wahl blieben activeSkillIds bisher leer — die Kopfzeile
                        // zeigte "MINT Standard", der Prompt bekam aber keinen einzigen Skill
                        // (prompt-builder ueberspringt eine leere Liste). Damit fehlten auch die
                        // Definitionen der Korrekturzeichen, die das Modell dann frei erfand.
                        // Der Desktop-Pfad kennt diesen Rueckfall bereits; hier fehlte er.
                        const standard = resolveProfileRef(data, DEFAULT_SKILL_PROFILE_ID)
                            || data.find((p: any) => p.name === DEFAULT_SKILL_PROFILE_NAME);
                        if (standard) {
                            setSessionSkillsProfileName(standard.name);
                            setSettings(prev => {
                                if (prev.activeSkillIds && prev.activeSkillIds.length > 0) return prev;
                                return {
                                    ...prev,
                                    activeSkillIds: standard.activeSkillIds || [],
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
