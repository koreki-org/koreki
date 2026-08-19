import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import { getCurrentAVV } from '../../../config/legal';
import { getLatestLegalDocument } from '../../../lib/legal';
import { toErrorMessage } from '../../../lib/error-message';

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

        // Ziel-Workspace und Berechtigung ZUERST — vor dem Protokolleintrag.
        //
        // Stand die Pruefung dahinter, hinterliess ein abgelehnter Versuch
        // trotzdem einen Eintrag "AVV_CONSENT_ACCEPTED". Ein Protokoll, das
        // eine Zustimmung ausweist, die nie erteilt wurde, ist schlimmer als
        // keines: Es ist ausgerechnet der Nachweis, auf den sich im Ernstfall
        // jemand beruft.
        let targetWorkspaceId: string | undefined = workspaceId;

        if (!targetWorkspaceId) {
            // Ohne Angabe gilt der persoenliche Workspace.
            const personalWS = await prisma.membership.findFirst({
                where: { userId: user.id, workspace: { type: 'PERSONAL' } }
            });
            targetWorkspaceId = personalWS?.workspaceId;
        }

        if (targetWorkspaceId) {
            // --- MANDANTEN-GRENZE ---
            //
            // GEFUNDEN BEIM LESEN, 19.08.2026: Die Aktualisierung unten stand
            // ohne jede Pruefung. `workspaceId` kam ungeprueft aus dem
            // Anfrage-Rumpf — JEDER angemeldete Nutzer konnte damit fuer einen
            // BELIEBIGEN fremden Workspace `avvAccepted: true` setzen.
            //
            // Das ist nicht irgendein Flag: An ihm haengt der Compliance-Riegel
            // vor der KI-Verarbeitung ("Compliance: AVV-Zustimmung der
            // Schulleitung fehlt", siehe lib/billing.ts). Ein Fremder konnte
            // damit die Verarbeitung fuer eine Schule freischalten, deren
            // Leitung nie zugestimmt hat.
            //
            // Architectural Vision §4 sagt es woertlich: "Jede Query muss
            // zwingend auf die organization_id filtern."
            //
            // Geprueft wird wie in `withSecurity({ requireAdmin: 'ORG' })`:
            // Mitgliedschaft im Ziel-Workspace mit der Rolle ADMIN oder OWNER,
            // oder globaler Systemadministrator. Persoenliche Workspaces
            // bekommen ihrem Besitzer bei der Anlage die Rolle OWNER — der
            // uebliche Weg bleibt damit unveraendert.
            const mitgliedschaft = await prisma.membership.findFirst({
                where: { userId: user.id, workspaceId: targetWorkspaceId }
            });
            const darfZustimmen =
                (mitgliedschaft?.role === 'ADMIN' || mitgliedschaft?.role === 'OWNER')
                || user.role === 'ADMIN';

            if (!darfZustimmen) {
                logger.security('AVV-Zustimmung fuer fremden Workspace abgelehnt', {
                    endpoint: req.url,
                    userId: user.id,
                    workspaceId: targetWorkspaceId
                });
                return res.status(403).json({
                    error: 'Nur die Leitung des Workspace kann die AVV-Zustimmung erteilen.'
                });
            }
        }

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
            message: toErrorMessage(error) 
        });
        return res.status(500).json({ error: 'Interner Serverfehler beim Speichern der Zustimmung.' });
    }
});
