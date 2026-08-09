import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { PromptProfileService } from '../../../lib/services/prompt-profile-service';
import { LocalProfileService } from '../../../lib/services/local-profile-service';
import { toProfileHttpError } from '../../../lib/services/profile-naming';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';

/**
 * Prompt Profiles API Controller (Stage 17)
 * 🏮🛡️🏛️
 * Migrated to Pillar 8 Security Wrapper.
 * 
 * UPGRADE STAGE 18: Added Stateless File-Persistence for Community/Desktop.
 */

const profileSchema = z.object({
    name: z.string().min(1, 'Name ist erforderlich'),
    correctionPrompt: z.string().min(1, 'Prompt ist erforderlich'),
});

const deleteSchema = z.object({
    id: z.string().min(1, 'ID ist erforderlich'),
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // --- INDUSTRIAL LOCAL BYPASS ---
    if (isLocalInstance()) {
        const { claims } = req.user;
        const userId = claims?.sub;

        try {
            if (req.method === 'GET') {
                const profiles = await LocalProfileService.getAvailableProfiles(userId);
                return res.status(200).json(profiles);
            }
            if (req.method === 'POST') {
                const validation = profileSchema.safeParse(req.body);
                if (!validation.success) {
                    return res.status(400).json({ 
                        message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                    });
                }
                const profile = await LocalProfileService.upsertProfile(validation.data, userId);
                return res.status(200).json(profile);
            }
            if (req.method === 'PATCH') {
                const renameSchema = z.object({
                    id: z.string().min(1),
                    newName: z.string().min(1),
                });
                const validation = renameSchema.safeParse(req.body);
                if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });
                
                await LocalProfileService.renameProfile(validation.data.id, validation.data.newName, userId);
                return res.status(200).json({ success: true });
            }
            if (req.method === 'DELETE') {
                await LocalProfileService.deleteProfile(req.query.id as string, userId);
                return res.status(200).json({ success: true });
            }
        } catch (err) {
            const { status, message } = toProfileHttpError(err, 'Lokaler Fehler beim Verarbeiten der Profile');
            if (status === 500) {
                logger.error('[API:PromptProfiles] Local error', {
                    endpoint: req.url,
                    message: err instanceof Error ? err.message : String(err)
                });
            }
            return res.status(status).json({ message });
        }
    }

    const { claims } = req.user;
    const logtoId = claims?.sub;

    // Fetch local user to verify role and get internal ID
    const user = logtoId ? await prisma.user.findUnique({ where: { logtoId } }) : null;
    
    if (!user) {
        // If it's a GET request and the user isn't synced yet, return empty list gracefully
        if (req.method === 'GET') return res.status(200).json([]);
        return res.status(403).json({ message: 'Benutzerprofil nicht gefunden' });
    }

    const dbUserId = user.id;
    const userRole = user.role;

    try {
        if (req.method === 'GET') {
            // First, sync defaults (Industrial Grade: Auto-provisioning subjects)
            await PromptProfileService.syncSystemProfiles();
            
            // Then, fetch all accessible profiles
            const profiles = await PromptProfileService.getAvailableProfiles(dbUserId);
            return res.status(200).json(profiles);
        }

        if (req.method === 'POST') {
            const validation = profileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                });
            }

            const profile = await PromptProfileService.upsertProfile(dbUserId, validation.data, userRole);
            return res.status(200).json(profile);
        }

        if (req.method === 'PATCH') {
            const renameSchema = z.object({
                id: z.string().min(1, 'ID erforderlich'),
                newName: z.string().min(1, 'Name erforderlich'),
            });
            const validation = renameSchema.safeParse(req.body);
            if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });

            await PromptProfileService.renameProfile(dbUserId, validation.data.id, validation.data.newName);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const validation = deleteSchema.safeParse(req.query);
            if (!validation.success) return res.status(400).json({ message: 'ID erforderlich' });

            await PromptProfileService.deleteProfile(dbUserId, validation.data.id, userRole);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ message: 'Method not allowed' });
        
    } catch (err: any) {
        logger.error('[API:PromptProfiles] Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
        const status = err.message.includes('autorisiert') || err.message.includes('System-Profile') ? 403 : 500;
        return res.status(status).json({ message: err.message || 'Interner Serverfehler' });
    }
});
