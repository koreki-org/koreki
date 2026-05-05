import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';

const joinSchema = z.object({
    inviteCode: z.string().min(1, 'Code erforderlich')
});

/**
 * Workspace Join API (Industrial Multi-Tenancy)
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { claims } = req.user;
    const logtoId = claims.sub;

    const user = await prisma.user.findUnique({ where: { logtoId } });
    if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' });

    if (req.method === 'POST') {
        const validation = joinSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);
        const { inviteCode } = validation.data;

        try {
            const workspace = await (prisma as any).workspace.findUnique({
                where: { inviteCode }
            });

            if (!workspace) return res.status(404).json({ message: 'Ungültiger Code oder Institut nicht gefunden' });
            if (workspace.type !== 'ORGANIZATION') return res.status(400).json({ message: 'Privaten Workspaces kann man nicht per Code beitreten' });

            // Idempotency: Is user already in this workspace?
            const alreadyMember = await (prisma as any).membership.findUnique({
                where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } }
            });

            if (alreadyMember) return res.status(200).json({ success: true, workspaceName: workspace.name, alreadyIn: true });

            await prisma.$transaction(async (tx) => {
                const txAny = tx as any;

                // EXCLUSIVE TENANCY: JOINING ORG -> DELETE OTHER ORG MEMBERSHIPS
                await txAny.membership.deleteMany({
                    where: { 
                        userId: user.id, 
                        workspace: { type: 'ORGANIZATION' } 
                    }
                });

                // Create new membership
                await txAny.membership.create({
                    data: {
                        userId: user.id,
                        workspaceId: workspace.id,
                        role: 'MEMBER'
                    }
                });

                // Set Active Context and elevate to STANDARD mode
                await (tx as any).user.update({
                    where: { id: user.id },
                    data: { 
                        activeWorkspaceId: workspace.id,
                        appMode: user.appMode === 'PURE' ? 'PURE' : 'STANDARD',
                        role: user.role === 'ADMIN' ? 'ADMIN' : 'USER'
                    }
                });
            });

            return res.status(200).json({ success: true, workspaceName: workspace.name });
        } catch (err) {
            logger.error('Join Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
            return res.status(500).json({ message: 'Fehler beim Beitreten' });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
});
