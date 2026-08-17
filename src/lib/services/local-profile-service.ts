import { logger } from '@/lib/logger';
import { buildStoragePath, createProfileMutations } from './local-profile-store';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EXPERT_REGISTRY } from '@/prompts/expert-profiles';
import { STANDARD_SKILL_PROFILES } from '../ai/standard-skills-profiles';
import { isLocalInstance } from '../env-context';
import { GradingMemoryCase, GradingMemory } from '../../types';
import { readJsonArray, readJsonArrayForUpdate, readJsonObject, writeJsonAtomic } from './json-vault';
import { isSameName, nameTakenMessage } from './profile-naming';

interface StoredExpertProfile {
    id: string;
    name: string;
    correctionPrompt: string;
    isSystem: boolean;
}

interface StoredAiProfile {
    id: string;
    name: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    presencePenalty: number;
    enableThinking: boolean;
    visionTemperature: number;
    visionTopP: number;
    visionMaxTokens: number;
    visionPresencePenalty: number;
    ollamaNumCtx?: number;
}

interface StoredSkillProfile {
    id: string;
    name: string;
    activeSkillIds: string[];
    customSkills: Record<string, unknown>;
    isSystem: boolean;
}

/**
 * Industrial Local Profile Service (Stage 10)
 * 🏮🛡️🏛️
 * Handles persistence of expert profiles in the local filesystem
 * when no database is available (Community & Desktop editions).
 */

/**
 * 🏮 Verhindert zwei gleichnamige Einträge beim Umbenennen — die Regel und ihre
 * Begründung stehen in profile-naming.ts. Die Datenbank erzwingt sie über
 * `@@unique([name, userId])`; hier gibt es keinen solchen Zwang, also muss der
 * Dienst selbst prüfen.
 */
const assertNameIsFree = (
    profiles: { id?: string; name?: string }[],
    id: string,
    newName: string,
    label: string
): void => {
    if (profiles.some(p => p?.id !== id && isSameName(p?.name, newName))) {
        throw new Error(nameTakenMessage(label));
    }
};

const getStoragePath = (userId?: string) =>
    buildStoragePath('profiles', 'LocalProfileService', userId);

export const LocalProfileService = {
    async getAvailableProfiles(userId?: string) {
        const profiles = Object.values(EXPERT_REGISTRY).map(entry => ({
            id: entry.metadata.id,
            name: entry.metadata.name,
            isSystem: true,
            correctionPrompt: entry.promptSnippet
        }));
        
        try {
            const customProfiles = readJsonArray<StoredExpertProfile>(getStoragePath(userId));
            // Industrial Cleaning: Filter out malformed entries
            const cleaned = customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
            return [...profiles, ...cleaned];
        } catch (err) {
            logger.error('[LocalProfileService] Error reading profiles:', err);
        }

        return profiles;
    },

    async upsertProfile(data: { id?: string, name: string, correctionPrompt: string }, userId?: string) {
        const storagePath = getStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<StoredExpertProfile>(storagePath);

        // Industrial Guard: Prevent [object Object] by forcing string type
        const safePrompt = typeof data.correctionPrompt === 'string' 
            ? data.correctionPrompt 
            : String(data.correctionPrompt || '');

        // Mit Kennung ist der Datensatz eindeutig; ohne ist es ein Neuanlegen,
        // bei dem der Name entscheidet — dann aber nach `isSameName`, damit ein
        // zugesagtes Ueberschreiben nicht doch eine Dublette anlegt.
        const existingIdx = data.id
            ? customProfiles.findIndex(p => p.id === data.id)
            : customProfiles.findIndex(p => isSameName(p.name, data.name));

        let gespeichert: StoredExpertProfile;
        if (existingIdx >= 0) {
            customProfiles[existingIdx].correctionPrompt = safePrompt;
            gespeichert = customProfiles[existingIdx];
        } else {
            gespeichert = {
                id: `local-${Date.now()}`,
                name: data.name,
                correctionPrompt: safePrompt,
                isSystem: false
            };
            customProfiles.push(gespeichert);
        }

        writeJsonAtomic(storagePath, customProfiles);
        // Die Kennung gehoert in die Antwort — der Client richtet seine Auswahl danach aus.
        return gespeichert;
    },

    ...createProfileMutations<StoredExpertProfile>({
        getPath: getStoragePath,
        dienstName: 'LocalProfileService',
        bezeichnung: 'Profil',
        readForUpdate: readJsonArrayForUpdate,
        write: writeJsonAtomic,
        assertNameIsFree
    })
};

const getAiStoragePath = (userId?: string) =>
    buildStoragePath('ai_profiles', 'LocalAiProfileService', userId);

export const LocalAiProfileService = {
    async getAvailableProfiles(userId?: string) {
        try {
            const customProfiles = readJsonArray<StoredAiProfile>(getAiStoragePath(userId));
            // Industrial Cleaning: Filter out malformed entries
            return customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
        } catch (err) {
            logger.error('[LocalAiProfileService] Error reading profiles:', err);
        }

        return [];
    },

    async upsertProfile(data: any, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<StoredAiProfile>(storagePath);

        const existingIdx = customProfiles.findIndex(p => (data.id && p.id === data.id) || isSameName(p.name, data.name));
        
        const profileData = {
            id: data.id || `local-ai-${Date.now()}`,
            name: data.name,
            temperature: Number(data.temperature ?? 0.2),
            topP: Number(data.topP ?? 0.8),
            maxTokens: Number(data.maxTokens ?? 32768),
            presencePenalty: Number(data.presencePenalty ?? 0.0),
            enableThinking: data.enableThinking !== undefined ? Boolean(data.enableThinking) : true,
            visionTemperature: Number(data.visionTemperature ?? 0.0),
            visionTopP: Number(data.visionTopP ?? 0.8),
            visionMaxTokens: Number(data.visionMaxTokens ?? 4000),
            visionPresencePenalty: Number(data.visionPresencePenalty ?? 0.0),
            ollamaNumCtx: data.ollamaNumCtx !== undefined ? Number(data.ollamaNumCtx) : undefined
        };

        if (existingIdx >= 0) {
            customProfiles[existingIdx] = profileData;
        } else {
            customProfiles.push(profileData);
        }

        writeJsonAtomic(storagePath, customProfiles);
        return profileData;
    },

    ...createProfileMutations<StoredAiProfile>({
        getPath: getAiStoragePath,
        dienstName: 'LocalAiProfileService',
        bezeichnung: 'KI-Profil',
        readForUpdate: readJsonArrayForUpdate,
        write: writeJsonAtomic,
        assertNameIsFree
    })
};

const getGradingMemoryStoragePath = (userId?: string) =>
    buildStoragePath('grading_memories', 'LocalGradingMemoryService', userId);

export const LocalGradingMemoryService = {
    async getAvailableProfiles(userId?: string): Promise<GradingMemory[]> {
        try {
            const customProfiles = readJsonArray<GradingMemory>(getGradingMemoryStoragePath(userId));
            // Industrial Cleaning: Filter out malformed entries
            return customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
        } catch (err) {
            logger.error('[LocalGradingMemoryService] Error reading profiles:', err);
        }

        return [];
    },

    async upsertProfile(data: Partial<GradingMemory> & { name: string, cases: GradingMemoryCase[] }, userId?: string): Promise<GradingMemory> {
        const storagePath = getGradingMemoryStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<GradingMemory>(storagePath);

        const existingIdx = customProfiles.findIndex(p => (data.id && p.id === data.id) || isSameName(p.name, data.name));
        
        const profileData: GradingMemory = {
            id: data.id || `local-grading-memory-${Date.now()}`,
            name: data.name,
            cases: data.cases || [],
            userId: userId || null,
            createdAt: data.createdAt || new Date().toISOString()
        };

        if (existingIdx >= 0) {
            customProfiles[existingIdx] = profileData;
        } else {
            customProfiles.push(profileData);
        }

        writeJsonAtomic(storagePath, customProfiles);
        return profileData;
    },

    ...createProfileMutations<GradingMemory>({
        getPath: getGradingMemoryStoragePath,
        dienstName: 'LocalGradingMemoryService',
        bezeichnung: 'Erfahrungsschatz',
        readForUpdate: readJsonArrayForUpdate,
        write: writeJsonAtomic,
        assertNameIsFree
    })
};

const getSkillStoragePath = (userId?: string) =>
    buildStoragePath('skill_profiles', 'LocalSkillProfileService', userId);

export const LocalSkillProfileService = {
    async getAvailableProfiles(userId?: string) {
        const profiles = [...STANDARD_SKILL_PROFILES];
        
        try {
            const customProfiles = readJsonArray<StoredSkillProfile>(getSkillStoragePath(userId));
            const cleaned = customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
            return [...profiles, ...cleaned];
        } catch (err) {
            logger.error('[LocalSkillProfileService] Error reading profiles:', err);
        }

        return profiles;
    },

    async upsertProfile(data: { id?: string, name: string, activeSkillIds: string[], customSkills?: any }, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<StoredSkillProfile>(storagePath);

        // Mit Kennung ist der Datensatz eindeutig; ohne ist es ein Neuanlegen,
        // bei dem weiterhin der Name entscheidet (der Client fragt vorher).
        const existingIdx = data.id
            ? customProfiles.findIndex(p => p.id === data.id)
            : customProfiles.findIndex(p => isSameName(p.name, data.name));
        const activeSkillIds = Array.isArray(data.activeSkillIds) ? data.activeSkillIds : [];
        const customSkills = data.customSkills || {};
        
        let gespeichert: StoredSkillProfile;
        if (existingIdx >= 0) {
            customProfiles[existingIdx].activeSkillIds = activeSkillIds;
            customProfiles[existingIdx].customSkills = customSkills;
            gespeichert = customProfiles[existingIdx];
        } else {
            gespeichert = {
                id: `local-skill-${Date.now()}`,
                name: data.name,
                activeSkillIds: activeSkillIds,
                customSkills: customSkills,
                isSystem: false
            };
            customProfiles.push(gespeichert);
        }

        writeJsonAtomic(storagePath, customProfiles);
        // Die Kennung gehoert in die Antwort: Der Client richtet seine Auswahl
        // danach aus. Zuvor kamen nur Name und Skills zurueck.
        return gespeichert;
    },

    ...createProfileMutations<StoredSkillProfile>({
        getPath: getSkillStoragePath,
        dienstName: 'LocalSkillProfileService',
        bezeichnung: 'Skill-Profil',
        readForUpdate: readJsonArrayForUpdate,
        write: writeJsonAtomic,
        assertNameIsFree
    })
};

const getActiveSelectionPath = (userId?: string) => {
    const skillPath = getSkillStoragePath(userId);
    // Neben die Profile desselben Nutzers legen: getSkillStoragePath hat den Basisordner
    // bereits angelegt und den Pfad gegen Traversal geprueft.
    return path.join(path.dirname(skillPath), path.basename(skillPath).replace(/^skill_profiles/, 'active_selection'));
};

/**
 * Die zuletzt zugewiesenen Profile eines Nutzers — je eines pro Kategorie.
 *
 * Die Feldnamen sind absichtlich identisch mit den Spalten im User-Modell und mit dem,
 * was `/api/user` ausliefert. So liest die Oberflaeche in jeder Edition denselben
 * Schluessel, egal ob der Wert aus der Datenbank oder aus dieser Datei kommt.
 */
export interface StoredActiveSelection {
    activePromptProfileId?: string;
    activeSkillProfileId?: string;
    activeAiProfileId?: string;
    activeGradingMemoryId?: string;
}

/**
 * Merkt sich, WELCHE Profile ein Nutzer zuletzt zugewiesen hat.
 *
 * Die Profile selbst liegen laengst pro Nutzer als JSON auf dem Server — nur die Zeiger
 * darauf lebten ausschliesslich im localStorage des Browsers. In der Community-
 * Mehrbenutzer-Variante war das inkonsistent: Am zweiten Geraet standen zwar alle
 * eigenen Profile bereit, die Auswahl fiel aber auf die Standardwerte zurueck.
 *
 * Alle vier Kategorien liegen in EINER Datei und werden ueber `set` zusammengefuehrt.
 * Eine Kategorie gesondert zu behandeln waere genau die Asymmetrie, die dieser Service
 * beseitigen soll.
 *
 * Bewusst eine eigene Datei statt eines Feldes in `skill_profiles.json`: Dort liegt ein
 * Array von Profilen — eine nutzerbezogene Einstellung gehoert nicht als Sonderfall
 * zwischen dessen Elemente.
 */
export const LocalActiveSelectionService = {
    get(userId?: string): StoredActiveSelection {
        try {
            return readJsonObject<StoredActiveSelection>(getActiveSelectionPath(userId)) || {};
        } catch (err) {
            logger.error('[LocalActiveSelectionService] Error reading selection:', err);
            return {};
        }
    },

    /**
     * Schreibt die genannten Kategorien und laesst die uebrigen unangetastet.
     * `null` loescht eine Zuordnung ausdruecklich — ein fehlendes Feld aendert nichts.
     */
    set(patch: Record<keyof StoredActiveSelection, string | null | undefined>
        | Partial<Record<keyof StoredActiveSelection, string | null | undefined>>,
        userId?: string): void {
        const storagePath = getActiveSelectionPath(userId);
        try {
            const current = readJsonObject<StoredActiveSelection>(storagePath, 'update') || {};
            const next: StoredActiveSelection = { ...current };
            (Object.keys(patch) as (keyof StoredActiveSelection)[]).forEach(key => {
                const value = patch[key];
                if (value === undefined) return;
                next[key] = value || undefined;
            });
            writeJsonAtomic(storagePath, next);
        } catch (err) {
            logger.error('[LocalActiveSelectionService] Error writing selection:', err);
        }
    }
};


