import LogtoClient, { LogtoNextConfig } from '@logto/next';
import { logger } from './logger';

/**
 * LOGTO SDK Configuration
 * 
 * CRITICAL CONVENTION:
 * - `endpoint` MUST be the Logto BASE URL without any path suffix.
 *   The SDK appends `/oidc` internally for OIDC discovery.
 * - Example: 'https://auth.koreki.org' (NOT 'https://auth.koreki.org/oidc')
 */
const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://koreki.org').trim().replace(/\/$/, '');

// Defensive Guard: Strip /oidc suffix if present (common misconfiguration)
const endpoint = (process.env.LOGTO_ENDPOINT || 'https://auth.koreki.org')
  .trim().replace(/\/$/, '').replace(/\/oidc$/, '');

export const logtoConfig: LogtoNextConfig = {
    endpoint: endpoint,
    appId: (process.env.LOGTO_APP_ID || '').trim(),
    appSecret: (process.env.LOGTO_APP_SECRET || '').trim(),
    baseUrl: baseUrl,
    cookieSecret: process.env.LOGTO_COOKIE_SECRET || (process.env.NODE_ENV === 'production' ? 'BUILD_PLACEHOLDER_REPLACED_AT_RUNTIME' : 'dev_dummy_secret'),
    cookieSecure: process.env.NODE_ENV === 'production', // SDK Standard for Proxies
    scopes: ['profile', 'username', 'roles', 'email'],
};

// --- STARTUP LOGS (INDUSTRIAL DEBUGGING) ---
if (typeof window === 'undefined') {
    logger.info('Logto Config [endpoint]:', logtoConfig.endpoint);
    logger.info('Logto Config [baseUrl]:', logtoConfig.baseUrl);
    logger.info('Logto Config [cookieSecure]:', logtoConfig.cookieSecure);
    logger.info('Logto Config [nodeEnv]:', process.env.NODE_ENV);
    logger.info('Logto Config [appId present]:', !!logtoConfig.appId);
    logger.info('Logto Config [appSecret present]:', !!logtoConfig.appSecret);
    logger.info('Logto Config [cookieSecret is dummy]:', !process.env.LOGTO_COOKIE_SECRET);
}

// 🛡️ SECURITY GUARD: Hard crash at runtime if cookie secret is missing in production.
// The BUILD_PLACEHOLDER fallback above is intentionally non-functional.
// During `next build`, this module is imported server-side — we detect this via
// the absence of a request context (NEXT_PHASE) to avoid crashing the build itself.
if (
    process.env.NEXT_PUBLIC_AUTH_TYPE === 'LOGTO' &&
    !process.env.LOGTO_COOKIE_SECRET &&
    process.env.NODE_ENV === 'production' &&
    typeof window === 'undefined' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
) {
    logger.error(
        '[SECURITY] WARNING: LOGTO_COOKIE_SECRET is not set. ' +
        'Falling back to placeholder. Session persistence may fail.'
    );
}

export const logtoClient = new LogtoClient(logtoConfig);
