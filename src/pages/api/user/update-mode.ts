import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { toErrorMessage } from '../../../lib/error-message';

/**
 * Update User Mode API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const logtoId = requireUserId(req);

    const { mode, agreement } = req.body;
    if (mode !== 'STANDARD' && mode !== 'PURE' && mode !== 'TRIAL') {
        return res.status(400).json({ error: 'Invalid mode' });
    }

    try {
        const updateData: any = { appMode: mode };

        const user = await prisma.user.update({
            where: { logtoId: logtoId } as any,
            data: updateData
        });

        // 📝 REVISION-SAFE AUDIT LOG: Instead of a redundant DB flag, we log the event.
        if (mode === 'TRIAL' && agreement === true) {
            await prisma.privacyLog.create({
                data: {
                    userId: user.id,
                    action: 'TRIAL_MODE_STARTED',
                    confirmedText: `User confirmed TRIAL mode agreement: No PII student data will be processed.`,
                    ip: req.ip
                }
            });
        }

        return res.status(200).json({ success: true, mode: user.appMode, user });
    } catch (error) {
        logger.error('Update mode error', { endpoint: req.url, message: toErrorMessage(error) });
        return res.status(500).json({ error: 'Internal server error' });
    }
});
