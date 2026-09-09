import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { readJsonObject, withFileMutex, writeJsonAtomic } from './json-vault';

/** Systemweite KI-Routing-Parameter. Enthält bewusst KEINE Secrets (API-Keys). */
export interface GlobalAiSettings {
    provider?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
    customOllamaModel?: string;
    ollamaNumCtx?: number;
    openaiUrl?: string;
    openaiModel?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    enableThinking?: boolean;
}

/**
 * Global Settings Service (Community Edition)
 * 🏮🛡️🏛️
 * Handles persistence of global AI routing settings in the local filesystem
 * when no database is available (Community Edition).
 */

const getGlobalSettingsPath = () => {
    let baseDir: string;
    
    // 1. Node-Server unter Windows (lokale Entwicklung, `tauri dev`).
    //    Die ausgelieferte Desktop-App erreicht diesen Service nicht — sie wird
    //    als statischer Export ohne API-Routen gebaut.
    if (process.env.APPDATA) {
        baseDir = path.join(process.env.APPDATA, 'koreki');
    } else {
        // 2. Community Mode (Docker/Linux) — der produktive Pfad dieses Services.
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
    /**
     * Was der Administrator im Einstellungs-Modal gespeichert hat — und solange
     * dort nichts steht, die Vorgaben aus der Umgebung.
     *
     * SYNCHRON, weil der Rumpf es immer war (`readFileSync`). Gebraucht wird das
     * von `sanitizeClientAiSettings`, das in zehn API-Routen synchron aufgerufen
     * wird; eine nur-async Fassung haette dort zehn Signaturaenderungen erzwungen,
     * ohne dass irgendwo tatsaechlich gewartet wird.
     */
    getSettingsSync(): GlobalAiSettings {
        try {
            const stored = readJsonObject<GlobalAiSettings>(getGlobalSettingsPath());
            if (stored) return stored;
        } catch (err) {
            logger.error('[GlobalSettingsService] Error reading settings:', err);
        }

        // Environment Fallbacks if no admin settings file exists yet
        const envDefaults: GlobalAiSettings = {
            provider: process.env.DEFAULT_AI_PROVIDER || process.env.DEFAULT_PROVIDER || 'mistral',
            ollamaUrl: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || undefined,
            ollamaModel: process.env.OLLAMA_MODEL || undefined,
            openaiUrl: process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || undefined,
            openaiModel: process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || undefined,
        };

        (Object.keys(envDefaults) as (keyof GlobalAiSettings)[]).forEach(key => {
            if (envDefaults[key] === undefined) delete envDefaults[key];
        });

        return envDefaults;
    },

    async getSettings(): Promise<GlobalAiSettings> {
        return GlobalSettingsService.getSettingsSync();
    },

    async updateSettings(data: GlobalAiSettings) {
        const storagePath = getGlobalSettingsPath();

        // Lesen, Zusammenführen und Schreiben müssen zusammen im kritischen
        // Abschnitt liegen — sonst überholt ein zweiter Admin den ersten.
        return withFileMutex(storagePath, () => {
            const existing = readJsonObject<GlobalAiSettings>(storagePath, 'update') ?? {};
            const settings: GlobalAiSettings = { ...existing, ...data };

            try {
                writeJsonAtomic(storagePath, settings);
                return settings;
            } catch (err) {
                logger.error('[GlobalSettingsService] Error writing settings:', err);
                throw err;
            }
        });
    }
};
