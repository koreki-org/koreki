import type { NextApiResponse } from 'next';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';
import { GlobalSettingsService } from '@/lib/services/global-settings-service';
import { isLocalInstance } from '@/lib/env-context';
import { toErrorMessage } from '@/lib/error-message';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Only accessible in local instance modes (Community/Desktop)
    if (!isLocalInstance()) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const { claims } = req.user;
    // Rollen stammen aus dem verifizierten Keycloak-Token (Community Multi-User)
    // bzw. aus dem lokalen Trust-Modell (Desktop / Community Single-User).
    const roles = (claims?.roles as string[] | undefined) ?? [];
    const isAdmin = roles.includes('ADMIN');

    if (!isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    if (req.method === 'GET') {
        try {
            const settings = await GlobalSettingsService.getSettings();
            return res.status(200).json(settings);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch global settings' });
        }
    }

    if (req.method === 'POST') {
        try {
            // We only save AI Provider specific routing data globally.
            // DO NOT save sensitive keys (mistralKey, openaiKey) here!
            const {
                provider,
                ollamaUrl,
                ollamaModel,
                customOllamaModel,
                ollamaNumCtx,
                openaiUrl,
                openaiModel,
                temperature,
                topP,
                maxTokens,
                presencePenalty,
                enableThinking
            } = req.body;

            const safeSettings = {
                provider,
                ollamaUrl,
                ollamaModel,
                customOllamaModel,
                ollamaNumCtx,
                openaiUrl,
                openaiModel,
                temperature,
                topP,
                maxTokens,
                presencePenalty,
                enableThinking
            };

            // Remove undefined fields
            Object.keys(safeSettings).forEach(key => {
                if (safeSettings[key as keyof typeof safeSettings] === undefined) {
                    delete safeSettings[key as keyof typeof safeSettings];
                }
            });

            const updated = await GlobalSettingsService.updateSettings(safeSettings);
            return res.status(200).json({ success: true, settings: updated });
        } catch (error) {
            logger.error('Admin Global AI Settings Save Error', { endpoint: req.url, message: toErrorMessage(error) });
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    return res.status(405).send('Method Not Allowed');
});
