import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import prisma from '@/lib/prisma';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { checkAiBudget, checkCompliance, checkCreditsAvailable, performBillingAction } from '@/lib/billing';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { logger } from '@/lib/logger';
import { promisePool } from '../../lib/ai/promise-pool';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';
import { toErrorMessage } from '@/lib/error-message';

const extractImageSchema = z.object({
    buffer: z.string().optional(),
    buffers: z.array(z.string()).optional(),
    mimeType: z.string().optional(),
    settings: z.object({
        provider: z.enum(['mistral', 'ollama', 'openai-compatible']).optional(),
        mistralKey: z.string().optional(),
        openaiUrl: z.string().optional(),
        openaiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        model: z.string().optional(),
        ollamaUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        ollamaNumCtx: z.number().optional(),
        visionTemperature: z.number().optional(),
        visionTopP: z.number().optional(),
        visionMaxTokens: z.number().optional(),
        visionPresencePenalty: z.number().optional()
    }).passthrough().optional(),
    pageCount: z.number().optional(),
    pageRange: z.tuple([z.number(), z.number()]).optional(),
    isComplex: z.boolean().optional()
}).refine(data => !!data.buffer || (Array.isArray(data.buffers) && data.buffers.length > 0), {
    message: 'Bilddaten fehlen (buffer oder buffers erforderlich).'
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method not allowed' });
        }

        const validation = extractImageSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { buffer, buffers: buffersFromReq, mimeType, settings: clientSettings, pageCount, pageRange, isComplex } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);

        let dataBuffer: Buffer[];

        if (buffersFromReq && Array.isArray(buffersFromReq)) {
            dataBuffer = buffersFromReq.map((b: string) => Buffer.from(b, 'base64'));
        } else if (buffer) {
            dataBuffer = [Buffer.from(buffer, 'base64')];
        } else {
            // Das Zod-Schema schliesst diesen Fall bereits aus; die Pruefung macht
            // die Zusicherung fuer den Compiler sichtbar, statt sie mit `!` zu
            // behaupten.
            return res.status(400).json({ error: 'Bilddaten fehlen (buffer oder buffers erforderlich).' });
        }

        const logtoId = requireUserId(req);



        // --- COMPLIANCE EARLY GATEKEEPER ---
        //
        // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand `resolveActiveWorkspace`.
        // Diese Funktion prueft die AVV-Zustimmung gar nicht und wirft nie —
        // sie schlaegt nur einen Workspace nach. Die Ueberschrift stimmte
        // also nicht: Der Riegel war an dieser Stelle wirkungslos, und die
        // einzige echte Pruefung lief in `performBillingAction`, also NACH
        // dem Anbieter-Aufruf. Schuelertext ging raus, und erst danach fiel
        // auf, dass die Schule nie zugestimmt hatte.
        const komplianzFehler = await checkCompliance(logtoId);
        if (komplianzFehler) {
            return res.status(403).json({ error: komplianzFehler });
        }

        let effectivePageCount = Math.max(1, req.body.pageCount || pageCount || 1);
        if (pageRange && Array.isArray(pageRange) && pageRange.length === 2) {
            effectivePageCount = pageRange[1] - pageRange[0] + 1;
        }

        if (dataBuffer.length > 1) {
            effectivePageCount = dataBuffer.length;
        }

        // `isScan` waehlt das VERFAHREN, nicht den PREIS.
        //
        // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand
        // `effectivePageCount * (isScan ? 1 : 0)`. Damit entschied der Browser
        // mit, ob ein Lauf ueberhaupt etwas kostet — der Server glaubte ihm.
        // Der Anbieter wurde unabhaengig davon gerufen, ein `isScan: false`
        // haette also echte Kosten auf unserem Schluessel erzeugt und null
        // Credits gebucht.
        //
        // Fuer echte Nutzer aendert sich dadurch NICHTS, und das ist geprueft:
        // Jeder Weg, der hier ankommt, meldet `isScan: true`. Digitale PDFs
        // nehmen in extraction-logic.ts einen ganz anderen Weg (Text lokal per
        // pdf.js, gar keine Anfrage an diese Route), gescannte PDFs und Bilder
        // rufen sie mit `true`, und der Schwaerzungs-Pfad setzt fest
        // `isScanned: true`. Der Null-Fall war nur von Hand erreichbar.
        //
        // Das Feld bleibt erhalten — es entscheidet weiter ueber die Wahl
        // zwischen Mistrals OCR-Endpunkt und dem Vision-Weg (siehe unten). Nur
        // die Abrechnung hoert nicht mehr darauf.
        const isScan = req.body.isScan === true;
        const OCR_CREDIT_COST = effectivePageCount;

        // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
        const budgetError = await checkAiBudget('ocr');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
        }

        const tryMistral = async (buffers: Buffer[]) => {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                // Bewusst festverdrahtet auf den dedizierten OCR-Endpunkt (/v1/ocr).
                //
                // Dieser Zweig IST die Schalterstellung "Hohe Genauigkeit aus" und damit
                // Mistrals Aufgabe. Der auskommentierte Vision-Pfad unten stammt aus der
                // Zeit vor Qwen: Mistrals 'vision'-Aktion laeuft ueber /chat/completions
                // mit mistral-large-latest und ist NICHT der OCR-Pfad.
                //
                // Handschrift traegt Mistral OCR derzeit nicht — auf Wortebene verfaelscht
                // es genau die Fachbegriffe, an denen die Bewertung haengt. Handschrift
                // laeuft deshalb ausschliesslich ueber Qwen (Schalter an); ein
                // automatischer Rueckfall existiert bewusst nicht.
                //
                // Messung, Begruendung und Ausloeser zur Neubewertung:
                // docs/technical/ai-provider-infrastructure.md, Abschnitt 5.
                // const action = (isComplex && mimeType?.startsWith('image/')) ? 'vision' : 'ocr';
                const action = 'ocr';
                const result = await executeMistralRequest(
                    action,
                    { buffer: b.toString('base64'), mimeType },
                    apiKey,
                    { isScan, model: settings?.model }
                );

                return {
                    content: result.text,
                    promptTokens: result.usage?.prompt_tokens || 0,
                    completionTokens: result.usage?.completion_tokens || 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');
            const totalPromptTokens = pageResults.reduce((sum, r) => sum + r.promptTokens, 0);
            const totalCompletionTokens = pageResults.reduce((sum, r) => sum + r.completionTokens, 0);

            return { 
                text: fullText, 
                inputTokens: totalPromptTokens, 
                outputTokens: totalCompletionTokens 
            };
        };

        const tryOpenAI = async (buffers: Buffer[]) => {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const result = await executeOpenAIRequest(
                    'vision',
                    { buffer: b.toString('base64'), mimeType },
                    baseUrl,
                    apiKey,
                    { 
                        model,
                        temperature: settings?.visionTemperature,
                        topP: settings?.visionTopP,
                        maxTokens: settings?.visionMaxTokens,
                        presencePenalty: settings?.visionPresencePenalty
                    }
                );

                return {
                    content: result.text,
                    promptTokens: result.usage?.prompt_tokens || 0,
                    completionTokens: result.usage?.completion_tokens || 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');
            const totalPromptTokens = pageResults.reduce((sum, r) => sum + r.promptTokens, 0);
            const totalCompletionTokens = pageResults.reduce((sum, r) => sum + r.completionTokens, 0);

            return { 
                text: fullText, 
                inputTokens: totalPromptTokens, 
                outputTokens: totalCompletionTokens 
            };
        };

        // Die Einstellungen kommen als Parameter herein, damit die Verengung aus
        // `settings?.provider === 'ollama'` am Aufrufort erhalten bleibt — sonst
        // sieht der Compiler hier wieder das optionale Feld.
        const tryOllama = async (buffers: Buffer[], ollamaSettings: NonNullable<typeof settings>) => {

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const result = await executeOllamaRequest(
                    'vision',
                    { buffer: b.toString('base64'), mimeType },
                    ollamaSettings
                );

                return {
                    content: result.text,
                    promptTokens: 0,
                    completionTokens: 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');

            return { 
                text: fullText, 
                inputTokens: 0, 
                outputTokens: 0 
            };
        };

        // Guthaben VOR dem Anbieter-Aufruf pruefen — die Abrechnung unten laeuft
        // erst danach und wuerde die Kosten sonst bereits ausgeloest haben.
        const creditError = await checkCreditsAvailable(logtoId, OCR_CREDIT_COST);
        if (creditError) {
            return res.status(402).json({ error: creditError });
        }

        // Route to selected AI provider
        let resultData;
        if (settings?.provider === 'ollama') {
            resultData = await tryOllama(dataBuffer, settings);
        } else {
            const useOpenAI = settings?.provider === 'openai-compatible' || isComplex;
            resultData = useOpenAI 
                ? await tryOpenAI(dataBuffer) 
                : await tryMistral(dataBuffer);
        }
        
        // --- ATOMIC BILLING & TRACKING ---
        await performBillingAction({
            logtoId,
            module: 'ocr',
            inputTokens: resultData.inputTokens || (effectivePageCount * 500),
            outputTokens: resultData.outputTokens || (effectivePageCount * 500),
            creditCost: OCR_CREDIT_COST
        });

        return res.status(200).json({ text: resultData.text });
    } catch (error) {
        logger.error('[API/extract-image] OCR Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler bei der Bilderkennung (OCR).');
        res.status(status).json({ error: message });
    }
}, { isAi: true });
