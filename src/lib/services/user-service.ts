import prisma from '../prisma';
import { getLogtoUserRoles, checkLogtoUserExists, getLogtoUserProfile } from '../logto-mgmt';
import { logger } from '../logger';

/**
 * User Service (Industrial Identity Layer)
 * 👥🛡️🏛️
 * Implements Just-In-Time (JIT) Provisioning and Profile Synchronization.
 */
export class UserService {
    /**
     * Ensures a user exists in the local database and is synchronized with Logto.
     * Uses atomic transactions and upsert logic to prevent race conditions.
     */
    static async ensureUserExists(logtoId: string, claims: any) {
        if (!logtoId) throw new Error('Logto ID matches null/undefined.');

        let username = claims.username || claims.preferred_username || claims.name || claims.email;
        
        // --- INDUSTRIAL FALLBACK: Use M2M if claims are insufficient ---
        if (!username || username === 'Unbekannt') {
            const mgmtProfile = await getLogtoUserProfile(logtoId);
            if (mgmtProfile) {
                username = mgmtProfile.username || mgmtProfile.primaryEmail || mgmtProfile.name || mgmtProfile.email;
            }
        }

        // Final Fallback
        if (!username) username = 'Unbekannt';

        // 1. Double-Check Existence (Lightweight)
        let user = await prisma.user.findUnique({
            where: { logtoId },
            include: { memberships: { include: { workspace: true } } }
        });

        // 2. Synchronize Existing User
        if (user) {
            return await this.syncExistingUser(user, claims, username);
        }

        // 3. JIT PROVISIONING (The "Birth" of a user)
        return await this.provisionNewUser(logtoId, claims, username);
    }

    private static async syncExistingUser(user: any, claims: any, logtoUsername: string) {
        let needsUpdate = false;
        const updateData: any = {};

        // Sync Roles (M2M authoritative)
        let logtoRoles = (claims as any).roles || [];
        const m2mRoles = await getLogtoUserRoles(user.logtoId);
        if (m2mRoles.length > 0) logtoRoles = m2mRoles;

        const adminRole = process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME || 'Admin';
        const isExplicitAdmin = logtoRoles.includes(adminRole) || 
                               logtoRoles.includes('koreki-admin') ||
                               logtoRoles.includes('System_Admin') || 
                               logtoRoles.includes('Super_Admin');
        
        if (isExplicitAdmin && user.role !== 'ADMIN') {
            updateData.role = 'ADMIN';
            needsUpdate = true;
        }

        if (logtoUsername && user.username !== logtoUsername) {
            updateData.username = logtoUsername;
            needsUpdate = true;
        }

        if (needsUpdate) {
            logger.info('JIT_SYNC: Updating user profile', { logtoId: user.logtoId, updateData });
            return await prisma.user.update({
                where: { id: user.id },
                data: updateData,
                include: { memberships: { include: { workspace: true } } }
            });
        }

        return user;
    }

    private static async provisionNewUser(logtoId: string, claims: any, username: string) {
        logger.info('JIT_PROVISIONING: Creating new user', { logtoId, username });

        // Safety check: Does the user really exist in Logto?
        const existsInLogto = await checkLogtoUserExists(logtoId);
        if (!existsInLogto) throw new Error('User does not exist in Identity Provider.');

        // Role Resolution for New User
        // Role Resolution for New User
        let registrationRoles = (claims as any).roles || [];
        const m2mRegistrationRoles = await getLogtoUserRoles(logtoId);
        if (m2mRegistrationRoles.length > 0) registrationRoles = m2mRegistrationRoles;

        const adminRole = process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME || 'Admin';
        const isExplicitAdmin = registrationRoles.includes(adminRole) || 
                               registrationRoles.includes('koreki-admin') ||
                               registrationRoles.includes('System_Admin') || 
                               registrationRoles.includes('Super_Admin');

        try {
            return await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        logtoId,
                        username,
                        role: isExplicitAdmin ? 'ADMIN' : 'USER',
                        appMode: 'UNSET'
                    }
                });

                const personalWorkspace = await tx.workspace.create({
                    data: {
                        name: `Privat (${username})`,
                        type: 'PERSONAL',
                        credits: 20
                    }
                });

                await tx.membership.create({
                    data: {
                        userId: newUser.id,
                        workspaceId: personalWorkspace.id,
                        role: 'OWNER'
                    }
                });

                return await tx.user.findUnique({
                    where: { id: newUser.id },
                    include: { memberships: { include: { workspace: true } } }
                });
            });
        } catch (error: any) {
            // Handle Race Condition (P2002: Unique constraint failed on logtoId)
            if (error.code === 'P2002') {
                return await prisma.user.findUnique({
                    where: { logtoId },
                    include: { memberships: { include: { workspace: true } } }
                });
            }
            throw error;
        }
    }
}
