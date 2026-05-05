import type { NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { contactSchema } from '@/lib/validation';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Contact API Route
 * 🏮🛡️📬
 * Handles public contact form submissions with Pillar 1 Rate Limiting via withSecurity.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Validate Input
        const validatedData = contactSchema.parse(req.body);

        // 2. Check Configuration
        const apiKey = process.env.SENDGRID_API_KEY;
        const receiver = process.env.CONTACT_FORM_RECEIVER_EMAIL || 'support@example.com';
        const sender = process.env.SENDGRID_SENDER_EMAIL || 'support@example.com';

        if (!apiKey) {
            logger.error('SENDGRID_API_KEY is missing');
            return res.status(500).json({ error: 'Mail service not configured' });
        }

        // 3. Construct Email
        const msg = {
            to: receiver,
            from: sender,
            replyTo: validatedData.email,
            subject: `[Koreki Kontakt] ${validatedData.subject}`,
            text: `Name: ${validatedData.name}\nE-Mail: ${validatedData.email}\n\nNachricht:\n${validatedData.message}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Neue Kontaktanfrage</h2>
                    <p><strong>Name:</strong> ${validatedData.name}</p>
                    <p><strong>E-Mail:</strong> ${validatedData.email}</p>
                    <p><strong>Betreff:</strong> ${validatedData.subject}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="white-space: pre-wrap;">${validatedData.message}</p>
                </div>
            `,
        };

        // 4. Send Email
        await sgMail.send(msg);

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }

        logger.error('SendGrid Error:', error);
        return res.status(500).json({ error: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es später erneut.' });
    }
}, { isAi: true, allowAnonymous: true });

