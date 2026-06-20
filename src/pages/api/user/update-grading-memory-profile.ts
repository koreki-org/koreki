import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';

/**
 * Update User Active GradingMemory Profile API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { claims } = req.user;
    const logtoId = claims.sub;

    const { gradingMemoryId } = req.body;

    if (isLocalInstance()) {
        return res.status(200).json({ success: true, message: 'Lokaler Modus: Erfahrungsschatz-Zuordnung nur im Browser aktiv' });
    }

    try {
        await prisma.user.update({
            where: { logtoId: logtoId },
            data: { activeGradingMemoryId: gradingMemoryId || null }
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error('Update grading memory profile error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
        return res.status(500).json({ message: 'Fehler beim Speichern der Erfahrungsschatz-Einstellung' });
    }
});
