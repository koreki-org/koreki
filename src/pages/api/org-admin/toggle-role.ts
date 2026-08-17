import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { toErrorMessage } from '../../../lib/error-message';

const toggleSchema = z.object({
    membershipId: z.string().min(1, 'Mitgliedschafts-ID erforderlich'),
    targetRole: z.enum(['ADMIN', 'MEMBER']),
    workspaceId: z.string().min(1, 'Workspace-ID erforderlich') // Required for Pillar 8 RBAC
});

/**
 * OrgAdmin Role Toggle API
 * 👥🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const validation = toggleSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);

        const { membershipId, targetRole, workspaceId } = validation.data;

        // 1. Fetch target membership to verify context
        const targetMembership = await prisma.membership.findUnique({
            where: { id: membershipId }
        });

        // Pillar 8: withSecurity hat die Rechte des Aufrufers am mitgeschickten
        // workspaceId geprueft — nicht die Zugehoerigkeit des Ziels. Ohne diese
        // Bindung liesse sich mit dem eigenen persoenlichen Workspace (dort ist
        // jeder Nutzer OWNER) die Rollenvergabe fremder Organisationen steuern.
        if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
            return res.status(404).json({ message: 'Mitgliedschaft nicht gefunden' });
        }

        // Prevent demoting the OWNER
        if (targetMembership.role === 'OWNER') {
            return res.status(403).json({ message: 'Der Eigentümer der Organisation kann nicht herabgestuft werden' });
        }

        // 2. Perform the Role Toggle
        await prisma.membership.update({
            where: { id: membershipId },
            data: { role: targetRole }
        });

        return res.status(200).json({ 
            success: true, 
            message: `Rolle erfolgreich auf ${targetRole === 'ADMIN' ? 'Org-Verwalter' : 'Lehrkraft'} geändert` 
        });

    } catch (error) {
        logger.error('ERROR in /api/org-admin/toggle-role', { endpoint: req.url, message: toErrorMessage(error) });
        return res.status(500).json({ message: 'Interner Server-Fehler' });
    }
}, { requireAdmin: 'ORG' });
