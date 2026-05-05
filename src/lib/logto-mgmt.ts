/**
 * Logto Management API Helper
 * Used for administrative tasks such as role sync, user deletion, and existence checks.
 * Requires M2M application credentials (LOGTO_MGMT_APP_ID, LOGTO_MGMT_APP_SECRET).
 * 
 * CRITICAL CONVENTION:
 * - LOGTO_BASE is the Logto instance root URL WITHOUT /oidc suffix.
 * - OIDC endpoints: ${LOGTO_BASE}/oidc/token
 * - Management API:  ${LOGTO_BASE}/api/users/...
 */
import { logger } from './logger';

/** Normalized Logto base URL – NEVER includes /oidc suffix (DRY: single source of truth) */
const LOGTO_BASE = (process.env.LOGTO_ENDPOINT || 'https://auth.koreki.org')
    .trim().replace(/\/$/, '').replace(/\/oidc$/, '');

interface LogtoTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

/** 
 * M2M Token Cache (In-Memory) 
 * High-Performance Architectural Optimization: Reuse token for duration of its validity (usually 3600s).
 * Avoids redundant OIDC network roundtrips.
 */
let cachedToken: string | null = null;
let cacheExpiry: number | null = null;

/**
 * Fetches an M2M access token for the Logto Management API.
 */
async function getManagementToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    
    // Industrial Cache Check
    if (cachedToken && cacheExpiry && now < cacheExpiry - 30) {
        logger.info('[Logto Mgmt] Reusing cached M2M token');
        return cachedToken;
    }

    const appId = process.env.LOGTO_MGMT_APP_ID;
    const appSecret = process.env.LOGTO_MGMT_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error('LOGTO_MGMT_APP_ID or LOGTO_MGMT_APP_SECRET is not configured.');
    }

    const tokenUrl = `${LOGTO_BASE}/oidc/token`;
    const resource = process.env.LOGTO_M2M_RESOURCE || 'https://default.logto.app/api';

    logger.info('[Logto Mgmt] Requesting new M2M token', { tokenUrl, resource });

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            resource: resource,
            scope: 'all'
        })
    });

    if (!res.ok) {
        const error = await res.text();
        logger.error(`[Logto Mgmt] Token Fetch Failed (${res.status})`, { error });
        throw new Error(`OIDC Token Error (${res.status}): ${error}`);
    }

    const data = (await res.json()) as LogtoTokenResponse;
    
    // Update Cache
    cachedToken = data.access_token;
    cacheExpiry = now + data.expires_in;
    
    logger.info('[Logto Mgmt] Token cached', { expires_in: data.expires_in });
    
    return data.access_token;
}

/**
 * Deletes a user from Logto.
 * @param logtoUserId The Logto User ID (claims.sub)
 */
export async function deleteLogtoUser(logtoUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const token = await getManagementToken();

        const res = await fetch(`${LOGTO_BASE}/api/users/${logtoUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok && res.status !== 404) {
            const error = await res.text();
            logger.error(`[Logto Mgmt] Delete Request Failed (${res.status})`, { message: error });
            return { success: false, error: `Logto Management API Error (${res.status}): ${error}` };
        }

        return { success: true };
    } catch (err: any) {
        logger.error('Error in deleteLogtoUser', { message: err instanceof Error ? err.message : String(err) });
        return { success: false, error: err.message || 'M2M Configuration missing or invalid' };
    }
}

/**
 * Checks if a user still exists in Logto.
 * Useful to prevent resurrection of deleted users who still have a valid local session cookie.
 */
export async function checkLogtoUserExists(logtoUserId: string): Promise<boolean> {
    try {
        const appId = process.env.LOGTO_MGMT_APP_ID;
        const appSecret = process.env.LOGTO_MGMT_APP_SECRET;
        if (!appId || !appSecret) return true; // Assume exists if M2M not configured to avoid blocking new users

        const token = await getManagementToken();

        const res = await fetch(`${LOGTO_BASE}/api/users/${logtoUserId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return res.status === 200;
    } catch (err) {
        logger.error('Error in checkLogtoUserExists', { message: err instanceof Error ? err.message : String(err) });
        return true; 
    }
}

/**
 * Fetches user roles directly from Logto Management API.
 * This is the 'Industrial Grade' source of truth for administrative status.
 */
export async function getLogtoUserRoles(logtoUserId: string): Promise<string[]> {
    try {
        const appId = process.env.LOGTO_MGMT_APP_ID;
        const appSecret = process.env.LOGTO_MGMT_APP_SECRET;

        if (!appId || !appSecret) {
            logger.warn('[Logto Mgmt] Skipping M2M role sync: Credentials missing.');
            return [];
        }

        const token = await getManagementToken();
        const rolesUrl = `${LOGTO_BASE}/api/users/${logtoUserId}/roles`;

        logger.info('[Logto Mgmt] Fetching user roles', { logtoUserId, rolesUrl });

        const res = await fetch(rolesUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const error = await res.text();
            logger.error(`[Logto Mgmt] Roles Fetch Failed (${res.status})`, { rolesUrl, error });
            return [];
        }

        const rolesData = await res.json();
        // Logto returns an array of role objects: [{ id, name, description }, ...]
        const roleNames = Array.isArray(rolesData) ? rolesData.map((r: any) => r.name) : [];
        logger.info('[Logto Mgmt] Roles resolved', { logtoUserId, roles: roleNames });
        return roleNames;
    } catch (err) {
        logger.error('Error in getLogtoUserRoles', { message: err instanceof Error ? err.message : String(err) });
        return [];
    }
}

/**
 * Fetches the full user profile directly from Logto Management API.
 * 🛡️ SAFETY: Returns null on failure to prevent system-wide crashes.
 */
export async function getLogtoUserProfile(logtoUserId: string): Promise<any | null> {
    try {
        const appId = process.env.LOGTO_MGMT_APP_ID;
        const appSecret = process.env.LOGTO_MGMT_APP_SECRET;

        if (!appId || !appSecret) {
            logger.warn('[Logto Mgmt] Skipping profile fetch: Credentials missing.');
            return null;
        }

        const token = await getManagementToken();
        const userUrl = `${LOGTO_BASE}/api/users/${logtoUserId}`;

        const res = await fetch(userUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            logger.error(`[Logto Mgmt] Profile Fetch Failed (${res.status})`, { userUrl });
            return null;
        }

        return await res.json();
    } catch (err) {
        logger.error('Error in getLogtoUserProfile', { message: err instanceof Error ? err.message : String(err) });
        return null;
    }
}
