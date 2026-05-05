import { isDesktopTarget } from './env-context';

/**
 * Opens an external URL in the default browser.
 * In Desktop mode, it uses the Tauri Shell plugin.
 * In Web mode, it uses window.open.
 */
export async function openExternal(url: string): Promise<void> {
    if (isDesktopTarget()) {
        try {
            // Dynamic import to avoid loading Tauri APIs in pure web environments
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(url);
        } catch (error) {
            console.error('Failed to open external URL via Tauri:', error);
            // Fallback to window.open if Tauri shell fails
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
