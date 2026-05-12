import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STANDARD_PROFILES } from '../ai/standard-profiles';
import { STANDARD_SKILL_PROFILES } from '../ai/standard-skills-profiles';
import { isLocalInstance } from '../env-context';
import { GradingMemoryCase, GradingMemory } from '../../types';

/**
 * Industrial Local Profile Service (Stage 10)
 * 🏮🛡️🏛️
 * Handles persistence of expert profiles in the local filesystem
 * when no database is available (Community & Desktop editions).
 */

const getStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Desktop Mode (Tauri/Windows)
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux)
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        console.error('[LocalProfileService] Critical: Could not create directory:', e);
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
        const profiles = [...STANDARD_PROFILES];
        
        try {
            const storagePath = getStoragePath(userId);
            if (fs.existsSync(storagePath)) {
                const customRaw = fs.readFileSync(storagePath, 'utf-8');
                const customProfiles = JSON.parse(customRaw);
                
                if (Array.isArray(customProfiles)) {
                    // Industrial Cleaning: Filter out malformed entries
                    const cleaned = customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
                    return [...profiles, ...cleaned];
                }
            }
        } catch (err) {
            console.error('[LocalProfileService] Error reading profiles:', err);
        }
        
        return profiles;
    },

    async upsertProfile(data: { name: string, correctionPrompt: string }, userId?: string) {
        const storagePath = getStoragePath(userId);
        let customProfiles: any[] = [];
        
        if (fs.existsSync(storagePath)) {
            try {
                customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            } catch (e) {
                customProfiles = [];
            }
        }

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

        fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        return { name: data.name, correctionPrompt: data.correctionPrompt };
    },

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.map((p: any) => 
                p.id === id ? { ...p, name: newName } : p
            );
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalProfileService] Error renaming profile:', err);
        }
    }
};

const getAiStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Desktop Mode (Tauri/Windows)
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux)
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        console.error('[LocalProfileService] Critical: Could not create directory:', e);
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
            const storagePath = getAiStoragePath(userId);
            if (fs.existsSync(storagePath)) {
                const customRaw = fs.readFileSync(storagePath, 'utf-8');
                const customProfiles = JSON.parse(customRaw);
                
                if (Array.isArray(customProfiles)) {
                    // Industrial Cleaning: Filter out malformed entries
                    return customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
                }
            }
        } catch (err) {
            console.error('[LocalAiProfileService] Error reading profiles:', err);
        }
        
        return [];
    },

    async upsertProfile(data: any, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        let customProfiles: any[] = [];
        
        if (fs.existsSync(storagePath)) {
            try {
                customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            } catch (e) {
                customProfiles = [];
            }
        }

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
            visionPresencePenalty: Number(data.visionPresencePenalty ?? 0.0)
        };

        if (existingIdx >= 0) {
            customProfiles[existingIdx] = profileData;
        } else {
            customProfiles.push(profileData);
        }

        fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        return profileData;
    },

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalAiProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getAiStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.map((p: any) => 
                p.id === id ? { ...p, name: newName } : p
            );
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalAiProfileService] Error renaming profile:', err);
        }
    }
};

const getGradingMemoryStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Desktop Mode (Tauri/Windows)
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux)
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        console.error('[LocalGradingMemoryService] Critical: Could not create directory:', e);
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
            const storagePath = getGradingMemoryStoragePath(userId);
            if (fs.existsSync(storagePath)) {
                const customRaw = fs.readFileSync(storagePath, 'utf-8');
                const customProfiles = JSON.parse(customRaw);
                
                if (Array.isArray(customProfiles)) {
                    // Industrial Cleaning: Filter out malformed entries
                    return customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string') as GradingMemory[];
                }
            }
        } catch (err) {
            console.error('[LocalGradingMemoryService] Error reading profiles:', err);
        }
        
        return [];
    },

    async upsertProfile(data: Partial<GradingMemory> & { name: string, cases: GradingMemoryCase[] }, userId?: string): Promise<GradingMemory> {
        const storagePath = getGradingMemoryStoragePath(userId);
        let customProfiles: GradingMemory[] = [];
        
        if (fs.existsSync(storagePath)) {
            try {
                customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            } catch (e) {
                customProfiles = [];
            }
        }

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

        fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        return profileData;
    },

    async deleteProfile(id: string, userId?: string): Promise<void> {
        const storagePath = getGradingMemoryStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalGradingMemoryService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string): Promise<void> {
        const storagePath = getGradingMemoryStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.map((p: any) => 
                p.id === id ? { ...p, name: newName } : p
            );
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalGradingMemoryService] Error renaming profile:', err);
        }
    }
};

const getSkillStoragePath = (userId?: string) => {
    let baseDir: string;
    
    // 1. Desktop Mode (Tauri/Windows)
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux)
        baseDir = path.join(process.cwd(), 'data', 'prompts');
    }

    try {
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {
        console.error('[LocalSkillProfileService] Critical: Could not create directory:', e);
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
            const storagePath = getSkillStoragePath(userId);
            if (fs.existsSync(storagePath)) {
                const customRaw = fs.readFileSync(storagePath, 'utf-8');
                const customProfiles = JSON.parse(customRaw);
                
                if (Array.isArray(customProfiles)) {
                    const cleaned = customProfiles.filter(p => p && typeof p === 'object' && typeof p.name === 'string');
                    return [...profiles, ...cleaned];
                }
            }
        } catch (err) {
            console.error('[LocalSkillProfileService] Error reading profiles:', err);
        }
        
        return profiles;
    },

    async upsertProfile(data: { name: string, activeSkillIds: string[] }, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        let customProfiles: any[] = [];
        
        if (fs.existsSync(storagePath)) {
            try {
                customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            } catch (e) {
                customProfiles = [];
            }
        }

        const existingIdx = customProfiles.findIndex(p => p.name === data.name);
        const activeSkillIds = Array.isArray(data.activeSkillIds) ? data.activeSkillIds : [];
        
        if (existingIdx >= 0) {
            customProfiles[existingIdx].activeSkillIds = activeSkillIds;
        } else {
            customProfiles.push({
                id: `local-skill-${Date.now()}`,
                name: data.name,
                activeSkillIds: activeSkillIds,
                isSystem: false
            });
        }

        fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        return { name: data.name, activeSkillIds };
    },

    async deleteProfile(id: string, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.filter((p: any) => p.id !== id);
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalSkillProfileService] Error deleting profile:', err);
        }
    },

    async renameProfile(id: string, newName: string, userId?: string) {
        const storagePath = getSkillStoragePath(userId);
        if (!fs.existsSync(storagePath)) return;

        try {
            let customProfiles = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            customProfiles = customProfiles.map((p: any) => 
                p.id === id ? { ...p, name: newName } : p
            );
            fs.writeFileSync(storagePath, JSON.stringify(customProfiles, null, 2));
        } catch (err) {
            console.error('[LocalSkillProfileService] Error renaming profile:', err);
        }
    }
};


