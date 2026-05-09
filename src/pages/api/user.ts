import type { NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { UserService } from '../../lib/services/user-service';
import { getSystemAiStatus } from '../../lib/billing';
import { withSecurity, AuthenticatedRequest } from '../../lib/security';
import { logger } from '../../lib/logger';
import { isLocalInstance, getKorekiMode } from '../../lib/env-context';

/**
 * User Status & Sync API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper with JIT Provisioning support.
 * This is the central entry point for user context and workspace synchronization.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        const { isAuthenticated, claims } = req.user;

        if (isAuthenticated && claims) {
            const logtoId = claims.sub;

            if (isLocalInstance()) {
                const mode = getKorekiMode();
                const appMode = mode === 'community' ? 'STANDARD' : 'PURE';
                
                // --- ROLE RESOLUTION FOR LOCAL INSTANCE ---
                let role = 'USER';
                const roles = (claims as any).roles || [];
                
                logger.info(`User API (Local): Mode=${mode}`, { roles });

                if (mode === 'desktop') {
                    role = 'ADMIN';
                } else {
                    const adminRoleName = process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME || 'koreki-admin';
                    const isAdmin = roles.includes(adminRoleName) || roles.includes('ADMIN');
                    role = isAdmin ? 'ADMIN' : 'USER';
                    logger.info(`Community Auth: adminRoleName=${adminRoleName}, isAdmin=${isAdmin}, finalRole=${role}`);
                }

                // Return stateless local user info
                return res.status(200).json({
                    loggedIn: true,
                    user: {
                        id: logtoId,
                        username: claims.given_name || claims.name || claims.preferred_username || 'Lehrer',
                        role,
                        credits: 9999,
                        appMode,
                        avvAccepted: true,
                        canEditPrompts: true,
                        canBuyCredits: false,
                        hasGlobalAiKey: !!process.env.MISTRAL_API_KEY || !!process.env.MITTWALD_API_KEY
                    },
                    aiStatus: { ocrBrakeActive: false, correctionBrakeActive: false }
                });
            }

            if (!logtoId) {
                return res.status(401).json({ loggedIn: false, error: 'Keine Logto ID gefunden.' });
            }

            // --- ARCHITECTURAL UPGRADE: JIT Sync ---
            // The security wrapper already ensures the user exists via JIT,
            // but we call it here again to get the latest profile and handle
            // the sync in a unified way (Industrial Standard).
            const user = await UserService.ensureUserExists(logtoId, claims);

            if (!user) return res.status(500).json({ loggedIn: false, error: 'User Sync fehlgeschlagen.' });
 
            const activeWsId = (user as any).activeWorkspaceId;
            const personalWsId = user.memberships.find((m: any) => m.workspace.type === 'PERSONAL')?.workspaceId;
            const targetWsId = activeWsId || personalWsId;
            const activeMembership = user.memberships.find((m: any) => m.workspaceId === targetWsId) || user.memberships[0];
            const activeWorkspace = activeMembership?.workspace;
 
            // --- INDUSTRIAL ROLE RESOLUTION ---
            const isSystemAdmin = user.role === 'ADMIN';
            const isExpert = user.role === 'EXPERTE';
            const hasOrgMembership = user.memberships.some((m: any) => m.workspace.type === 'ORGANIZATION');
            const isOrgWorkspace = activeWorkspace?.type === 'ORGANIZATION';
            const isOrgAdmin = activeMembership?.role === 'ADMIN' || activeMembership?.role === 'OWNER';

            // Expert Button visibility: 🏢 Auto-Expert for all org members
            const canEditPrompts = isSystemAdmin || isExpert || hasOrgMembership;
            const canBuyCredits = isSystemAdmin || !isOrgWorkspace || isOrgAdmin;

            // 5. LOGIN LOGGING (Eingabekontrolle) 📝🛡️
            await prisma.privacyLog.create({
                data: {
                    userId: user.id,
                    workspaceId: targetWsId || null,
                    action: 'SECURITY_EVENT: LOGIN_SUCCESS',
                    confirmedText: `User ${user.username} successfully synchronized session.`,
                    ip: req.ip
                }
            });

            return res.status(200).json({
                loggedIn: true,
                user: {
                    id: user.id,
                    username: user.username,
                    hasProAccess: user.hasProAccess,
                    role: user.role,
                    credits: activeWorkspace?.credits || 0,
                    appMode: user.appMode,
                    avvAccepted: activeWorkspace?.avvAccepted || false,
                    activeWorkspaceId: user.activeWorkspaceId,
                    activePromptProfileId: user.activePromptProfileId,
                    activeAiProfileId: user.activeAiProfileId,
                    logtoId: user.logtoId,
                    activeWorkspaceName: activeWorkspace?.name,
                    activeWorkspaceType: activeWorkspace?.type,
                    activeMembershipRole: activeMembership?.role,
                    canEditPrompts,
                    canBuyCredits,
                    hasGlobalAiKey: !!process.env.MISTRAL_API_KEY || !!process.env.MITTWALD_API_KEY
                },
                aiStatus: await getSystemAiStatus()
            });
        }

        return res.status(200).json({ loggedIn: false });
    } catch (error) {
        logger.error('CRITICAL ERROR in /api/user', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}, { allowAnonymous: true });
