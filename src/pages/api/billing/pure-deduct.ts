import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { logtoClient } from '@/lib/logto';
import { checkAndDeductCredits } from '@/lib/billing';

import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { claims } = req.user;
    const logtoId = claims.sub;
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
    } catch (error: any) {
        logger.error('Pure billing error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(error.message?.includes('Credits') ? 402 : 500).json({ error: error.message });
    }
});
