import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../../lib/prisma';
import { AdminService } from '../../../lib/services/admin-service';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { toErrorMessage } from '../../../lib/error-message';

/**
 * Industrial Admin Users API (Stage 13)
 * 👥🛡️🏛️
 * Migrated to Pillar 8 (DB-Authoritative RBAC).
 */

const adminActionSchema = z.object({
    userId: z.string().min(1),
    action: z.enum(['toggle-pro', 'add-credits', 'delete-user', 'set-mode', 'set-role', 'assign-workspace', 'set-membership-role']),
    amount: z.number().optional(),
    mode: z.string().optional(),
    role: z.string().optional(),
    workspaceId: z.string().optional()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {

    // 2. Data Retrieval (GET)
    if (req.method === 'GET') {
        try {
            const users = await prisma.user.findMany({
                include: { memberships: { include: { workspace: true } } },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json(users);
        } catch (err) {
            return res.status(500).json({ message: 'Fehler beim Laden der Nutzer' });
        }
    }

    // 3. Domain Operations (POST)
    if (req.method === 'POST') {
        const validation = adminActionSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);
        const { userId, action, amount, mode, role, workspaceId } = validation.data;

        try {
            switch (action) {
                case 'toggle-pro':
                    await AdminService.togglePro(userId);
                    break;
                
                case 'add-credits':
                    await AdminService.addCredits(userId, amount || 10);
                    break;

                case 'assign-workspace':
                    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID fehlt' });
                    await AdminService.assignWorkspace(userId, workspaceId);
                    break;

                case 'set-membership-role':
                    if (!workspaceId || !role) return res.status(400).json({ message: 'WorkspaceID oder Rolle fehlt' });
                    await AdminService.setMembershipRole(userId, workspaceId, role);
                    break;

                case 'delete-user':
                    await AdminService.deleteUser(userId);
                    break;

                case 'set-mode':
                    if (!mode) return res.status(400).json({ message: 'Modus fehlt' });
                    await AdminService.setMode(userId, mode);
                    break;

                case 'set-role':
                    if (!role) return res.status(400).json({ message: 'Rolle fehlt' });
                    await AdminService.setRole(userId, role);
                    break;

                default:
                    return res.status(400).json({ message: 'Unbekannte Aktion' });
            }

            return res.status(200).json({ success: true, message: 'Aktion erfolgreich ausgeführt' });
        } catch (err) {
            logger.error(`[Admin-API] Error during action ${action}`, { endpoint: req.url, message: toErrorMessage(err) });
            return res.status(500).json({ 
                message: toErrorMessage(err, 'Ein interner Fehler ist aufgetreten'),
                success: false 
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}, { requireAdmin: 'SYS' });
