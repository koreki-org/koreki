import type { NextApiRequest, NextApiResponse } from 'next';
import type { LogtoContext } from '@logto/next';
import { logtoClient } from './logto';
import { checkRateLimit } from './rate-limit';
import { logSecurityEvent } from './audit-service';
import { logger } from './logger';
import prisma from './prisma';
import { UserService } from './services/user-service';
import { isLocalInstance, isKeycloakAuth } from './env-context';

export type SecurityOptions = {
    isAi?: boolean;
    requireAdmin?: 'SYS' | 'ORG' | boolean;
    allowAnonymous?: boolean;
};

/**
 * Enhanced NextApiRequest with Logto user data and client IP.
 */
export interface AuthenticatedRequest extends NextApiRequest {
    user: LogtoContext;
    ip: string;
}

/**
 * Utility to reliably extract the client IP address.
 * Standardized for Koreki Infrastructure (Traefik/Coolify/IONOS).
 */
export function getClientIp(req: NextApiRequest): string {
    const forwarded = req.headers ? req.headers['x-forwarded-for'] : undefined;
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0].trim();
    }
    return req.socket ? (req.socket.remoteAddress || '0.0.0.0') : '0.0.0.0';
}

/**
 * Unified Security Wrapper for API Routes.
 * Pillar 8: DB-Authoritative Role Verification (Source of Truth).
 */
export function withSecurity(
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
    options: SecurityOptions = {}
) {
    // 🏮 INDUSTRIAL LOCAL BYPASS (CENTRALIZED)
    // Avoids Logto session checks in Desktop/Community modes.
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
        const ip = getClientIp(req);
        req.ip = ip;
        const { isAi = false, requireAdmin = false, allowAnonymous = false } = options;

        // 🛡️ Pillar 1: Rate Limiting (Applied to ALL instances for consistency)
        const isAllowed = await checkRateLimit(ip, isAi);
        if (!isAllowed) {
            await logSecurityEvent('anonymous', null, 'RATE_LIMIT_EXCEEDED', `IP: ${ip}, Endpoint: ${req.url}`, ip);
            return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten Sie eine Minute.' });
        }

        if (isLocalInstance()) {
            // 🏮 INDUSTRIAL MULTI-USER BYPASS
            // Try to extract user ID from header if provided (Community Multi-User)
            const headerUserId = req.headers['x-koreki-user-id'] as string;
            
            if (isKeycloakAuth() && !headerUserId) {
                if (allowAnonymous) {
                    req.user = {
                        isAuthenticated: false,
                        claims: {} as any
                    };
                    return await handler(req, res);
                }
                return res.status(401).json({ error: 'Nicht angemeldet.' });
            }

            const finalUserId = headerUserId || 'local-desktop-user';
            
            // Extract roles passed from the client in Keycloak mode, fallback to ADMIN for Desktop
            let roles = ['ADMIN'];
            const headerUserRoles = req.headers['x-koreki-user-roles'] as string;
            if (headerUserRoles) {
                try {
                    roles = JSON.parse(headerUserRoles);
                } catch (e) {
                    logger.error('Failed to parse x-koreki-user-roles header', { headerUserRoles });
                }
            }

            req.user = {
                isAuthenticated: true,
                claims: {
                    sub: finalUserId,
                    roles: roles,
                    iss: 'koreki-local',
                    aud: 'koreki',
                    exp: Math.floor(Date.now() / 1000) + 3600,
                    iat: Math.floor(Date.now() / 1000)
                }
            };
            return await handler(req, res);
        }

        const logtoHandler = logtoClient.withLogtoApiRoute(async (req: AuthenticatedRequest, res: NextApiResponse) => {
            // Centralized Industrial IP Detection 🛡️
            const ip = getClientIp(req);
            req.ip = ip;
            
            const { isAi = false, requireAdmin = false, allowAnonymous = false } = options;

            try {
                const { isAuthenticated, claims } = req.user;
                const userId = claims?.sub;

                // 1. AUTHENTICATION (Basic Shield)
                if (!isAuthenticated) {
                    if (allowAnonymous) {
                        return await handler(req, res);
                    }
                    
                    // Industrial Debugging for Auth Failures 🔍
                    // Capture state of body to detect Zod-failing patterns
                    const bodyType = typeof req.body;
                    const bodyPreview = bodyType === 'string' ? req.body.substring(0, 100) : (req.body ? 'object' : 'empty');

                    await logSecurityEvent('anonymous', null, 'AUTH_FAILURE', `Unauthenticated access to ${req.url} (Type: ${bodyType}, Preview: ${bodyPreview})`, ip);
                    return res.status(401).json({ error: 'Nicht angemeldet.' });
                }

                // 2. RESOURCE & FAIRNESS (Pillar 5)
                // Single student request absolute cap: 100,000 characters.
                const pageCount = req.body?.pageCount;
                const studentText = req.body?.studentText;
                if (studentText) {
                    const effectivePageCount = Math.max(1, pageCount || 1);
                    const maxPerPage = 10000;
                    const totalCap = 100000;
                    const allowed = Math.min(effectivePageCount * maxPerPage, totalCap);

                    if (studentText.length > allowed) {
                        // INDUSTRIAL: We log as 'anonymous' if DB user isn't resolved yet
                        await logSecurityEvent('anonymous', null, 'AI_PIPELINE_ANOMALY', `Character limit exceeded: ${studentText.length} > ${allowed} (Pages: ${effectivePageCount})`, ip);
                        return res.status(413).json({ 
                            error: `Textmenge für diesen Schüler zu groß. Max ${allowed} Zeichen erlaubt (Aktuell: ${studentText.length}).` 
                        });
                    }
                }

                // 4. DB-AUTHORITATIVE AUTHORIZATION (Pillar 8)
                let dbUser = await prisma.user.findUnique({
                    where: { logtoId: userId },
                    include: { memberships: { include: { workspace: true } } }
                });

                // --- INDUSTRIAL UPGRADE: Just-In-Time (JIT) Provisioning ---
                if (!dbUser && isAuthenticated) {
                    try {
                        dbUser = await UserService.ensureUserExists(userId!, claims);
                        logger.info('SECURITY_SYNC: JIT Provisioned user on-the-fly', { logtoId: userId });
                    } catch (provisionError: any) {
                        logger.error(`JIT Provisioning Failed: ${provisionError.message}`, { userId });
                        return res.status(403).json({ error: 'Nutzerprofil-Erstellung fehlgeschlagen.' });
                    }
                }

                if (!dbUser) {
                    await logSecurityEvent('anonymous', null, 'SECURITY_ANOMALY', `User not found even after JIT attempt: ${userId}`, ip);
                    return res.status(403).json({ error: 'Nutzerprofil nicht in Datenbank gefunden.' });
                }

                const internalUserId = dbUser.id;

                if (requireAdmin) {
                    // SYS-ADMIN Check (Global God-Mode)
                    if (requireAdmin === 'SYS') {
                        if (dbUser.role !== 'ADMIN') {
                            await logSecurityEvent(internalUserId, null, 'ACCESS_DENIED', `Unauthorized SYS-ADMIN access to ${req.url}`, ip);
                            return res.status(403).json({ error: 'System-Administratorrechte erforderlich.' });
                        }
                    } 
                    // ORG-ADMIN Check (Workspace-Specific Island)
                    else if (requireAdmin === 'ORG') {
                        let workspaceId = (req.body?.workspaceId || req.query?.workspaceId) as string;
                        if (!workspaceId) {
                            workspaceId = dbUser.activeWorkspaceId || '';
                        }

                        if (!workspaceId) {
                            return res.status(400).json({ error: 'Workspace-ID für Berechtigungsprüfung erforderlich.' });
                        }

                        const membership = dbUser.memberships.find(m => m.workspaceId === workspaceId);
                        const isAdminAtOrga = membership && (membership.role === 'ADMIN' || membership.role === 'OWNER');
                        const isGlobalAdmin = dbUser.role === 'ADMIN';

                        if (!isAdminAtOrga && !isGlobalAdmin) {
                            await logSecurityEvent(internalUserId, workspaceId, 'ACCESS_DENIED', `Unauthorized ORG-ADMIN access to ${req.url}`, ip);
                            return res.status(403).json({ error: 'Organisations-Administratorrechte erforderlich.' });
                        }
                    } 
                    // Legacy / General Admin Check
                    else {
                        const roles = (claims.roles as string[]) || [];
                        if (!roles.includes('ADMIN') && dbUser.role !== 'ADMIN') {
                            await logSecurityEvent(internalUserId, null, 'ACCESS_DENIED', `Unauthorized access to ${req.url}`, ip);
                            return res.status(403).json({ error: 'Administratorrechte erforderlich.' });
                        }
                    }
                }

                // 5. EXECUTE HANDLER
                return await handler(req, res);

            } catch (error: any) {
                logger.error(`Security Wrapper Exception: ${error.message}`, { url: req.url, ip });
                return res.status(500).json({ error: 'Interner Sicherheitsfehler.' });
            }
        });

        return await logtoHandler(req, res);
    };
}
