import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';

const updateCodeSchema = z.object({
    workspaceId: z.string().min(1, 'Workspace-ID erforderlich'),
    inviteCode: z.string().min(1, 'Neuer Code erforderlich')
});

/**
 * OrgAdmin Update Code API
 * 👥🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const validation = updateCodeSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);

        const { workspaceId, inviteCode } = validation.data;

        // Pillar 8 Gatekeeper (withSecurity) has already verified that 
        // the requester has ADMIN/OWNER rights for the workspaceId provided.

        // 2. Update the invitation code
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { inviteCode: inviteCode.trim() }
        });

        return res.status(200).json({ success: true, message: 'Einladungs-Code erfolgreich aktualisiert' });

    } catch (error: any) {
        logger.error('ERROR in /api/org-admin/update-code', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Dieser Code ist bereits vergeben. Bitte versuche einen anderen.' });
        }
        return res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}, { requireAdmin: 'ORG' });
