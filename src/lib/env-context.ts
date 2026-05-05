/**
 * Industrial Configuration Context
 * 🏮🛡️🏛️
 * Centralizes environmental and context-specific flags for security-critical decisions.
 */

export type KorekiMode = 'saas' | 'community' | 'desktop';
export type AuthType = 'LOGTO' | 'KEYCLOAK' | 'NONE';

const PROD_DOMAINS = [
    'koreki.org',
    'www.koreki.org'
];

/**
 * Returns the current operating mode of Koreki.
 * Priority: Domain Lock (SaaS) > NEXT_PUBLIC_KOREKI_MODE > NEXT_PUBLIC_KOREKI_DESKTOP (Legacy) > saas
 */
export function getKorekiMode(): KorekiMode {
    // Industrial Guard: Force SaaS on production domains
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (PROD_DOMAINS.includes(hostname)) {
            return 'saas';
        }
    }

    const mode = process.env.NEXT_PUBLIC_KOREKI_MODE as KorekiMode;
    if (mode === 'community' || mode === 'desktop' || mode === 'saas') return mode;
    
    // Legacy Fallback for Desktop
    if (process.env.NEXT_PUBLIC_KOREKI_DESKTOP === 'true') return 'desktop';
    
    return 'saas';
}

/**
 * Verifies if the current environment is effectively the Desktop Target (Tauri/Static Export).
 * This is used for build-time decisions (like output: export).
 */
export function isDesktopTarget(): boolean {
    return getKorekiMode() === 'desktop';
}

/**
 * Returns the configured Authentication Type.
 */
export function getAuthType(): AuthType {
    const type = process.env.NEXT_PUBLIC_AUTH_TYPE as AuthType;
    if (type === 'LOGTO' || type === 'KEYCLOAK' || type === 'NONE') return type;
    
    // Default: Logto for SaaS, None for Desktop
    const mode = getKorekiMode();
    if (mode === 'saas') return 'LOGTO';
    return 'NONE';
}

/**
 * Checks if Keycloak/OIDC Auth is enabled for the current instance.
 */
export function isKeycloakAuth(): boolean {
    return getKorekiMode() === 'community' && getAuthType() === 'KEYCLOAK';
}

/**
 * Bestimmt, ob es sich um eine lokale Instanz handelt (Desktop oder Community Single User).
 * Lokale Instanzen umgehen die SaaS-Authentifizierung und das Billing.
 */
export function isLocalInstance(): boolean {
    // 🛡️ Pillar 1: LOGTO always means SaaS (Non-Local)
    if (getAuthType() === 'LOGTO') return false;

    // Industrial Guard: Domain Lock
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isProdDomain = PROD_DOMAINS.includes(hostname) || hostname.endsWith('.koreki.org');
        
        if (isProdDomain) {
            console.warn('SECURITY ALERT: Local instance flags detected on production domain! Ignoring flags.');
            return false;
        }
    }

    const mode = getKorekiMode();
    return mode === 'desktop' || mode === 'community';
}

/**
 * Prüft, ob bezahlte Modi (Standard, Pure) in der aktuellen UI aktiviert sind.
 * Lokale Instanzen erlauben IMMER alle Features.
 */
export function isPaidModesEnabled(): boolean {
    if (isLocalInstance()) return true;
    return process.env.NEXT_PUBLIC_ENABLE_PAID_MODES === 'true';
}
