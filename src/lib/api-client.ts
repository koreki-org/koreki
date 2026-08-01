import { isLocalInstance, isKeycloakAuth } from './env-context';
import { getOidcUser } from './auth-keycloak';
import { logger } from './logger';

/**
 * Industrial Network Guard (Layer 1)
 * 🏮🛡️🏛️
 * 
 * Prevents API leaks in Desktop Mode by enforcing a strict 'Local-First' policy.
 */

const ALLOWED_EXTERNAL_DOMAINS = [
    'api.mistral.ai', // Mistral AI (EU GDPR Compliant)
    'llm.aihosting.mittwald.de' // Mittwald Inferenz (Germany GDPR Compliant)
];

const PRIVATE_NETWORK_REGEX = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|localhost|127\.0\.0\.1|tauri\.localhost)/;

/**
 * Validates if the given URL is allowed to be called in the current environment.
 * Throws a SecurityError if a leak is detected in Desktop Mode.
 */
export function validateNetworkTarget(url: string) {
    if (!isLocalInstance()) return;

    try {
        // Handle relative URLs (they are always allowed as they stay on the current origin)
        if (url.startsWith('/') && !url.startsWith('//')) return;

        const parsed = new URL(url);
        const hostname = parsed.hostname;

        // 1. Whitelisted External Domains
        if (ALLOWED_EXTERNAL_DOMAINS.includes(hostname)) return;

        // 2. Private Networks & Localhost
        if (PRIVATE_NETWORK_REGEX.test(hostname)) return;

        // 3. BLOCK EVERYTHING ELSE (especially *.koreki.org)
        logger.security(`NETWORK ISOLATION BREACH: Blocked call to ${hostname} in Desktop Mode.`);
        throw new Error(`Koreki Security: Netzwerkzugriff auf ${hostname} im lokalen Modus blockiert.`);
    } catch (e: any) {
        if (e.message?.includes('Koreki Security')) throw e;
        // Ignore invalid URLs here, let the underlying fetch handle them
    }
}

/**
 * Baut die Authorization-Header für Community Multi-User (Keycloak).
 * 🛡️ Das signierte Access Token ist die einzige Identitätsquelle — es wird bei
 * jedem Request frisch aus dem OIDC-Store gelesen, damit der Silent-Renew von
 * oidc-client-ts greift und lange offene Tabs kein abgelaufenes Token senden.
 */
const buildAuthHeaders = async (): Promise<Record<string, string>> => {
    if (typeof window === 'undefined' || !isKeycloakAuth()) return {};

    try {
        const oidcUser = await getOidcUser();
        if (oidcUser?.access_token) {
            return { Authorization: `Bearer ${oidcUser.access_token}` };
        }
    } catch (err) {
        logger.error('[apiClient] OIDC Access Token konnte nicht gelesen werden', err);
    }

    return {};
};

/**
 * Standardized API Client Wrapper
 */
export const apiClient = {
    fetch: async (url: string, options?: RequestInit): Promise<Response> => {
        validateNetworkTarget(url);

        const headers = {
            ...options?.headers,
            ...(await buildAuthHeaders()),
        };

        const res = await fetch(url, { ...options, headers });

        // 🛡️ Resilience: Single retry on 401 to handle transient Logto cookie race conditions.
        // Skips auth endpoints to avoid retry loops.
        if (res?.status === 401 && !url.includes('/api/logto/')) {
            await new Promise(resolve => setTimeout(resolve, 300));
            // Token neu lesen: ein zwischenzeitlicher Silent-Renew kann das 401 bereits geheilt haben.
            const retryHeaders = {
                ...options?.headers,
                ...(await buildAuthHeaders()),
            };
            const retryRes = await fetch(url, { ...options, headers: retryHeaders });
            return retryRes || res;
        }

        return res;
    },

    get: async (url: string, options?: RequestInit) => {
        return apiClient.fetch(url, { ...options, method: 'GET' });
    },

    post: async (url: string, body: any, options?: RequestInit) => {
        return apiClient.fetch(url, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: JSON.stringify(body),
        });
    }
};
