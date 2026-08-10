import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

/**
 * Privacy Logs API (Admin View)
 * 🏮🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC (SysAdmin only).
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const logtoId = requireUserId(req);

    try {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'User ID ist erforderlich.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId as string }
        });

        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        }

        const logs = await prisma.privacyLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json(logs);
    } catch (error: any) {
        logger.error('Admin Privacy Logs Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ error: 'Fehler beim Laden der Logs.' });
    }
}, { requireAdmin: 'SYS' });
