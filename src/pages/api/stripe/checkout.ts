import stripe from '../../../lib/stripe';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { z } from 'zod';
import { withSecurity, requireUserId, AuthenticatedRequest } from '../../../lib/security';
import type { NextApiResponse } from 'next';
import { toErrorMessage } from '../../../lib/error-message';

const checkoutSchema = z.object({
    bundleType: z.enum(['small', 'medium', 'large']).optional().default('small'),
    email: z.string().email().optional(),
});

/**
 * Stripe Checkout API
 * 💳🛡️⚖️
 * Migrated to Pillar 8 Security Wrapper.
 */
export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const logtoId = requireUserId(req);

    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: 'Ungültige Eingabedaten' });
    }

    const { email, bundleType } = validation.data;

    const domainUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (!domainUrl) {
        return res.status(500).json({ message: 'Server-Konfigurationsfehler (E-001)' });
    }

    try {
        const user = (await prisma.user.findUnique({ 
            where: { logtoId },
            include: { memberships: { include: { workspace: true } } }
        })) as any;

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        const activeWorkspaceId = (user as any).activeWorkspaceId || (user.memberships.length > 0 ? user.memberships[0].workspaceId : null);
        const activeMembership = user.memberships.find((m: any) => m.workspaceId === activeWorkspaceId) || user.memberships[0];

        if (!activeMembership || !activeMembership.workspace) {
            return res.status(400).json({ message: 'Kein aktiver Workspace für die Aufladung gefunden.' });
        }

        // --- INDUSTRIAL ROLE SECURITY GATE ---
        const isSystemAdmin = user.role === 'ADMIN';
        const isOrgWorkspace = activeMembership.workspace.type === 'ORGANIZATION';
        const isOrgAdmin = activeMembership.role === 'ADMIN' || activeMembership.role === 'OWNER';

        const canBuyCredits = isSystemAdmin || !isOrgWorkspace || isOrgAdmin;

        if (!canBuyCredits) {
            return res.status(403).json({ message: 'Sie haben keine Berechtigung, Credits für diese Organisation zu erwerben.' });
        }

        // --- TEST MODE BYPASS ---
        if (process.env.STRIPE_TEST_MODE === 'true') {
            await prisma.workspace.update({
                where: { id: activeWorkspaceId },
                data: { credits: { increment: 100 } }
            });
            return res.status(200).json({ testMode: true, url: `${domainUrl}/app?success=true&testMode=true` });
        }

        let unitAmount = 1000; // 10€
        let creditAmount = '100';
        let productName = 'Koreki Small';

        if (bundleType === 'medium') {
            unitAmount = 2500;
            creditAmount = '300';
            productName = 'Koreki Medium';
        } else if (bundleType === 'large') {
            unitAmount = 5000;
            creditAmount = '700';
            productName = 'Koreki Large';
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: productName,
                            description: `1 Credit = 1 PDF-Seite | 3 Credits = 1 handgeschriebene Seite`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            billing_address_collection: 'required',
            shipping_address_collection: { allowed_countries: ['DE'] },
            success_url: `${domainUrl}/app?success=true`,
            cancel_url: `${domainUrl}/app?canceled=true`,
            metadata: {
                userId: user.id,
                logtoId: logtoId,
                workspaceId: activeWorkspaceId,
                username: user.username || 'unknown',
                creditAmount: creditAmount,
                bundleType: bundleType,
            },
        });

        return res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error) {
        logger.error('Stripe session error', { endpoint: req.url, message: toErrorMessage(error) });
        return res.status(500).json({ message: 'Checkout-Fehler', details: toErrorMessage(error) });
    }
});
