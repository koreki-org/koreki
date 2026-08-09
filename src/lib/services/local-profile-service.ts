import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EXPERT_REGISTRY } from '@/prompts/expert-profiles';
import { STANDARD_SKILL_PROFILES } from '../ai/standard-skills-profiles';
import { isLocalInstance } from '../env-context';
import { GradingMemoryCase, GradingMemory } from '../../types';
import { readJsonArray, readJsonArrayForUpdate, readJsonObject, writeJsonAtomic } from './json-vault';

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
 * 🏮 Verhindert zwei gleichnamige Einträge beim Umbenennen.
 *
 * Gespeichert wird über den NAMEN (`upsertProfile` sucht per `findIndex(p =>
 * p.name === ...)`), ausgewählt ebenfalls (`selectedProfile` in den Hooks ist
 * ein Name). Ein zweiter Eintrag mit demselben Namen ist danach unerreichbar:
 * Jede Bearbeitung landet beim ersten Treffer, in der Liste stehen zwei
 * scheinbar identische, gleichzeitig markierte Sets. Die Datenbank-Dienste
 * verbieten das seit jeher — die lokale Ablage tat es bisher nicht, weshalb
 * ein Umbenennen auf einen vergebenen Namen stillschweigend eine Dublette
 * erzeugte.
 */
const assertNameIsFree = (
    profiles: { id?: string; name?: string }[],
    id: string,
    newName: string,
    label: string
): void => {
    const gesucht = newName.trim().toLowerCase();
    const kollision = profiles.find(p => p?.id !== id && (p?.name || '').trim().toLowerCase() === gesucht);
    if (kollision) {
        throw new Error(`Ein ${label} mit diesem Namen existiert bereits`);
    }
};

/**
 * Übersetzt die fachlichen Fehler dieser Ablage in eine HTTP-Antwort.
 *
 * Der Sammel-`catch` der API-Routen beantwortete bisher jeden Fehler mit einem
 * generischen 500 — die Namenskollision kam damit als „Lokaler Fehler" beim
 * Nutzer an, obwohl sie eine klare, behebbare Ursache hat. Alles Unerwartete
 * bleibt bewusst unspezifisch, damit keine Dateipfade nach außen dringen.
 */
export const toLocalProfileHttpError = (
    err: unknown,
    fallbackMessage: string
): { status: number; message: string } => {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('existiert bereits')) return { status: 409, message };
    if (message.includes('nicht gefunden')) return { status: 404, message };
    return { status: 500, message: fallbackMessage };
};

const getStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`).
    //    ACHTUNG: Die ausgelieferte Desktop-App erreicht diesen Service NIE —
    //    sie wird als statischer Export gebaut (next.config.js: output 'export'),
    //    hat also keine API-Routen und persistiert im localStorage der Webview
    //    (siehe src/lib/local-vault.ts).
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux) — der produktive Pfad dieses Services.
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        logger.error('[LocalProfileService] Critical: Could not create directory:', e);
    }

    // Industrial Hashing: Completely decouple input from filesystem path
    const filename = userId 
        ? `profiles_${crypto.createHash('sha256').update(userId).digest('hex')}.json` 
        : 'profiles.json';
        
    const targetPath = path.join(baseDir, filename);

    // Defense in Depth: Verify that the resolved path still resides in the base directory
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
};

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

    async upsertProfile(data: { name: string, correctionPrompt: string }, userId?: string) {
        const storagePath = getStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<StoredExpertProfile>(storagePath);

        // Industrial Guard: Prevent [object Object] by forcing string type
        const safePrompt = typeof data.correctionPrompt === 'string' 
            ? data.correctionPrompt 
            : String(data.correctionPrompt || '');

        const existingIdx = customProfiles.findIndex(p => p.name === data.name);
        
        if (existingIdx >= 0) {
            customProfiles[existingIdx].correctionPrompt = safePrompt;
        } else {
            customProfiles.push({
                id: `local-${Date.now()}`,
                name: data.name,
                correctionPrompt: safePrompt,
                isSystem: false
            });
        }

        writeJsonAtomic(storagePath, customProfiles);
        return { name: data.name, correctionPrompt: data.correctionPrompt };
    },

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            writeJsonAtomic(storagePath, customProfiles);
        } catch (err) {
            logger.error('[LocalProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getStoragePath(userId);
        if (!fs.existsSync(storagePath)) throw new Error('Profil nicht gefunden');

        const customProfiles = readJsonArrayForUpdate<StoredExpertProfile>(storagePath);
        const ziel = customProfiles.find(p => p.id === id);
        if (!ziel) throw new Error('Profil nicht gefunden');

        assertNameIsFree(customProfiles, id, newName, 'Profil');

        ziel.name = newName.trim();
        writeJsonAtomic(storagePath, customProfiles);
    }
};

const getAiStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`).
    //    ACHTUNG: Die ausgelieferte Desktop-App erreicht diesen Service NIE —
    //    sie wird als statischer Export gebaut (next.config.js: output 'export'),
    //    hat also keine API-Routen und persistiert im localStorage der Webview
    //    (siehe src/lib/local-vault.ts).
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux) — der produktive Pfad dieses Services.
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        logger.error('[LocalProfileService] Critical: Could not create directory:', e);
    }

    // Industrial Hashing: Completely decouple input from filesystem path
    const filename = userId 
        ? `ai_profiles_${crypto.createHash('sha256').update(userId).digest('hex')}.json` 
        : 'ai_profiles.json';
        
    const targetPath = path.join(baseDir, filename);

    // Defense in Depth: Verify that the resolved path still resides in the base directory
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
};

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

        const existingIdx = customProfiles.findIndex(p => p.id === data.id || p.name === data.name);
        
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

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            writeJsonAtomic(storagePath, customProfiles);
        } catch (err) {
            logger.error('[LocalAiProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        if (!fs.existsSync(storagePath)) throw new Error('KI-Profil nicht gefunden');

        const customProfiles = readJsonArrayForUpdate<StoredAiProfile>(storagePath);
        const ziel = customProfiles.find(p => p.id === id);
        if (!ziel) throw new Error('KI-Profil nicht gefunden');

        assertNameIsFree(customProfiles, id, newName, 'KI-Profil');

        ziel.name = newName.trim();
        writeJsonAtomic(storagePath, customProfiles);
    }
};

const getGradingMemoryStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`).
    //    ACHTUNG: Die ausgelieferte Desktop-App erreicht diesen Service NIE —
    //    sie wird als statischer Export gebaut (next.config.js: output 'export'),
    //    hat also keine API-Routen und persistiert im localStorage der Webview
    //    (siehe src/lib/local-vault.ts).
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux) — der produktive Pfad dieses Services.
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        logger.error('[LocalGradingMemoryService] Critical: Could not create directory:', e);
    }

    // Industrial Hashing: Completely decouple input from filesystem path
    const filename = userId 
        ? `grading_memories_${crypto.createHash('sha256').update(userId).digest('hex')}.json` 
        : 'grading_memories.json';
        
    const targetPath = path.join(baseDir, filename);

    // Defense in Depth: Verify that the resolved path still resides in the base directory
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
};

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

        const existingIdx = customProfiles.findIndex(p => p.id === data.id || p.name === data.name);
        
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

    async deleteProfile(id: string, userId?: string): Promise<void> {
        const storagePath = getGradingMemoryStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            writeJsonAtomic(storagePath, customProfiles);
        } catch (err) {
            logger.error('[LocalGradingMemoryService] Error deleting profile:', err);
        }
    },

    /**
     * Bewusst OHNE `assertNameIsFree`: Beim Erfahrungsschatz sind gleiche Namen
     * erlaubt — das Speichern fragt ausdrücklich, ob überschrieben oder ein
     * zweiter Eintrag gleichen Namens angelegt werden soll (siehe
     * useGradingMemoryModalState). Die Identität hängt hier an der `id`.
     */
    async renameProfile(id: string, newName: string, userId?: string): Promise<void> {
        const storagePath = getGradingMemoryStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.map((p: any) => 
                p.id === id ? { ...p, name: newName } : p
            );
            writeJsonAtomic(storagePath, customProfiles);
        } catch (err) {
            logger.error('[LocalGradingMemoryService] Error renaming profile:', err);
        }
    }
};

const getSkillStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`).
    //    ACHTUNG: Die ausgelieferte Desktop-App erreicht diesen Service NIE —
    //    sie wird als statischer Export gebaut (next.config.js: output 'export'),
    //    hat also keine API-Routen und persistiert im localStorage der Webview
    //    (siehe src/lib/local-vault.ts).
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux) — der produktive Pfad dieses Services.
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        logger.error('[LocalSkillProfileService] Critical: Could not create directory:', e);
    }

    // Industrial Hashing
    const filename = userId 
        ? `skill_profiles_${crypto.createHash('sha256').update(userId).digest('hex')}.json` 
        : 'skill_profiles.json';
        
    const targetPath = path.join(baseDir, filename);

    // Defense in Depth
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
};

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

    async upsertProfile(data: { name: string, activeSkillIds: string[], customSkills?: any }, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        const customProfiles = readJsonArrayForUpdate<StoredSkillProfile>(storagePath);

        const existingIdx = customProfiles.findIndex(p => p.name === data.name);
        const activeSkillIds = Array.isArray(data.activeSkillIds) ? data.activeSkillIds : [];
        const customSkills = data.customSkills || {};
        
        if (existingIdx >= 0) {
            customProfiles[existingIdx].activeSkillIds = activeSkillIds;
            customProfiles[existingIdx].customSkills = customSkills;
        } else {
            customProfiles.push({
                id: `local-skill-${Date.now()}`,
                name: data.name,
                activeSkillIds: activeSkillIds,
                customSkills: customSkills,
                isSystem: false
            });
        }

        writeJsonAtomic(storagePath, customProfiles);
        return { name: data.name, activeSkillIds, customSkills };
    },

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            writeJsonAtomic(storagePath, customProfiles);
        } catch (err) {
            logger.error('[LocalSkillProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        if (!fs.existsSync(storagePath)) throw new Error('Skill-Profil nicht gefunden');

        const customProfiles = readJsonArrayForUpdate<StoredSkillProfile>(storagePath);
        const ziel = customProfiles.find(p => p.id === id);
        if (!ziel) throw new Error('Skill-Profil nicht gefunden');

        assertNameIsFree(customProfiles, id, newName, 'Skill-Profil');

        ziel.name = newName.trim();
        writeJsonAtomic(storagePath, customProfiles);
    }
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


