import { withSecurity, AuthenticatedRequest } from '../../../lib/security';
import { logger } from '../../../lib/logger';
import type { NextApiResponse } from 'next';
import { z } from 'zod';

/**
 * Pure Proxy API (Client-Side Key Mode)
 * 🤖🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 * Provides rate-limiting and session auditing even for BYOK users.
 */
const pureProxySchema = z.object({
    buffer: z.string().optional(),
    mimeType: z.string().optional(),
    isOcr: z.boolean().optional(),
    isCorrection: z.boolean().optional(),
    modelSolution: z.string().optional(),
    studentText: z.string().optional()
}).refine(data => {
    if (data.isOcr) return !!data.buffer;
    if (data.isCorrection) return !!data.modelSolution && !!data.studentText;
    return true;
}, { message: 'Fehlende Felder für den gewählten Anfrage-Typ.' });

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { isAuthenticated } = req.user;
    if (!isAuthenticated) return res.status(401).json({ error: 'Nicht angemeldet.' });

    const pureKey = req.headers['x-pure-key'] as string;
    if (!pureKey) return res.status(400).json({ error: 'Mistral API Key fehlt. Bitte in den Einstellungen hinterlegen.' });

    const validation = pureProxySchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { buffer, mimeType, isOcr, isCorrection, modelSolution, studentText } = validation.data;

    try {
        if (isOcr) {
            const response = await fetch('https://api.mistral.ai/v1/ocr', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${pureKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "mistral-ocr-latest",
                    document: {
                        type: "document_url",
                        document_url: `data:${mimeType || 'application/pdf'};base64,${buffer}`
                    }
                })
            });
            const data = await response.json() as any;
            if (!response.ok) throw new Error(data.message || 'Mistral OCR Error');

            const text = data.pages?.map((p: any) => p.markdown).join('\n\n') || '';
            return res.status(200).json({ text });
        }

        if (isCorrection) {
            const prompt = `Du bist ein erfahrener Lehrer. Korrigiere die folgende Schülerarbeit basierend auf der Musterlösung.
            
            MUSTERLÖSUNG:
            ${modelSolution}
            
            SCHÜLERARBEIT (OCR Text):
            ${studentText}
            
            Antworte im JSON Format mit einer detaillierten Analyse.`;

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${pureKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "mistral-large-latest",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });
            const data = await response.json() as any;
            if (!response.ok) throw new Error(data.message || 'Mistral Chat Error');

            const result = JSON.parse(data.choices[0].message.content);
            return res.status(200).json(result);
        }

        return res.status(400).json({ error: 'Invalid request type' });
    } catch (error: any) {
        logger.error('Pure Proxy Error', { endpoint: req.url, message: error.message || String(error) });
        return res.status(500).json({ error: error.message || 'Mistral API Fehler' });
    }
}, { isAi: true });
