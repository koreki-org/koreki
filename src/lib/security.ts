import type { NextApiRequest, NextApiResponse } from 'next';
import type { LogtoContext } from '@logto/next';
import { logtoClient } from './logto';
import { checkIpFloodLimit, checkSubjectLimit } from './rate-limit';
import { logSecurityEvent } from './audit-service';
import { logger } from './logger';
import prisma from './prisma';
import { UserService } from './services/user-service';
import { isLocalInstance, isKeycloakAuth } from './env-context';
import { extractBearerToken, verifyKeycloakToken, type VerifiedKeycloakIdentity } from './auth-keycloak-server';
import { toErrorMessage } from './error-message';

export type SecurityOptions = {
    /**
     * Muss auf jeder Route gesetzt sein, die einen KI-Anbieter aufruft.
     * Schaltet vom globalen Limiter (100/min) auf den AI-Limiter (10/min).
     */
    isAi?: boolean;
    /**
     * 'SYS' = globaler System-Admin, 'ORG' = Admin/Owner des uebergebenen
     * workspaceId. Der frühere Boolean-Wert ist entfallen: er pruefte gegen
     * Token-Claims ODER die Datenbank und widersprach damit Saeule 8
     * (DB-authoritative). Keine Route hat ihn genutzt.
     */
    requireAdmin?: 'SYS' | 'ORG';
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
 * Nutzer-ID einer authentifizierten Anfrage.
 *
 * `LogtoContext.claims` ist optional typisiert, weil es anonyme Anfragen gibt.
 * Hinter `withSecurity` ohne `allowAnonymous` ist die Identitaet aber garantiert —
 * der Wrapper bricht sonst mit 401 ab. Statt diese Zusicherung in jeder Route
 * mit `!` stumm zu schalten, wird sie hier einmal wirklich geprueft: unter
 * strictNullChecks faellt sonst genau dieser Fall an 15 Stellen auf.
 */
export function requireUserId(req: AuthenticatedRequest): string {
    const sub = req.user?.claims?.sub;
    if (!sub) {
        throw new Error('Nutzer-ID fehlt.');
    }
    return sub;
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

        const tooManyRequests = async (subject: string) => {
            await logSecurityEvent('anonymous', null, 'RATE_LIMIT_EXCEEDED', `Subject: ${subject}, Endpoint: ${req.url}`, ip);
            return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten Sie eine Minute.' });
        };

        // 🛡️ Pillar 1, Stufe 1: Flut-Schutz vor der Authentifizierung.
        // Bewusst weit — hinter dieser IP kann ein ganzes Kollegium sitzen.
        if (!await checkIpFloodLimit(ip)) {
            return tooManyRequests(ip);
        }

        if (isLocalInstance()) {
            // 🏛️ COMMUNITY MULTI-USER (KEYCLOAK)
            // Kein DB-Abgleich möglich (bewusst DB-freier Tier), daher ist das
            // kryptografisch verifizierte Token die alleinige Source of Truth.
            // Client-gelieferte Identitäts-Header werden NIEMALS vertraut.
            if (isKeycloakAuth()) {
                const token = extractBearerToken(req.headers.authorization);

                if (!token) {
                    if (allowAnonymous) {
                        // Ohne Identitaet bleibt die IP die einzige Handhabe.
                        if (!await checkSubjectLimit(ip, false, isAi)) {
                            return tooManyRequests(ip);
                        }
                        req.user = {
                            isAuthenticated: false,
                            claims: {} as any
                        };
                        return await handler(req, res);
                    }
                    return res.status(401).json({ error: 'Nicht angemeldet.' });
                }

                let identity: VerifiedKeycloakIdentity;
                try {
                    identity = await verifyKeycloakToken(token);
                } catch (error) {
                    // Details bleiben serverseitig (Säule 4), Client bekommt eine generische Meldung.
                    logger.security('Keycloak-Token abgelehnt', {
                        url: req.url,
                        reason: toErrorMessage(error)
                    });
                    await logSecurityEvent('anonymous', null, 'AUTH_FAILURE', `Invalid Keycloak token for ${req.url}`, ip);
                    return res.status(401).json({ error: 'Nicht angemeldet.' });
                }

                // Rollenprüfung gegen verifizierte Claims. Workspaces existieren in
                // diesem Tier nicht, daher wird jede Admin-Anforderung gleich behandelt.
                if (requireAdmin && !identity.roles.includes('ADMIN')) {
                    await logSecurityEvent(identity.sub, null, 'ACCESS_DENIED', `Unauthorized admin access to ${req.url}`, ip);
                    return res.status(403).json({ error: 'Administratorrechte erforderlich.' });
                }

                // 🛡️ Pillar 1, Stufe 2: Community Multi-User teilt sich einen
                // Server — hier zaehlt die Lehrkraft, nicht die Schul-IP.
                if (!await checkSubjectLimit(identity.sub, true, isAi)) {
                    return tooManyRequests(identity.sub);
                }

                req.user = {
                    isAuthenticated: true,
                    claims: {
                        sub: identity.sub,
                        roles: identity.roles,
                        iss: identity.issuer,
                        aud: identity.clientId,
                        exp: identity.expiresAt,
                        iat: identity.issuedAt
                    }
                };
                return await handler(req, res);
            }

            // 🏮 DESKTOP TRUST-BYPASS
            // Ein-Nutzer-Gerät ohne Netzwerkkontext: die lokale Identität ist
            // implizit Admin. Bewusstes Trust-Modell, kein Bypass im Sinne von Säule 8.
            //
            // Bewusst OHNE Subjekt-Limit: der Nutzer betreibt die Instanz selbst,
            // auf eigener Hardware und mit eigenem Anbieter-Schluessel. Ein Limit
            // wuerde hier nichts schuetzen, aber eine Stapelverarbeitung ausbremsen.
            // Der IP-Flutschutz oben greift weiterhin.
            req.user = {
                isAuthenticated: true,
                claims: {
                    sub: 'local-desktop-user',
                    roles: ['ADMIN'],
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
                        // Ohne Identitaet bleibt die IP die einzige Handhabe.
                        if (!await checkSubjectLimit(ip, false, isAi)) {
                            return tooManyRequests(ip);
                        }
                        return await handler(req, res);
                    }

                    // Industrial Debugging for Auth Failures 🔍
                    // Capture state of body to detect Zod-failing patterns
                    const bodyType = typeof req.body;
                    const bodyPreview = bodyType === 'string' ? req.body.substring(0, 100) : (req.body ? 'object' : 'empty');

                    await logSecurityEvent('anonymous', null, 'AUTH_FAILURE', `Unauthenticated access to ${req.url} (Type: ${bodyType}, Preview: ${bodyPreview})`, ip);
                    return res.status(401).json({ error: 'Nicht angemeldet.' });
                }

                // 🛡️ Pillar 1, Stufe 2: ab hier zaehlt die Lehrkraft, nicht die
                // IP — eine Schule hinter NAT teilt sich sonst ein Kontingent.
                if (!await checkSubjectLimit(userId!, true, isAi)) {
                    return tooManyRequests(userId!);
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
                    } catch (provisionError) {
                        logger.error(`JIT Provisioning Failed: ${toErrorMessage(provisionError)}`, { userId });
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
                    // Deny-by-default: ein unbekannter requireAdmin-Wert darf
                    // niemals zum Durchlassen fuehren.
                    else {
                        await logSecurityEvent(internalUserId, null, 'SECURITY_ANOMALY', `Unknown requireAdmin value for ${req.url}`, ip);
                        return res.status(403).json({ error: 'Administratorrechte erforderlich.' });
                    }
                }

                // 5. EXECUTE HANDLER
                return await handler(req, res);

            } catch (error) {
                logger.error(`Security Wrapper Exception: ${toErrorMessage(error)}`, { url: req.url, ip });
                return res.status(500).json({ error: 'Interner Sicherheitsfehler.' });
            }
        });

        return await logtoHandler(req, res);
    };
}
