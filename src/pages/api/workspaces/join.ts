import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { toErrorMessage } from '../../../lib/error-message';

const joinSchema = z.object({
    inviteCode: z.string().min(1, 'Code erforderlich')
});

/**
 * Workspace Join API (Industrial Multi-Tenancy)
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const logtoId = requireUserId(req);

    const user = await prisma.user.findUnique({ where: { logtoId } });
    if (!user) return res.status(404).json({ message: 'Nutzer nicht gefunden' });

    if (req.method === 'POST') {
        const validation = joinSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);
        const { inviteCode } = validation.data;

        try {
            const workspace = await prisma.workspace.findUnique({
                where: { inviteCode }
            });

            if (!workspace) return res.status(404).json({ message: 'Ungültiger Code oder Institut nicht gefunden' });
            if (workspace.type !== 'ORGANIZATION') return res.status(400).json({ message: 'Privaten Workspaces kann man nicht per Code beitreten' });

            // Idempotency: Is user already in this workspace?
            const alreadyMember = await prisma.membership.findUnique({
                where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } }
            });

            if (alreadyMember) return res.status(200).json({ success: true, workspaceName: workspace.name, alreadyIn: true });

            await prisma.$transaction(async (tx) => {

                // EXCLUSIVE TENANCY: JOINING ORG -> DELETE OTHER ORG MEMBERSHIPS
                await tx.membership.deleteMany({
                    where: { 
                        userId: user.id, 
                        workspace: { type: 'ORGANIZATION' } 
                    }
                });

                // Create new membership
                await tx.membership.create({
                    data: {
                        userId: user.id,
                        workspaceId: workspace.id,
                        role: 'MEMBER'
                    }
                });

                // Set Active Context and elevate to STANDARD mode
                //
                // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand
                // `user.role === 'ADMIN' ? 'ADMIN' : 'USER'`. Das ist die
                // GLOBALE Nutzerrolle, nicht die Mitgliedschaftsrolle — und
                // dieses Feld traegt auch 'EXPERTE'. Wer den Experten-Modus
                // fuer 25 Credits freigeschaltet hatte und danach mit einem
                // Einladungscode seiner Schule beitrat, verlor ihn wortlos:
                // aus EXPERTE wurde USER, ohne Hinweis und ohne Erstattung.
                //
                // Die Regel "erhoehte Rolle bewahren" galt fuer ADMIN und
                // nicht fuer das Geschwister EXPERTE — dieselbe Klasse wie an
                // vielen Stellen dieser Durchsicht.
                //
                // Die Absicht bleibt erhalten: Wer keine erhoehte Rolle hat,
                // bekommt beim Beitritt die Grundrolle. Die Mitgliedschaft
                // darueber ist davon unberuehrt und bleibt 'MEMBER'.
                const behaelt = user.role === 'ADMIN' || user.role === 'EXPERTE';

                await tx.user.update({
                    where: { id: user.id },
                    data: { 
                        activeWorkspaceId: workspace.id,
                        appMode: user.appMode === 'PURE' ? 'PURE' : 'STANDARD',
                        role: behaelt ? user.role : 'USER'
                    }
                });
            });

            return res.status(200).json({ success: true, workspaceName: workspace.name });
        } catch (err) {
            logger.error('Join Error', { endpoint: req.url, message: toErrorMessage(err) });
            return res.status(500).json({ message: 'Fehler beim Beitreten' });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
});
