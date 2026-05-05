import fs from 'fs';
import path from 'path';
import { STANDARD_PROFILES } from '../ai/standard-profiles';
import { isLocalInstance } from '../env-context';

/**
 * Industrial Local Profile Service (Stage 10)
 * 🏮🛡️🏛️
 * Handles persistence of expert profiles in the local filesystem
 * when no database is available (Community & Desktop editions).
 */

const getStoragePath = (userId?: string) => {
    // 1. Desktop Mode (Tauri/Windows)
    if (process.env.APPDATA) {
        const dir = path.join(process.env.APPDATA, 'koreki');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filename = userId ? `profiles_${userId}.json` : 'profiles.json';
        return path.join(dir, filename);
    }
    
    // 2. Community Mode (Docker/Linux)
    // We store it in a dedicated data directory to ensure volume persistence.
    const dir = path.join(process.cwd(), 'data', 'prompts');
    try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
        console.error('[LocalProfileService] Critical: Could not create prompts directory:', e);
    }
    const filename = userId ? `profiles_${userId}.json` : 'profiles.json';
    return path.join(dir, filename);
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
