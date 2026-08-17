import prisma from '../prisma';
import { deleteLogtoUser } from '../logto-mgmt';
import { logger } from '../logger';

/**
 * Industrial Admin Service (Stage 12)
 * 👥🛡️🏛️
 * Centralized domain service for administrative user & tenancy operations.
 * Ensures consistent data integrity and security-auditing.
 */
export const AdminService = {
    /**
     * Toggles Pro access for a user.
     */
    async togglePro(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('Nutzer nicht gefunden');
        
        return prisma.user.update({
            where: { id: userId },
            data: { hasProAccess: !user.hasProAccess }
        });
    },

    /**
     * Atomic Credit Top-Up with Adaptive Provisioning.
     * Ensures a workspace exists before provisioning credits.
     */
    async addCredits(userId: string, amount: number = 10) {
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: { memberships: { include: { workspace: true } } }
        }) as any;
        
        if (!user) throw new Error('Nutzer nicht gefunden');
        
        const activeWsId = user.activeWorkspaceId;
        const personalWsId = user.memberships?.find((m: any) => m.workspace?.type === 'PERSONAL')?.workspaceId;
        let targetWsId = activeWsId || personalWsId;

        // Verify/Repair orphaned workspace link
        if (targetWsId) {
            const wsExists = await prisma.workspace.findUnique({ where: { id: targetWsId } });
            if (!wsExists) {
                logger.info(`[Admin-Service] Repairing orphaned Workspace for User ${user.username}`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { activeWorkspaceId: null }
                });
                targetWsId = null;
            }
        }

        // Adaptive Provisioning: Create Personal Workspace if missing
        if (!targetWsId) {
            logger.info(`[Admin-Service] Provisioning new Workspace for User ${user.username}`);
            const newPersonalWs = await prisma.workspace.create({
                data: {
                    name: `Privater Workspace (${user.username || 'Nutzer'})`,
                    type: 'PERSONAL',
                    credits: 0,
                    memberships: {
                        create: { userId: user.id, role: 'OWNER' }
                    }
                }
            });
            targetWsId = newPersonalWs.id;
            
            await prisma.user.update({
                where: { id: user.id },
                data: { activeWorkspaceId: targetWsId }
            });
        }

        // Atomic Credit increment
        return prisma.workspace.update({
            where: { id: targetWsId },
            data: { credits: { increment: amount } }
        });
    },

    /**
     * Multi-Tenant Mapping (Exclusive Tenancy).
     * Handles transitions between PERSONAL and ORGANIZATION workspaces.
     */
    async assignWorkspace(userId: string, workspaceId: string) {
        return prisma.$transaction(async (tx) => {
            const targetWs = await tx.workspace.findUnique({ where: { id: workspaceId } });
            if (!targetWs) throw new Error('Workspace nicht gefunden');

            const userToAssign = await tx.user.findUnique({ where: { id: userId } });
            if (userToAssign?.role === 'ADMIN' && targetWs.type === 'ORGANIZATION') {
                throw new Error('System-Admins können keinem Institut zugewiesen werden. Sie sind global.');
            }

            if (targetWs.type === 'PERSONAL') {
                // Return to Private: Clear all Organization memberships
                const membershipsToDelete = await tx.membership.findMany({
                    where: { userId, workspace: { type: 'ORGANIZATION' } },
                    select: { id: true }
                });
                if (membershipsToDelete.length > 0) {
                    await tx.membership.deleteMany({
                        where: { id: { in: membershipsToDelete.map((m: any) => m.id) } }
                    });
                }
            } else if (targetWs.type === 'ORGANIZATION') {
                // Into Organization: Clear OTHER Organization memberships
                const otherOrgMemberships = await tx.membership.findMany({
                    where: { 
                        userId,
                        workspace: { type: 'ORGANIZATION' },
                        workspaceId: { not: workspaceId }
                    },
                    select: { id: true }
                });
                if (otherOrgMemberships.length > 0) {
                    await tx.membership.deleteMany({
                        where: { id: { in: otherOrgMemberships.map((m: any) => m.id) } }
                    });
                }

                // Ensure targeted membership exists
                const existing = await tx.membership.findFirst({ where: { userId, workspaceId } });
                if (!existing) {
                    await tx.membership.create({ data: { userId, workspaceId, role: 'MEMBER' } });
                }
            }

            const targetMode = userToAssign?.appMode === 'PURE' ? 'PURE' : 'STANDARD';
            return tx.user.update({
                where: { id: userId },
                data: { activeWorkspaceId: workspaceId, appMode: targetMode }
            });
        });
    },

    /**
     * Updates membership role within a specific workspace.
     */
    async setMembershipRole(userId: string, workspaceId: string, role: string) {
        const membership = await prisma.membership.findFirst({
            where: { userId, workspaceId }
        });
        if (!membership) throw new Error('Mitgliedschaft nicht gefunden');

        return prisma.membership.update({
            where: { id: membership.id },
            data: { role }
        });
    },

    /**
     * Full User Destruction (Logto + DB).
     */
    async deleteUser(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('Nutzer nicht gefunden');

        if (user.logtoId) await deleteLogtoUser(user.logtoId);
        
        await prisma.membership.deleteMany({ where: { userId } });
        await prisma.privacyLog.deleteMany({ where: { userId } });
        return prisma.user.delete({ where: { id: userId } });
    },

    /**
     * Sets application mode (STANDARD / PURE).
     */
    async setMode(userId: string, mode: string) {
        return prisma.user.update({ where: { id: userId }, data: { appMode: mode } });
    },

    /**
     * Sets broad user role (USER / EXPERTE). 
     * ADMIN promotion is explicitly blocked in domain logic.
     */
    async setRole(userId: string, role: string) {
        const allowedRoles = ['USER', 'EXPERTE'];
        if (!allowedRoles.includes(role)) {
            throw new Error('Unzulässige Rollenzuweisung.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role === 'ADMIN') throw new Error('Admin-Rolle kann nicht geändert werden');
        
        return prisma.user.update({ where: { id: userId }, data: { role } });
    }
};
