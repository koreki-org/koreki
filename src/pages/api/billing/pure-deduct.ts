import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { logtoClient } from '@/lib/logto';
import { checkAndDeductCredits } from '@/lib/billing';

import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const logtoId = requireUserId(req);
    const { pageCount, action, isScan } = req.body;
    
    let creditsToDeduct = 0;

    if (action === 'ocr') {
        creditsToDeduct = 0; // PURE mode OCR is free (uses own API key)
    } else if (action === 'correction') {
        creditsToDeduct = (pageCount || 1) * 1;
    } else {
        creditsToDeduct = 0;
    }

    try {
        // --- NEW CENTRALIZED BILLING ---
        await checkAndDeductCredits(logtoId, creditsToDeduct);
        
        logger.info(`[Pure Billing] Deducted ${creditsToDeduct} credits from active workspace of user ${logtoId} for ${action}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Pure billing error', { endpoint: req.url, message: toErrorMessage(error) });
        const message = toErrorMessage(error);
        return res.status(message.includes('Credits') ? 402 : 500).json({ error: message });
    }
});
