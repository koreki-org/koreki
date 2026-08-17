import type { NextApiResponse } from 'next';
import { logtoClient } from '../../lib/logto';
import { getSystemAiStatus } from '../../lib/billing';
import { logger } from '../../lib/logger';

import { withSecurity, AuthenticatedRequest } from '../../lib/security';
import { toErrorMessage } from '../../lib/error-message';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    try {
        const status = await getSystemAiStatus();
        
        // Cache for 60 seconds to reduce server load and mitigate race conditions
        res.setHeader('Cache-Control', 'private, max-age=60');
        
        return res.status(200).json(status);
    } catch (error) {
        logger.error('AI Status Error', { endpoint: req.url, message: toErrorMessage(error) });
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}, { allowAnonymous: true });
