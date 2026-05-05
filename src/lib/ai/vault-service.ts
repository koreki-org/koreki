import { isDesktopTarget } from '@/lib/env-context';

/**
 * Industrial Vault Service
 * Manages API keys securely depending on the environment.
 * 🏮 PROTECTED: SaaS mode stores keys ONLY in RAM (transient variable).
 */

// Transient RAM storage for SaaS / Pure Mode
const ramVault: Record<string, string> = {};

export const vaultService = {
    /**
     * Saves a secret. On Desktop, it uses the OS Vault.
     * In SaaS/Web, it's strictly RAM-only (volatile).
     */
    async saveSecret(key: string, value: string): Promise<void> {
        console.log(`[VaultService] Saving secret for ${key}... (Desktop: ${isDesktopTarget()})`);
        
        if (isDesktopTarget()) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('save_secret', { key, value });
                console.log(`[VaultService] Successfully saved ${key} to OS Vault.`);
            } catch (e) {
                console.error("[VaultService] Save Error:", e);
                throw new Error("Tresor konnte nicht angesprochen werden.");
            }
        } else {
            // PURE PRIVACY: RAM-only storage. Key is lost on page refresh.
            ramVault[key] = value;
            console.log(`[VaultService] Secret ${key} stored in RAM (Volatile).`);
        }
    },

    /**
     * Retrieves a secret.
     */
    async getSecret(key: string): Promise<string> {
        if (isDesktopTarget()) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                return await invoke<string>('get_secret', { key });
            } catch (e) {
                console.error("Vault Get Error:", e);
                return "";
            }
        } else {
            // Retrieve from RAM
            return ramVault[key] || "";
        }
    },

    /**
     * Deletes a secret from the vault.
     */
    async deleteSecret(key: string): Promise<void> {
        console.log(`[VaultService] Deleting secret for ${key}...`);
        if (isDesktopTarget()) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('delete_secret', { key });
                console.log(`[VaultService] Successfully deleted ${key} from OS Vault.`);
            } catch (e) {
                console.error("[VaultService] Delete Error:", e);
            }
        } else {
            delete ramVault[key];
        }
    }
};
