import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';
import { LocalActiveSelectionService } from '../../../lib/services/local-profile-service';

/**
 * Update User Active GradingMemory Profile API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const logtoId = requireUserId(req);

    const { gradingMemoryId } = req.body;

    if (isLocalInstance()) {
        // Ohne DB, aber nicht ohne Gedaechtnis: Die Zuordnung wandert in dieselbe
        // nutzerbezogene JSON-Ablage wie die Profile selbst (siehe Prompt-/Skill-/AI-Pendant).
        LocalActiveSelectionService.set({ activeGradingMemoryId: gradingMemoryId || null }, logtoId);
        return res.status(200).json({ success: true });
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
