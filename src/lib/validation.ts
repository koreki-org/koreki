import { z } from 'zod';

export const contactSchema = z.object({
    name: z.string().min(2, 'Name ist zu kurz'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    subject: z.string().min(3, 'Betreff ist zu kurz'),
    message: z.string().min(10, 'Nachricht ist zu kurz'),
});

export const CorrectionSchema = z.object({
    modelSolution: z.string().min(1, 'Musterlösung fehlt'),
    studentText: z.string().min(1, 'Schülertext fehlt').max(10000, 'Text zu lang'),
    settings: z.object({
        provider: z.string(),
        model: z.string().optional(),
        mistralKey: z.string().optional(),
        correctionPrompt: z.string().optional(),
        openaiUrl: z.string().optional(),
        openaiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        enableThinking: z.boolean().optional(),
        temperature: z.number().optional(),
        topP: z.number().optional(),
        maxTokens: z.number().optional(),
    }),
    tasksLayout: z.any().optional(),
    documentType: z.string().optional(),
    pageCount: z.number().min(1).optional(),
    expertProfileName: z.string().optional(),
    isComplex: z.boolean().optional(),
    gradingMemory: z.array(z.object({
        id: z.string(),
        studentText: z.string(),
        expectedCorrection: z.object({
            pointsObtained: z.number(),
            correctionNotes: z.string(),
            feedback: z.string().optional()
        })
    })).optional(),
});
