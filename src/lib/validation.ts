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
        activeSkillIds: z.array(z.string()).optional(),
        customSkills: z.record(z.string(), z.any()).optional(),
        ollamaUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        ollamaNumCtx: z.number().optional()
    }).passthrough(),
    tasksLayout: z.any().optional(),
    documentType: z.string().optional(),
    pageCount: z.number().min(1).optional(),
    expertProfileName: z.string().optional(),
    isComplex: z.boolean().optional(),
    gradingMemory: z.array(z.object({
        id: z.string(),
        studentText: z.string(),
        taskName: z.string().optional(),
        expectedCorrection: z.object({
            pointsObtained: z.number(),
            maxPoints: z.number().optional(),
            correctionNotes: z.string(),
            feedback: z.string().optional()
        })
    })).optional(),
});

export const secondOpinionRequestSchema = z.object({
    taskName: z.string().min(1, 'Aufgabenname fehlt'),
    taskInstructions: z.string().optional(),
    sampleSolution: z.string().optional(),
    maxPoints: z.number().nonnegative(),
    studentText: z.string().min(1, 'Schülertext fehlt'),
    currentPoints: z.number(),
    currentFeedback: z.string(),
    teacherDoubt: z.string().optional(),
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    })).optional()
});

export function toSafeString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(toSafeString).join('\n\n');
    if (value == null) return '';
    return String(value);
}

export const AIAnalysisResultSchema = z.object({
    overallFeedback: z.preprocess(toSafeString, z.string()).optional(),
    overallMatchPercentage: z.preprocess((val) => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, z.number().optional()),
    confidence: z.preprocess((val) => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, z.number().optional()),
    expertProfile: z.preprocess(toSafeString, z.string()).optional(),
    tasks: z.preprocess((val) => {
        if (Array.isArray(val)) return val;
        return undefined;
    }, z.array(
        z.object({
            name: z.preprocess(toSafeString, z.string()),
            pointsObtained: z.preprocess((val) => {
                const num = Number(val || 0);
                return isNaN(num) ? 0 : num;
            }, z.number()),
            maxPoints: z.preprocess((val) => {
                if (val === undefined || val === null) return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : num;
            }, z.number().optional()),
            feedback: z.preprocess(toSafeString, z.string()).optional(),
            confidence: z.preprocess((val) => {
                if (val === undefined || val === null) return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : num;
            }, z.number().optional()),
            content: z.preprocess(toSafeString, z.string()).optional(),
            // Punktzahl je Bewertungskriterium — strukturiert statt aus den correctionNotes geparst.
            // Unlesbare Einzelwertungen werden VERWORFEN, nicht auf 0 abgebildet.
            //
            // GEFUNDEN BEIM LESEN, 18.08.2026: Hier stand `isNaN(num) ? 0 : num`.
            // Damit wurde aus "das Modell hat etwas Unlesbares geschickt" ein
            // "das Modell vergibt 0 Punkte" — ununterscheidbar. Die
            // Rueckfallebene in `correction-mapping.ts`, die genau dafuer gebaut
            // ist (Gesamtpunktzahl des Modells heranziehen, statt sein Urteil zu
            // verwerfen), konnte deshalb fuer den strukturierten Kanal NIE
            // greifen: Sie erkennt Unlesbares daran, dass kein Wert vorliegt.
            // Nachgestellt: eine Aufgabe mit einem Kriterium ueber 3 Punkte
            // endete bei `points: "drei"` mit 0 von 3 Punkten.
            //
            // Ein verworfener Eintrag ist dasselbe wie ein nicht gelieferter —
            // und genau das ist die Wahrheit ueber ihn.
            criteriaScores: z.preprocess(
                (val) => {
                    if (!Array.isArray(val)) return undefined;
                    return val.filter(e => {
                        if (!e || typeof e !== 'object') return false;
                        const num = Number((e as { points?: unknown }).points);
                        return Number.isFinite(num);
                    });
                },
                z.array(
                    z.object({
                        id: z.preprocess(toSafeString, z.string()),
                        points: z.preprocess((val) => Number(val), z.number())
                    }).passthrough()
                ).optional()
            ),
        }).passthrough()
    ).optional()),
}).passthrough();


