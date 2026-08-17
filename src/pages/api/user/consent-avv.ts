import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import { getCurrentAVV } from '../../../config/legal';
import { getLatestLegalDocument } from '../../../lib/legal';

/**
 * Industrial AVV Consent API ⚖️
 * Replaces the old 'accept-avv.ts' with a structured audit trail.
 * High-performance, cryptographically anchored, and multi-tenant aware.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const logtoId = requireUserId(req);
    const { workspaceId } = req.body; 

    try {
        const user = await prisma.user.findUnique({ where: { logtoId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const currentAVVResource = getCurrentAVV();
        if (!currentAVVResource) {
            logger.error('AVV Registry mismatch: Dynamic AVV discovery failed');
            return res.status(500).json({ error: 'Systemkonfigurationsfehler: AVV nicht gefunden.' });
        }

        // Discover latest TOM and Manual for the bundle audit log
        const currentTOM = getLatestLegalDocument('tom');
        const currentManual = getLatestLegalDocument('betriebsanleitung');

        // 1. Structural Audit Log Entry
        await prisma.privacyLog.create({
            data: {
                userId: user.id,
                workspaceId: workspaceId || null,
                action: 'AVV_CONSENT_ACCEPTED',
                confirmedText: `User accepted Compliance Bundle: AVV v${currentAVVResource.version}, TOM v${currentTOM?.version || '?'}, Manual v${currentManual?.version || '?'}`,
                avvVersion: currentAVVResource.version,
                avvHash: currentAVVResource.hash,
                ip: req.ip
            }
        });

        // 2. Update Fast-Lookup Flags (UNIFIED: Always Workspace-Centric)
        let targetWorkspaceId = workspaceId;
        
        if (!targetWorkspaceId) {
            // Find Personal Workspace if no ID provided
            const personalWS = await prisma.membership.findFirst({
                where: { userId: user.id, workspace: { type: 'PERSONAL' } }
            });
            targetWorkspaceId = personalWS?.workspaceId;
        }

        if (targetWorkspaceId) {
            await prisma.workspace.update({
                where: { id: targetWorkspaceId },
                data: { avvAccepted: true }
            });
        }

        logger.info('Compliance Consent recorded', { userId: user.id, version: currentAVVResource.version, workspaceId });
        return res.status(200).json({ success: true, version: currentAVVResource.version });
    } catch (error) {
        logger.error('Consent AVV error', { 
            logtoId, 
            message: error instanceof Error ? error.message : String(error) 
        });
        return res.status(500).json({ error: 'Interner Serverfehler beim Speichern der Zustimmung.' });
    }
});
