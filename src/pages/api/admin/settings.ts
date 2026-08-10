import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { logger } from '@/lib/logger';

const settingsSchema = z.object({
    ocrCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    ocrInputCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    ocrOutputCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    correctionCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    correctionInputCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    correctionOutputCostPerMillion: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    ocrBudget: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    correctionBudget: z.union([z.number(), z.string()]).transform(v => typeof v === 'string' ? parseFloat(v) : v).optional(),
    correctionPrompt: z.string().optional(),
});


export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const logtoId = requireUserId(req);

    // Fetch local user to verify role
    const user = await prisma.user.findUnique({ where: { logtoId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EXPERTE')) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    if (req.method === 'GET') {
        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Zugriff verweigert: Nur Admins dürfen Einstellungen einsehen.' });
        }
        try {
            const settings = await prisma.systemSettings.findUnique({
                where: { id: 'singleton' }
            });
            return res.status(200).json(settings || {});
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const validation = settingsSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Ungültige Einstellungen', details: validation.error.issues });
    }

    const { ocrCostPerMillion, correctionCostPerMillion, ocrBudget, correctionBudget, correctionPrompt } = validation.data;

    // Safety: EXPERTS can ONLY change prompts, not financial/technical settings
    if (user.role === 'EXPERTE') {
        try {
            await prisma.systemSettings.upsert({
                where: { id: 'singleton' },
                update: {
                    correctionPrompt: correctionPrompt,
                },
                create: {
                    id: 'singleton',
                    correctionPrompt: correctionPrompt,
                    lastResetMonth: new Date().getMonth() + 1,
                    lastResetYear: new Date().getFullYear()
                }
            });
            return res.status(200).json({ success: true, message: 'Prompts updated as Expert' });
        } catch (error) {
            return res.status(500).json({ error: 'Expert update failed' });
        }
    }

    // Admin logic (Full Access)
    const ocrPrice = ocrCostPerMillion;
    const correctionPrice = correctionCostPerMillion;
    const ocrB = ocrBudget;
    const correctionB = correctionBudget;

    try {
        await prisma.systemSettings.upsert({
            where: { id: 'singleton' },
            update: {
                ocrPricePerMillion: validation.data.ocrCostPerMillion,
                ocrInputPricePerMillion: validation.data.ocrInputCostPerMillion,
                ocrOutputPricePerMillion: validation.data.ocrOutputCostPerMillion,
                correctionPricePerMillion: validation.data.correctionCostPerMillion,
                correctionInputPricePerMillion: validation.data.correctionInputCostPerMillion,
                correctionOutputPricePerMillion: validation.data.correctionOutputCostPerMillion,
                ocrBudget: validation.data.ocrBudget,
                correctionBudget: validation.data.correctionBudget,
                correctionPrompt: validation.data.correctionPrompt,
            },
            create: {
                id: 'singleton',
                ocrPricePerMillion: validation.data.ocrCostPerMillion || 0,
                ocrInputPricePerMillion: validation.data.ocrInputCostPerMillion || 0,
                ocrOutputPricePerMillion: validation.data.ocrOutputCostPerMillion || 0,
                correctionPricePerMillion: validation.data.correctionCostPerMillion || 0,
                correctionInputPricePerMillion: validation.data.correctionInputCostPerMillion || 0,
                correctionOutputPricePerMillion: validation.data.correctionOutputCostPerMillion || 0,
                ocrBudget: validation.data.ocrBudget || 0,
                correctionBudget: validation.data.correctionBudget || 0,
                correctionPrompt: validation.data.correctionPrompt || '',
                lastResetMonth: new Date().getMonth() + 1,
                lastResetYear: new Date().getFullYear()
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {

        logger.error('Admin Settings Save Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
