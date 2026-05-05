import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';

const removeSchema = z.object({
    membershipId: z.string().min(1, 'Mitgliedschafts-ID erforderlich'),
    targetUserId: z.string().min(1, 'Nutzer-ID erforderlich'),
    workspaceId: z.string().min(1, 'Workspace-ID erforderlich') // Required for Pillar 8 RBAC
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const validation = removeSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);

        const { membershipId, targetUserId } = validation.data;

        // Pillar 8: DB-Authoritative RBAC has already verified that 
        // the requester is an ADMIN of the workspace provided in req.body.workspaceId.

        // 2. Perform the Removal & Downgrade in a Transaction
        await prisma.$transaction(async (tx) => {
            const txAny = tx as any;

            // A. Delete the Membership
            await txAny.membership.delete({
                where: { id: membershipId }
            });

            // B. Downgrade the target user
            await tx.user.update({
                where: { id: targetUserId },
                data: {
                    role: 'USER', // Loses expert status (Auto-Expert logic)
                    appMode: 'TRIAL', // Reset to sandbox
                    activeWorkspaceId: null // Clear organization context
                }
            });

            // C. Reset the user's Personal Workspace credits to 0
            const personalMemberships = await txAny.membership.findMany({
                where: {
                    userId: targetUserId,
                    workspace: { type: 'PERSONAL' },
                    role: 'OWNER'
                }
            });

            for (const pm of personalMemberships) {
                await txAny.workspace.update({
                    where: { id: pm.workspaceId },
                    data: { credits: 0 }
                });
            }
        });

        return res.status(200).json({ success: true, message: 'Lehrer erfolgreich entfernt und zurückgestuft' });

    } catch (error) {
        logger.error('ERROR in /api/org-admin/remove-member', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}, { requireAdmin: 'ORG' });
