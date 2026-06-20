import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';

/**
 * User Context API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { claims } = req.user;
    const logtoId = claims.sub;

    if (isLocalInstance()) {
        return res.status(200).json({
            workspaces: [
                {
                    id: 'local-workspace-id',
                    name: 'Local Workspace',
                    type: 'PERSONAL',
                    credits: 999999,
                    role: 'OWNER'
                }
            ],
            activeWorkspace: {
                id: 'local-workspace-id',
                name: 'Local Workspace',
                type: 'PERSONAL',
                credits: 999999,
                role: 'OWNER'
            }
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { logtoId },
            include: {
                memberships: {
                    include: {
                        workspace: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden.' });

        const workspaces = user.memberships.map(m => ({
            id: m.workspace.id,
            name: m.workspace.name,
            type: m.workspace.type,
            credits: m.workspace.credits,
            role: m.role
        }));

        const activeWorkspaceId = user.activeWorkspaceId || (user.memberships.length > 0 ? user.memberships[0].workspaceId : null);
        const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

        res.status(200).json({
            workspaces,
            activeWorkspace
        });
    } catch (error) {
        logger.error('User Context Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Fehler beim Laden des Profils.' });
    }
});
