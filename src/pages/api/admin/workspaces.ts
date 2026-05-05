import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';

const workspaceSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['PERSONAL', 'ORGANIZATION']),
    credits: z.number().optional()
});

const actionSchema = z.object({
    workspaceId: z.string().min(1),
    action: z.enum(['add-credits', 'delete', 'set-invite-code']),
    amount: z.number().optional(),
    inviteCode: z.string().optional()
});

/**
 * Industrial Admin Workspaces API (Stage 18)
 * 🏛️🛡️⚖️
 * Pillar 8: DB-Authoritative RBAC (SysAdmin only).
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { claims } = req.user;
    const logtoId = claims.sub;

    if (req.method === 'GET') {
        try {
            const workspaces = await prisma.workspace.findMany({
                include: {
                    memberships: {
                        include: {
                            user: {
                                select: { username: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json(workspaces);
        } catch (err) {
            return res.status(500).json({ message: 'Fehler beim Laden der Workspaces' });
        }
    }

    if (req.method === 'POST') {
        // Create Workspace
        if (!req.body.action) {
            const validation = workspaceSchema.safeParse(req.body);
            if (!validation.success) return res.status(400).json(validation.error);
            
            try {
                const ws = await prisma.workspace.create({
                    data: {
                        name: validation.data.name,
                        type: validation.data.type,
                        credits: validation.data.credits || 0
                    }
                });
                return res.status(201).json(ws);
            } catch (err) {
                return res.status(500).json({ message: 'Fehler beim Erstellen' });
            }
        }

        // Action on Workspace
        const validation = actionSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error);
        const { workspaceId, action, amount, inviteCode } = validation.data;

        if (action === 'add-credits') {
            try {
                await prisma.workspace.update({
                    where: { id: workspaceId },
                    data: { credits: { increment: amount || 100 } }
                });
                return res.status(200).json({ success: true });
            } catch (err) {
                return res.status(500).json({ message: 'Fehler beim Aufladen' });
            }
        }

        if (action === 'set-invite-code') {
            if (!inviteCode) return res.status(400).json({ message: 'Ladercode fehlt' });
            try {
                // Ensure unique
                const existing = await (prisma as any).workspace.findFirst({
                    where: { inviteCode }
                });
                if (existing) return res.status(400).json({ message: 'Dieser Code ist bereits vergeben' });

                await (prisma as any).workspace.update({
                    where: { id: workspaceId },
                    data: { inviteCode }
                });
                return res.status(200).json({ success: true });
            } catch (err) {
                return res.status(500).json({ message: 'Fehler beim Setzen des Codes' });
            }
        }

        if (action === 'delete') {
            try {
                const workspace = await prisma.workspace.findUnique({
                    where: { id: workspaceId },
                    include: { memberships: { include: { user: true } } }
                });
                if (!workspace) return res.status(404).json({ message: 'Workspace nicht gefunden' });

                const creditsToDistribute = workspace.credits || 0;
                const members = workspace.memberships;
                const sharePerMember = members.length > 0 ? Math.floor(creditsToDistribute / members.length) : 0;

                await prisma.$transaction(async (tx) => {
                    const txAny = tx as any;

                    for (const membership of members) {
                        const user = membership.user;
                        const personalMembership = await txAny.membership.findFirst({
                            where: { userId: user.id, workspace: { type: 'PERSONAL' } },
                            include: { workspace: true }
                        });

                        const personalWsId = personalMembership?.workspace?.id;
                        const newRole = user.role === 'ADMIN' ? 'ADMIN' : 'EXPERTE';

                        await tx.user.update({
                            where: { id: user.id },
                            data: { 
                                role: newRole,
                                activeWorkspaceId: personalWsId || null,
                            }
                        });

                        if (sharePerMember > 0 && personalWsId) {
                            await txAny.workspace.update({
                                where: { id: personalWsId },
                                data: { credits: { increment: sharePerMember } }
                            });
                        }
                    }

                    await txAny.membership.deleteMany({ where: { workspaceId } });
                    await tx.workspace.delete({ where: { id: workspaceId } });
                });

                return res.status(200).json({ success: true, distributed: sharePerMember > 0 });
            } catch (err) {
                logger.error('Delete Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
                return res.status(500).json({ message: 'Fehler beim Löschen' });
            }
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}, { requireAdmin: 'SYS' });
