import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { checkAndDeductCredits } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Unlock Expert Mode API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const logtoId = requireUserId(req);

    try {
        const user = await prisma.user.findUnique({
            where: { logtoId: logtoId }
        });

        if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        // Already Expert or Admin?
        if (user.role === 'EXPERTE' || user.role === 'ADMIN') {
            return res.status(400).json({ error: 'Du bist bereits im Experten-Modus oder Admin.' });
        }

        // --- NEW CENTRALIZED BILLING ---
        try {
            await checkAndDeductCredits(logtoId, 25);
        } catch (billingError) {
            return res.status(402).json({ error: toErrorMessage(billingError) });
        }

        // Upgrade Role
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'EXPERTE' }
        });

        logger.info(`[Expert Unlock] User ${user.username} successfully upgraded to EXPERTE (25 credits deducted from active workspace).`);

        return res.status(200).json({
            success: true,
            message: 'Glückwunsch! Du bist jetzt Experte.',
            newRole: 'EXPERTE'
        });
    } catch (error) {
        logger.error('Unlock Expert error', { endpoint: req.url, message: toErrorMessage(error) });
        return res.status(500).json({ error: 'Interner Serverfehler beim Freischalten.' });
    }
});
