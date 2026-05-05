import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

/**
 * Privacy Log API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { action, confirmedText } = req.body;

        const { claims } = req.user;
        const logtoId = claims.sub;

        const user = await prisma.user.findUnique({ where: { logtoId } });
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        }

        await prisma.privacyLog.create({
            data: {
                userId: user.id,
                action,
                confirmedText,
                ip: req.ip
            }
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        logger.error('Privacy Log Error', { endpoint: req.url, message: error.message || String(error) });
        return res.status(500).json({ error: 'Interner Serverfehler beim Loggen der Einwilligung.' });
    }
});
