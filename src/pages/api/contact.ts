import type { NextApiResponse } from 'next';
import nodemailer, { type Transporter } from 'nodemailer';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { contactSchema } from '@/lib/validation';

/**
 * Der Versand laeuft ueber generisches SMTP statt ueber ein Anbieter-SDK.
 * Damit bleibt der Mailweg austauschbar (Architectural Vision §5, Open Source
 * Readiness): wer eine eigene Instanz betreibt, traegt seinen Relay in die
 * Umgebung ein, ohne eine Zeile Code zu aendern.
 */
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Erst pruefen, dann den Zwischenspeicher nutzen: sonst ueberlebt ein
    // Transporter das Entfernen seiner eigenen Konfiguration.
    if (!host || !user || !pass) return null;
    if (cachedTransporter) return cachedTransporter;

    const port = Number(process.env.SMTP_PORT || 587);
    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        // Port 465 spricht ab der ersten Sekunde TLS, 587 stuft per STARTTLS
        // hoch. Pauschales `true` auf 587 endet im Verbindungs-Timeout.
        secure: port === 465,
        auth: { user, pass },
    });
    return cachedTransporter;
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
        const transporter = getTransporter();
        const receiver = process.env.CONTACT_FORM_RECEIVER_EMAIL || 'support@example.com';
        const sender = process.env.MAIL_SENDER_EMAIL || 'support@example.com';

        if (!transporter) {
            logger.error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
            return res.status(500).json({ error: 'Mail service not configured' });
        }

        // 3. Construct Email
        // Das Formular ist anonym erreichbar; die Felder landen unveraendert im
        // internen Support-Postfach. Ohne Maskierung koennte ein Absender dort
        // eigenes Markup platzieren und die Nachricht als etwas anderes
        // erscheinen lassen, als sie ist.
        const escapeHtml = (value: string) =>
            value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

        // Der Betreff wandert in einen Mail-Header. Zeilenumbrueche darin
        // koennten weitere Header anhaengen (etwa ein zweites `Bcc:`), darum
        // werden sie hier entfernt und nicht bloss maskiert.
        const headerSafeSubject = validatedData.subject.replace(/[\r\n]+/g, ' ');

        const msg = {
            to: receiver,
            from: sender,
            replyTo: validatedData.email,
            subject: `[Koreki Kontakt] ${headerSafeSubject}`,
            text: `Name: ${validatedData.name}\nE-Mail: ${validatedData.email}\n\nNachricht:\n${validatedData.message}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb; margin-top: 0;">Neue Kontaktanfrage</h2>
                    <p><strong>Name:</strong> ${escapeHtml(validatedData.name)}</p>
                    <p><strong>E-Mail:</strong> ${escapeHtml(validatedData.email)}</p>
                    <p><strong>Betreff:</strong> ${escapeHtml(validatedData.subject)}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="white-space: pre-wrap;">${escapeHtml(validatedData.message)}</p>
                </div>
            `,
        };

        // 4. Send Email
        await transporter.sendMail(msg);

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }

        logger.error('SMTP Error:', error);
        return res.status(500).json({ error: 'Fehler beim Senden der Nachricht. Bitte versuchen Sie es später erneut.' });
    }
}, { isAi: true, allowAnonymous: true });
