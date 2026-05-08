import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';
import { LocalAiProfileService } from '../../../lib/services/local-profile-service';

/**
 * AI Profiles API Controller (Stage 18)
 * Handles SaaS and Multi-User DB-based persistence of custom AI parameter configurations.
 */

const aiProfileSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name ist erforderlich'),
    temperature: z.number().default(0.7),
    topP: z.number().default(0.8),
    maxTokens: z.number().default(32768),
    presencePenalty: z.number().default(0.0),
    enableThinking: z.boolean().default(false),
    visionTemperature: z.number().default(0.2),
    visionTopP: z.number().default(0.8),
    visionMaxTokens: z.number().default(4000),
    visionPresencePenalty: z.number().default(0.0),
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // --- LOCAL INSTANCE BYPASS (Desktop & Community Single-User use file-based LocalAiProfileService) ---
    if (isLocalInstance()) {
        const { claims } = req.user;
        const userId = claims?.sub;

        try {
            if (req.method === 'GET') {
                const profiles = await LocalAiProfileService.getAvailableProfiles(userId);
                return res.status(200).json(profiles);
            }
            if (req.method === 'POST') {
                const validation = aiProfileSchema.safeParse(req.body);
                if (!validation.success) {
                    return res.status(400).json({ 
                        message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                    });
                }
                const profile = await LocalAiProfileService.upsertProfile(validation.data, userId);
                return res.status(200).json(profile);
            }
            if (req.method === 'PATCH') {
                const { id, newName } = req.body;
                if (!id || !newName) return res.status(400).json({ message: 'ID und Name erforderlich' });
                
                await LocalAiProfileService.renameProfile(id, newName, userId);
                return res.status(200).json({ success: true });
            }
            if (req.method === 'DELETE') {
                const profileId = req.query.id as string;
                if (!profileId) return res.status(400).json({ message: 'ID erforderlich' });
                
                await LocalAiProfileService.deleteProfile(profileId, userId);
                return res.status(200).json({ success: true });
            }
            return res.status(405).json({ message: 'Method not allowed' });
        } catch (err) {
            return res.status(500).json({ message: 'Lokaler Fehler beim Verarbeiten der Profile' });
        }
    }

    const { claims } = req.user;
    const logtoId = claims?.sub;

    const user = logtoId ? await prisma.user.findUnique({ where: { logtoId } }) : null;
    if (!user) {
        if (req.method === 'GET') return res.status(200).json([]);
        return res.status(403).json({ message: 'Benutzerprofil nicht gefunden' });
    }

    const dbUserId = user.id;

    try {
        if (req.method === 'GET') {
            const profiles = await prisma.aiProfile.findMany({
                where: { userId: dbUserId },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json(profiles);
        }

        if (req.method === 'POST') {
            const validation = aiProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                });
            }

            const { id, ...data } = validation.data;

            let profile;
            if (id) {
                // Verify ownership
                const existing = await prisma.aiProfile.findUnique({ where: { id } });
                if (!existing || existing.userId !== dbUserId) {
                    return res.status(403).json({ message: 'Nicht autorisiert' });
                }
                profile = await prisma.aiProfile.update({
                    where: { id },
                    data
                });
            } else {
                profile = await prisma.aiProfile.create({
                    data: {
                        ...data,
                        userId: dbUserId
                    }
                });
            }
            return res.status(200).json(profile);
        }

        if (req.method === 'PATCH') {
            const { id, newName } = req.body;
            if (!id || !newName) return res.status(400).json({ message: 'ID und Name erforderlich' });

            const existing = await prisma.aiProfile.findUnique({ where: { id } });
            if (!existing || existing.userId !== dbUserId) {
                return res.status(403).json({ message: 'Nicht autorisiert' });
            }

            const updated = await prisma.aiProfile.update({
                where: { id },
                data: { name: newName }
            });
            return res.status(200).json(updated);
        }

        if (req.method === 'DELETE') {
            const profileId = req.query.id as string;
            if (!profileId) return res.status(400).json({ message: 'ID erforderlich' });

            const existing = await prisma.aiProfile.findUnique({ where: { id: profileId } });
            if (!existing || existing.userId !== dbUserId) {
                return res.status(403).json({ message: 'Nicht autorisiert' });
            }

            await prisma.aiProfile.delete({ where: { id: profileId } });
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (err: any) {
        logger.error('[API:AiProfiles] Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
        return res.status(500).json({ message: err.message || 'Interner Serverfehler' });
    }
});
