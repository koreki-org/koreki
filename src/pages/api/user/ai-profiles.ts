import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';
import { LocalAiProfileService } from '../../../lib/services/local-profile-service';
import { isSameName, nameTakenMessage, toProfileHttpError } from '../../../lib/services/profile-naming';
import { toErrorMessage } from '../../../lib/error-message';

/**
 * AI Profiles API Controller (Stage 18)
 * Handles SaaS and Multi-User DB-based persistence of custom AI parameter configurations.
 */

const aiProfileSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name ist erforderlich'),
    temperature: z.number().default(0.2),
    topP: z.number().default(0.8),
    maxTokens: z.number().default(32768),
    presencePenalty: z.number().default(0.0),
    enableThinking: z.boolean().default(true),
    visionTemperature: z.number().default(0.0),
    visionTopP: z.number().default(0.8),
    visionMaxTokens: z.number().default(4000),
    visionPresencePenalty: z.number().default(0.0),
    ollamaNumCtx: z.number().optional(),
});

/**
 * Umbenennen. Die drei Geschwister-Familien (Expertise, Skills,
 * Erfahrungsschatz) hatten dieses Schema laengst — nur die KI-Profile lasen
 * `req.body` roh und prueften bloss auf "nicht leer". Damit bestimmte der
 * Client auch den TYP: ein Objekt statt einer Zeichenkette lief bis in die
 * Datenbank-Abfrage und kam als 500 zurueck statt als 400 (19.08.2026).
 */
const renameSchema = z.object({
    id: z.string().min(1),
    newName: z.string().min(1)
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
                const validation = renameSchema.safeParse(req.body);
                if (!validation.success) return res.status(400).json({ message: 'ID und Name erforderlich' });
                const { id, newName } = validation.data;
                
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
            const { status, message } = toProfileHttpError(err, 'Lokaler Fehler beim Verarbeiten der Profile');
            if (status === 500) {
                logger.error('[API:AiProfiles] Local error', {
                    endpoint: req.url,
                    message: toErrorMessage(err)
                });
            }
            return res.status(status).json({ message });
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

            const { id, ollamaNumCtx, ...data } = validation.data;

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
            const validation = renameSchema.safeParse(req.body);
            if (!validation.success) return res.status(400).json({ message: 'ID und Name erforderlich' });
            const { id, newName } = validation.data;

            const existing = await prisma.aiProfile.findUnique({ where: { id } });
            if (!existing || existing.userId !== dbUserId) {
                return res.status(403).json({ message: 'Nicht autorisiert' });
            }

            // Ohne diese Prüfung liefe das Umbenennen auf einen vergebenen Namen
            // in die Eindeutigkeits-Sperre der Datenbank und käme als
            // „Interner Serverfehler" beim Nutzer an.
            const eigene = await prisma.aiProfile.findMany({
                where: { userId: dbUserId },
                select: { id: true, name: true }
            });
            if (eigene.some(p => p.id !== id && isSameName(p.name, newName))) {
                return res.status(409).json({ message: nameTakenMessage('KI-Profil') });
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
    } catch (err) {
        const { status, message } = toProfileHttpError(err, 'Interner Serverfehler', 'KI-Profil');
        if (status === 500) {
            logger.error('[API:AiProfiles] Error', { endpoint: req.url, message: toErrorMessage(err) });
        }
        return res.status(status).json({ message });
    }
});
