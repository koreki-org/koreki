import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

/**
 * Privacy Log API
 * 👥🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 *
 * Der PrivacyLog ist ein Nachweisdokument (Saeule 2 / Saeule 6). Ungeprueft
 * uebernommene Felder machen ihn wertlos: ein Nutzer koennte beliebige
 * Eintraege auf seinen Namen erzeugen — etwa gefaelschte Sicherheitsereignisse —
 * oder unbegrenzt Fremdtext einschleusen. Erlaubt sind daher nur die Aktionen,
 * die der Client tatsaechlich bestaetigt (siehe useBatchStatus.ts).
 */
const privacyLogSchema = z.object({
    action: z.enum(['OCR Start', 'Correction Batch Start']),
    confirmedText: z.string().min(1, 'Bestätigungstext fehlt').max(200, 'Bestätigungstext zu lang')
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const validation = privacyLogSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { action, confirmedText } = validation.data;

        const { claims } = req.user;
        const logtoId = claims.sub;

        const user = await prisma.user.findUnique({ where: { logtoId } });
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        }

        await prisma.privacyLog.create({
            data: {
                userId: user.id,
                action,
                confirmedText,
                ip: req.ip
            }
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        logger.error('Privacy Log Error', { endpoint: req.url, message: error.message || String(error) });
        return res.status(500).json({ error: 'Interner Serverfehler beim Loggen der Einwilligung.' });
    }
});
