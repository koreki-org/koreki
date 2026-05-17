import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../../../lib/prisma';
import { LocalGradingMemoryService } from '../../../../lib/services/local-profile-service';
import { withSecurity, AuthenticatedRequest } from '../../../../lib/security';
import { logger } from '../../../../lib/logger';
import { isLocalInstance } from '../../../../lib/env-context';

/**
 * On-the-Fly Grading Memory Appender
 * 🏮🛡️🏛️
 * Closes the feedback loop by allowing immediate few-shot calibration 
 * directly from the correction card assessment view.
 */

const appendCaseSchema = z.object({
    gradingMemoryId: z.string().min(1, 'ID des Erfahrungsschatzes ist erforderlich'),
    studentText: z.string().min(1, 'Schülerantwort ist erforderlich'),
    taskName: z.string().optional(),
    expectedCorrection: z.object({
        pointsObtained: z.number().min(0, 'Punkte dürfen nicht negativ sein'),
        maxPoints: z.number().optional(),
        correctionNotes: z.string().min(1, 'Korrekturbegründung ist erforderlich'),
        feedback: z.string().optional()
    })
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { claims } = req.user;
    const userId = claims?.sub;

    const validation = appendCaseSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ 
            message: validation.error.issues[0]?.message || 'Ungültige Daten' 
        });
    }

    const { gradingMemoryId, studentText, taskName, expectedCorrection } = validation.data;
    const newCaseId = `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCase = {
        id: newCaseId,
        studentText: studentText.trim(),
        taskName: taskName,
        expectedCorrection
    };

    // --- LOCAL INSTANCE PERSISTENCE (Desktop & Community Offline Mode) ---
    if (isLocalInstance()) {
        try {
            const memories = await LocalGradingMemoryService.getAvailableProfiles(userId);
            const memory = memories.find(m => m.id === gradingMemoryId);
            if (!memory) {
                return res.status(404).json({ message: 'Erfahrungsschatz nicht gefunden' });
            }

            const updatedCases = [...(memory.cases || []), newCase];
            const updatedMemory = await LocalGradingMemoryService.upsertProfile({
                ...memory,
                cases: updatedCases
            }, userId);

            return res.status(200).json({ success: true, memory: updatedMemory });
        } catch (err: any) {
            logger.error('[API:GradingMemories:Append:Local] Error', { message: err instanceof Error ? err.message : String(err) });
            return res.status(500).json({ message: 'Lokaler Fehler beim Anhängen des Falls.' });
        }
    }

    // --- SaaS DATABASE PERSISTENCE (VPS Cloud Mode) ---
    if (!userId) {
        return res.status(401).json({ message: 'Nicht authentifiziert.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { logtoId: userId } });
        if (!user) {
            return res.status(403).json({ message: 'Benutzerprofil nicht gefunden.' });
        }

        const dbUserId = user.id;

        const memory = await prisma.gradingMemory.findFirst({
            where: { id: gradingMemoryId, userId: dbUserId }
        });
        if (!memory) {
            return res.status(404).json({ message: 'Erfahrungsschatz nicht gefunden oder nicht autorisiert.' });
        }

        const currentCases = Array.isArray(memory.cases) ? (memory.cases as any[]) : [];
        const updatedCases = [...currentCases, newCase];

        const updatedMemory = await prisma.gradingMemory.update({
            where: { id: gradingMemoryId },
            data: {
                cases: updatedCases as any
            }
        });

        return res.status(200).json({ success: true, memory: updatedMemory });
    } catch (err: any) {
        logger.error('[API:GradingMemories:Append:SaaS] Error', { message: err instanceof Error ? err.message : String(err) });
        return res.status(500).json({ message: 'SaaS-Fehler beim Anhängen des Falls.' });
    }
});
