import { UserManager, WebStorageStateStore, User as OidcUser } from 'oidc-client-ts';
import { isKeycloakAuth } from './env-context';
import { logger } from './logger';

/**
 * Industrial OIDC Manager (Keycloak Strategy)
 * 🛡️🏛️🗝️
 * 
 * Provides a stateless authentication layer for self-hosted instances.
 * Encapsulates Keycloak communication without touching the server database.
 */

const getOidcConfig = () => {
    if (typeof window === 'undefined') return null;

    const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
    const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
    
    if (!issuer || !clientId) {
        logger.warn("OIDC Configuration missing (Issuer or Client ID).");
        return null;
    }

    return {
        authority: issuer,
        client_id: clientId,
        redirect_uri: window.location.origin + '/app', // Return directly to app
        post_logout_redirect_uri: window.location.origin + '/',
        response_type: 'code',
        scope: 'openid profile email roles',
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        monitorSession: false, // Prevents iframe-based session monitoring (cleaner for schools)
        automaticSilentRenew: true,
    };
};

let userManager: UserManager | null = null;

export const getOidcManager = () => {
    if (!userManager && typeof window !== 'undefined') {
        const config = getOidcConfig();
        if (config) {
            userManager = new UserManager(config);
        }
    }
    return userManager;
};

/**
 * Logic to handle the OIDC callback if present in the URL.
 */
export const handleOidcCallback = async (): Promise<OidcUser | null> => {
    const mgr = getOidcManager();
    if (!mgr) return null;

    const url = window.location.href;
    if (url.includes('code=') && url.includes('state=')) {
        try {
            const user = await mgr.signinRedirectCallback();
            // Clean URL after success
            window.history.replaceState({}, document.title, window.location.pathname);
            return user;
        } catch (err) {
            logger.error("OIDC Callback Error", err);
            return null;
        }
    }
    return null;
};

/**
 * Initiates the Keycloak Login Flow.
 */
export const signinOidc = async () => {
    const mgr = getOidcManager();
    if (mgr) {
        await mgr.signinRedirect();
    }
};

export const signoutOidc = async () => {
    const mgr = getOidcManager();
    if (mgr) {
        window.localStorage.removeItem('koreki_user_sub');
        window.localStorage.removeItem('koreki_user_roles');
        await mgr.signoutRedirect();
    }
};

/**
 * Retrieves the current OIDC user session.
 */
export const getOidcUser = async (): Promise<OidcUser | null> => {
    const mgr = getOidcManager();
    if (!mgr) return null;
    return await mgr.getUser();
};
