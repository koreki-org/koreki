import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { logtoClient } from '../../../lib/logto';
import { deleteLogtoUser } from '../../../lib/logto-mgmt';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const logtoId = requireUserId(req);

    try {
        // Find User
        const user = await prisma.user.findUnique({
            where: { logtoId: logtoId }
        });

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
        }

        // 1. Delete user from Logto first (Management API)
        const logtoResult = await deleteLogtoUser(logtoId);
        if (!logtoResult.success) {
            return res.status(500).json({
                message: `Fehler beim Löschen des Logto-Accounts: ${logtoResult.error || 'Bitte prüfen Sie die M2M-Konfiguration.'}`
            });
        }

        // 2. Delete Local User Data
        logger.info(`[Delete API] Deleting Prisma data for User ID: ${user.id}`);
        await prisma.privacyLog.deleteMany({ where: { userId: user.id } });
        logger.info(`[Delete API] PrivacyLogs deleted.`);

        const deletedPrismaUser = await prisma.user.delete({
            where: { id: user.id }
        });
        logger.info(`[Delete API] Prisma user deleted successfully: ${deletedPrismaUser.username}`);

        return res.status(200).json({ success: true, message: 'Konto und Identität erfolgreich gelöscht.' });
    } catch (error) {
        logger.error('Account Deletion Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ message: 'Interner Serverfehler beim Löschen des Kontos.' });
    }
});
