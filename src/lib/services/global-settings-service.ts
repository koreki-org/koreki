import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

/**
 * Global Settings Service (Community Edition)
 * 🏮🛡️🏛️
 * Handles persistence of global AI routing settings in the local filesystem
 * when no database is available (Community Edition).
 */

const getGlobalSettingsPath = () => {
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
        logger.error('[GlobalSettingsService] Critical: Could not create directory:', e);
    }

    const filename = 'global_ai_settings.json';
    const targetPath = path.join(baseDir, filename);

    // Defense in Depth
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(targetPath);

    if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error('SECURITY ALERT: Path Traversal attempt detected and blocked.');
    }

    return targetPath;
};

export const GlobalSettingsService = {
    async getSettings() {
        try {
            const storagePath = getGlobalSettingsPath();
            if (fs.existsSync(storagePath)) {
                const raw = fs.readFileSync(storagePath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (err) {
            logger.error('[GlobalSettingsService] Error reading settings:', err);
        }

        // Environment Fallbacks if no admin settings file exists yet
        const envDefaults: Record<string, any> = {
            provider: process.env.DEFAULT_AI_PROVIDER || process.env.DEFAULT_PROVIDER || 'mistral',
            ollamaUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || undefined,
            ollamaModel: process.env.OLLAMA_MODEL || undefined,
            openaiUrl: process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || undefined,
            openaiModel: process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || undefined,
        };

        Object.keys(envDefaults).forEach(key => {
            if (envDefaults[key] === undefined) delete envDefaults[key];
        });

        return envDefaults;
    },

    async updateSettings(data: any) {
        const storagePath = getGlobalSettingsPath();
        let settings: any = {};
        
        if (fs.existsSync(storagePath)) {
            try {
                settings = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            } catch (e) {
                settings = {};
            }
        }

        // Merge existing with new
        settings = { ...settings, ...data };

        try {
            fs.writeFileSync(storagePath, JSON.stringify(settings, null, 2));
            return settings;
        } catch (err) {
            logger.error('[GlobalSettingsService] Error writing settings:', err);
            throw err;
        }
    }
};
