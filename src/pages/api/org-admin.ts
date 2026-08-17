import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../lib/security';
import { logger } from '../../lib/logger';

/**
 * Industrial Organization Admin API (Dashboard)
 * 🏛️🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC. 
 * SysAdmin has God-Mode, OrgAdmin is isolated to the workspace.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        const logtoId = requireUserId(req);
        
        // 1. Fetch User (needed for Dashboard context)
        const user = await prisma.user.findUnique({
            where: { logtoId },
            include: { 
                memberships: { 
                    where: { workspace: { type: 'ORGANIZATION' } },
                    include: { workspace: true } 
                } 
            }
        });

        if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' });

        // 2. Identify the organization for management
        // withSecurity has already verified permissions for THIS workspaceId (if provided)
        // AUTO-RESOLVE: Fallback to user's active workspace if param is missing
        let workspaceId = req.body.workspaceId || req.query.workspaceId as string;
        
        if (!workspaceId) {
            workspaceId = user.activeWorkspaceId || '';
        }

        // 3. Fetch Workspace details (Strictly ORGANIZATION only)
        // Note: Industrial Prisma usage - findUnique only on @unique fields (id)
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                                appMode: true,
                                ocrCreditsUsed: true,
                                correctionCreditsUsed: true,
                                createdAt: true
                            }
                        }
                    },
                    orderBy: {
                        user: {
                            username: 'asc'
                        }
                    }
                }
            }
        });
        
        // Post-fetch validation for ORGANIZATION type to maintain tenancy integrity
        if (!workspace || workspace.type !== 'ORGANIZATION') {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }

        // 4. Transform data for the dashboard
        return res.status(200).json({
            currentUserId: user.id,
            currentUserRole: user.role,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                credits: workspace.credits,
                inviteCode: workspace.inviteCode,
                avvAccepted: workspace.avvAccepted,
                createdAt: workspace.createdAt
            },
            members: workspace.memberships.map((m: any) => ({
                id: m.user.id,
                membershipId: m.id,
                username: m.user.username || 'Kollege',
                systemRole: m.user.role,
                workspaceRole: m.role === 'ADMIN' || m.role === 'OWNER' ? 'Org-Verwalter' : 'Lehrkraft',
                appMode: m.user.appMode,
                ocrUsed: m.user.ocrCreditsUsed,
                correctionUsed: m.user.correctionCreditsUsed,
                joinedAt: m.createdAt
            }))
        });

    } catch (error) {
        logger.error('ERROR in /api/org-admin', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}, { requireAdmin: 'ORG' });
