import type { NextApiResponse } from 'next';
import { extractStudentAST } from '@/lib/grading/calc-trace-extraction';
import { logger } from '@/lib/logger';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { z } from 'zod';

const CalcTraceStepSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['given', 'calc']),
    value: z.number(),
    formula: z.string().nullable().optional(),
    tolerance: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    points: z.number().nullable().optional()
});

const CalcTraceSchema = z.object({
    taskId: z.string(),
    steps: z.array(CalcTraceStepSchema)
});

const CalcTraceExtractionSchema = z.object({
    studentText: z.string().min(1, 'Schülertext darf nicht leer sein.'),
    trace: CalcTraceSchema,
    settings: z.object({
        provider: z.string().optional(),
        mistralKey: z.string().optional(),
        model: z.string().optional(),
        openaiUrl: z.string().optional(),
        openaiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        enableThinking: z.boolean().optional(),
        temperature: z.number().optional(),
        topP: z.number().optional(),
        maxTokens: z.number().optional()
    }).passthrough().optional(),
    taskName: z.string().optional()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const validation = CalcTraceExtractionSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { studentText, trace, settings, taskName } = validation.data;

        // Perform server-side extraction using standard extraction logic
        const extractedAST = await extractStudentAST(
            studentText,
            'STANDARD',
            settings as any,
            taskName
        );

        return res.status(200).json(extractedAST);
    } catch (error: any) {
        logger.error('API CalcTrace Extraction Fatal Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
