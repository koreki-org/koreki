import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Der Rumpf dieser Anfrage.
 *
 * Vorher stand hier `const { workspaceId } = req.body` mit einer blossen
 * Leer-Pruefung — der Client bestimmte damit auch den TYP. Ein Objekt statt
 * einer Zeichenkette lief bis in die Datenbank-Abfrage und endete dort als
 * 500 statt als 400. `architectural-vision` §8 verlangt das Schema; die Regel
 * hatte bis zum 19.08.2026 nur keinen Waechter.
 */
const switchWorkspaceSchema = z.object({
    workspaceId: z.string().min(1, 'workspaceId fehlt.')
});

/**
 * Switch Workspace API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const logtoId = requireUserId(req);

    const validation = switchWorkspaceSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
    }
    const { workspaceId } = validation.data;

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
        logger.error('Switch Workspace Error', { endpoint: req.url, message: toErrorMessage(error) });
        res.status(500).json({ error: 'Fehler beim Workspace-Wechsel.' });
    }
});
