import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

/**
 * Switch Workspace API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { claims } = req.user;
    const logtoId = claims.sub;

    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId fehlt.' });

    try {
        // --- INDUSTRIAL MEMBERSHIP VERIFICATION ---
        const user = await prisma.user.findUnique({ where: { logtoId } });
        if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden.' });

        const isMember = await prisma.membership.findUnique({
            where: {
                userId_workspaceId: {
                    userId: user.id,
                    workspaceId: workspaceId
                }
            }
        });

        if (!isMember) return res.status(403).json({ error: 'Zugriff auf diesen Workspace verweigert.' });

        // Update der activeWorkspaceId (Der eigentliche Switch)
        await prisma.user.update({
            where: { id: user.id },
            data: { activeWorkspaceId: workspaceId }
        });

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Switch Workspace Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Fehler beim Workspace-Wechsel.' });
    }
});
