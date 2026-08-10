import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../../lib/prisma';
import { LocalGradingMemoryService } from '../../../lib/services/local-profile-service';
import { isSameName, nameTakenMessage, toProfileHttpError } from '../../../lib/services/profile-naming';
import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import { isLocalInstance } from '../../../lib/env-context';

/**
 * Grading Memories API Controller
 * 🏮🛡️🏛️
 * Manages custom pedagogical "Erfahrungsschätze" (Few-Shot examples)
 * Migrated to Pillar 8 Security Wrapper.
 * 
 * UPGRADE: Implemented dual local-first filesystem / SaaS database persistence.
 */

const memoryCaseSchema = z.object({
    id: z.string(),
    studentText: z.string().min(1, 'Schülertext ist erforderlich'),
    taskName: z.string().optional(),
    expectedCorrection: z.object({
        pointsObtained: z.number().min(0, 'Punkte dürfen nicht negativ sein'),
        maxPoints: z.number().optional(),
        correctionNotes: z.string().min(1, 'Korrekturbegründung ist erforderlich'),
        feedback: z.string().optional()
    })
});

const memorySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name ist erforderlich'),
    cases: z.array(memoryCaseSchema)
});

const deleteSchema = z.object({
    id: z.string().min(1, 'ID ist erforderlich'),
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { claims } = req.user;
    const userId = claims?.sub;

    // --- LOCAL INSTANCE BYPASS (Desktop & Community) ---
    if (isLocalInstance()) {
        try {
            if (req.method === 'GET') {
                const memories = await LocalGradingMemoryService.getAvailableProfiles(userId);
                return res.status(200).json(memories);
            }
            
            if (req.method === 'POST') {
                const validation = memorySchema.safeParse(req.body);
                if (!validation.success) {
                    return res.status(400).json({ 
                        message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                    });
                }
                const memory = await LocalGradingMemoryService.upsertProfile(validation.data as any, userId);
                return res.status(200).json(memory);
            }
            
            if (req.method === 'PATCH') {
                const renameSchema = z.object({
                    id: z.string().min(1),
                    newName: z.string().min(1),
                });
                const validation = renameSchema.safeParse(req.body);
                if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });
                
                await LocalGradingMemoryService.renameProfile(validation.data.id, validation.data.newName, userId);
                return res.status(200).json({ success: true });
            }
            
            if (req.method === 'DELETE') {
                const validation = deleteSchema.safeParse(req.query);
                if (!validation.success) return res.status(400).json({ message: 'ID ist erforderlich' });

                await LocalGradingMemoryService.deleteProfile(validation.data.id, userId);
                return res.status(200).json({ success: true });
            }

            return res.status(405).json({ message: 'Method not allowed' });
        } catch (err: any) {
            const { status, message } = toProfileHttpError(
                err,
                'Interner lokaler Fehler beim Verarbeiten des Erfahrungsschatzes',
                'Erfahrungsschatz'
            );
            if (status === 500) {
                logger.error('[API:GradingMemories:Local] Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
            }
            return res.status(status).json({ message });
        }
    }

    // --- SaaS DATABASE PERSISTENCE (VPS Mode) ---
    if (!userId) {
        return res.status(401).json({ message: 'Nicht authentifiziert.' });
    }

    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) {
        if (req.method === 'GET') return res.status(200).json([]);
        return res.status(403).json({ message: 'Benutzerprofil nicht gefunden.' });
    }

    const dbUserId = user.id;

    try {
        if (req.method === 'GET') {
            const memories = await prisma.gradingMemory.findMany({
                where: { userId: dbUserId },
                orderBy: { name: 'asc' }
            });
            return res.status(200).json(memories);
        }
        
        if (req.method === 'POST') {
            const validation = memorySchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ 
                    message: validation.error.issues[0]?.message || 'Ungültige Daten' 
                });
            }
            
            // 🏮 Mit Kennung ist der Datensatz eindeutig — so trifft ein
            // Speichern den bearbeiteten Erfahrungsschatz auch dann, wenn er
            // inzwischen umbenannt wurde. Der Name bleibt unangetastet;
            // Umbenennen laeuft ueber PATCH.
            if (validation.data.id) {
                const bestehend = await prisma.gradingMemory.findUnique({
                    where: { id: validation.data.id }
                });

                if (bestehend) {
                    if (bestehend.userId !== dbUserId) {
                        return res.status(403).json({ message: 'Nicht autorisiert.' });
                    }

                    const aktualisiert = await prisma.gradingMemory.update({
                        where: { id: validation.data.id },
                        data: { cases: validation.data.cases as any }
                    });
                    return res.status(200).json(aktualisiert);
                }
                // Unbekannte Kennung: Der Client legt einen lokal erzeugten
                // Erfahrungsschatz erstmals in der Datenbank ab — weiter unten
                // als Neuanlage behandelt.
            }

            // Neuanlage: Die Sperre der Datenbank vergleicht exakt, die
            // Rückfrage vor dem Überschreiben nach `isSameName`. Ohne diese
            // Auflösung entstünde bei abweichender Schreibweise eine zweite Zeile.
            const eigene = await prisma.gradingMemory.findMany({
                where: { userId: dbUserId },
                select: { name: true }
            });
            const zielName = eigene.find(m => isSameName(m.name, validation.data.name))?.name || validation.data.name;

            const memory = await prisma.gradingMemory.upsert({
                where: {
                    name_userId: {
                        name: zielName,
                        userId: dbUserId
                    }
                },
                update: {
                    cases: validation.data.cases as any,
                    userId: dbUserId
                },
                create: {
                    id: validation.data.id || undefined,
                    name: validation.data.name,
                    cases: validation.data.cases as any,
                    userId: dbUserId
                }
            });

            return res.status(200).json(memory);
        }
        
        if (req.method === 'PATCH') {
            const renameSchema = z.object({
                id: z.string().min(1),
                newName: z.string().min(1),
            });
            const validation = renameSchema.safeParse(req.body);
            if (!validation.success) return res.status(400).json({ message: 'Daten fehlen' });
            
            const existing = await prisma.gradingMemory.findUnique({ where: { id: validation.data.id } });
            if (!existing || existing.userId !== dbUserId) {
                return res.status(403).json({ message: 'Nicht autorisiert.' });
            }

            // Ohne diese Prüfung liefe das Umbenennen auf einen vergebenen Namen
            // in die Eindeutigkeits-Sperre der Datenbank und käme als
            // „Interner SaaS-Fehler" beim Nutzer an.
            const duplicate = await prisma.gradingMemory.findFirst({
                where: { name: validation.data.newName, userId: dbUserId }
            });
            if (duplicate && duplicate.id !== validation.data.id) {
                return res.status(409).json({ message: nameTakenMessage('Erfahrungsschatz') });
            }

            await prisma.gradingMemory.update({
                where: { id: validation.data.id },
                data: { name: validation.data.newName }
            });

            return res.status(200).json({ success: true });
        }
        
        if (req.method === 'DELETE') {
            const validation = deleteSchema.safeParse(req.query);
            if (!validation.success) return res.status(400).json({ message: 'ID ist erforderlich' });

            const existing = await prisma.gradingMemory.findUnique({ where: { id: validation.data.id } });
            if (!existing || existing.userId !== dbUserId) {
                return res.status(403).json({ message: 'Nicht autorisiert.' });
            }

            await prisma.gradingMemory.delete({
                where: { id: validation.data.id }
            });

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (err: any) {
        const { status, message } = toProfileHttpError(
            err,
            'Interner SaaS-Fehler beim Verarbeiten des Erfahrungsschatzes',
            'Erfahrungsschatz'
        );
        if (status === 500) {
            logger.error('[API:GradingMemories:SaaS] Error', { endpoint: req.url, message: err instanceof Error ? err.message : String(err) });
        }
        return res.status(status).json({ message });
    }
});
