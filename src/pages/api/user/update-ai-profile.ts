import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';
import { LocalActiveSelectionService } from '../../../lib/services/local-profile-service';

/**
 * Update Active AI Parameter Profile API
 * 🏮🛡️🏛️
 * Persists the user's last-selected KI-Parameter profile.
 * Mirrors the pattern of `/api/user/update-profile` (Prompt Profile).
 * 
 * Local instances skip DB persistence — Desktop/Community use localStorage
 * via the Zustand store (Hybrid Sync, Arch §2).
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    const { claims } = req.user;
    const logtoId = claims.sub;

    const { profileId } = req.body;

    if (isLocalInstance()) {
        // Ohne DB, aber nicht ohne Gedaechtnis: Die Zuordnung wandert in dieselbe
        // nutzerbezogene JSON-Ablage wie die Profile selbst (siehe Prompt-/Skill-/Memory-Pendant).
        LocalActiveSelectionService.set({ activeAiProfileId: profileId || null }, logtoId);
        return res.status(200).json({ success: true });
    }

    try {
        await prisma.user.update({
            where: { logtoId: logtoId },
            data: { activeAiProfileId: profileId || null }
        });
        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error('Update AI profile error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
        return res.status(500).json({ message: 'Fehler beim Speichern der KI-Profil-Einstellung' });
    }
});
