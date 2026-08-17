import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';

const uploadSchema = z.object({
    workspaceId: z.string().min(1, 'Workspace-ID erforderlich'),
    fileUrl: z.string().optional()
});

/**
 * OrgAdmin AVV Upload API
 * 👥🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const validation = uploadSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);

        const { workspaceId, fileUrl } = validation.data;

        // Pillar 8 Gatekeeper (withSecurity) has already verified that 
        // the requester has ADMIN/OWNER rights for the workspaceId provided.

        // 2. Update the AVV status for the Workspace
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { 
                avvAccepted: true,
                avvFileUrl: fileUrl || `/uploads/org_avv_${workspaceId}.pdf` 
            }
        });

        return res.status(200).json({ success: true, message: 'Institutions-AVV erfolgreich hinterlegt' });

    } catch (error) {
        logger.error('ERROR in /api/org-admin/upload-avv', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}, { requireAdmin: 'ORG' });
