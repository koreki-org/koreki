import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { z } from 'zod';
import { SkillProfileService } from '../../../lib/services/skill-profile-service';
import { LocalSkillProfileService } from '../../../lib/services/local-profile-service';
import { toProfileHttpError } from '../../../lib/services/profile-naming';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';
import { toErrorMessage } from '../../../lib/error-message';

/**
 * Skill Profiles API Controller
 * 🏮🛡️🏛️
 * Symmetrical to prompt-profiles.ts. Respects single-user local bypass
 * and full RBAC / Tenant isolation in VPS SaaS mode.
 */

const skillProfileSchema = z.object({
    /**
     * Kennung des zu aktualisierenden Sets. Fehlt sie, ist ein Neuanlegen
     * gemeint — dann entscheidet der Name, ob ein bestehendes Set ueberschrieben
     * wird (der Client fragt vorher).
     */
    id: z.string().optional(),
    name: z.string().min(1, 'Name ist erforderlich'),
    activeSkillIds: z.array(z.string()).default([]),
    customSkills: z.record(z.string(), z.any()).optional(),
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
                const profiles = await LocalSkillProfileService.getAvailableProfiles(userId);
                return res.status(200).json(profiles);
            }
            if (req.method === 'POST') {
                const validation = skillProfileSchema.safeParse(req.body);
                if (!validation.success) {
                    return res.status(400).json({ 
                        message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                    });
                }
                const profile = await LocalSkillProfileService.upsertProfile(validation.data, userId);
                return res.status(200).json(profile);
            }
            if (req.method === 'PATCH') {
                const renameSchema = z.object({
                    id: z.string().min(1),
                    newName: z.string().min(1),
                });
                const validation = renameSchema.safeParse(req.body);
                if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });
                
                await LocalSkillProfileService.renameProfile(validation.data.id, validation.data.newName, userId);
                return res.status(200).json({ success: true });
            }
            if (req.method === 'DELETE') {
            // Die ID pruefen, bevor sie in den Dienst geht. Ohne das filtert
            // `deleteProfile` auf `x.id !== undefined`, loescht also NICHTS und
            // meldet trotzdem `200 success` — die Oberflaeche entfernt den
            // Eintrag, und beim naechsten Laden ist er wieder da. Die drei
            // Geschwister-Familien pruefen hier laengst (19.08.2026).
                const validation = deleteSchema.safeParse(req.query);
                if (!validation.success) return res.status(400).json({ message: 'ID erforderlich' });

                await LocalSkillProfileService.deleteProfile(validation.data.id, userId);
                return res.status(200).json({ success: true });
            }

            // Ohne dieses `return` faellt eine andere Methode aus dem lokalen
            // Zweig heraus und laeuft in den SaaS-Pfad — der greift auf die
            // Datenbank zu, die es auf dem Desktop gar nicht gibt.
            return res.status(405).json({ message: 'Method not allowed' });
        } catch (err) {
            const { status, message } = toProfileHttpError(err, 'Lokaler Fehler beim Verarbeiten der Skill-Profile');
            if (status === 500) {
                logger.error('[API:SkillProfiles] Local error', {
                    endpoint: req.url,
                    message: toErrorMessage(err)
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
        if (req.method === 'GET') return res.status(200).json([]);
        return res.status(403).json({ message: 'Benutzerprofil nicht gefunden' });
    }

    const dbUserId = user.id;
    const userRole = user.role;

    try {
        if (req.method === 'GET') {
            // First, sync defaults (Industrial Grade: Auto-provisioning subjects)
            await SkillProfileService.syncSystemProfiles();
            
            // Then, fetch all accessible profiles
            const profiles = await SkillProfileService.getAvailableProfiles(dbUserId);
            return res.status(200).json(profiles);
        }

        if (req.method === 'POST') {
            const validation = skillProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                });
            }

            const profile = await SkillProfileService.upsertProfile(dbUserId, validation.data, userRole);
            return res.status(200).json(profile);
        }

        if (req.method === 'PATCH') {
            const renameSchema = z.object({
                id: z.string().min(1, 'ID erforderlich'),
                newName: z.string().min(1, 'Name erforderlich'),
            });
            const validation = renameSchema.safeParse(req.body);
            if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });

            await SkillProfileService.renameProfile(dbUserId, validation.data.id, validation.data.newName);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const validation = deleteSchema.safeParse(req.query);
            if (!validation.success) return res.status(400).json({ message: 'ID erforderlich' });

            await SkillProfileService.deleteProfile(dbUserId, validation.data.id, userRole);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ message: 'Method not allowed' });
        
    } catch (err) {
        logger.error('[API:SkillProfiles] Error', { endpoint: req.url, message: toErrorMessage(err) });
        const message = toErrorMessage(err, 'Interner Serverfehler');
        const status = message.includes('autorisiert') || message.includes('System-Skill-Profile') ? 403 : 500;
        return res.status(status).json({ message });
    }
});
