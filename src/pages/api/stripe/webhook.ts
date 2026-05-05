import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import stripe from '../../../lib/stripe';
import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        logger.error('Critical Error: STRIPE_WEBHOOK_SECRET is not defined.', { endpoint: req.url });
        return res.status(500).send('Webhook configuration missing.');
    }

    let event;

    try {
        const rawBody = await buffer(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        logger.error(`Webhook Error`, { endpoint: req.url, message: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const sessionId = session.id;
        const userId = session.metadata.userId;
        const username = session.metadata.username;
        const creditAmount = parseInt(session.metadata.creditAmount || '0', 10);
        const country = session.customer_details?.address?.country;

        // Legal Safety: Double check that the user is really from Germany (Tax Compliance)
        if (country !== 'DE') {
            logger.error(`Tax Compliance Error`, { endpoint: req.url, username, country, message: 'User attempted purchase from unauthorized country.' });
            return res.status(200).json({ received: true, error: 'Outside allowed country' });
        }

        if (userId && creditAmount > 0) {
            try {
                const workspaceId = session.metadata.workspaceId;

                await prisma.$transaction(async (tx) => {
                    const alreadyProcessed = await tx.processedStripeSession.findUnique({
                        where: { sessionId }
                    });

                    if (alreadyProcessed) return;

                    // Ziel-Workspace finden (Meta oder Fallback auf Personal)
                    let targetWorkspaceId = workspaceId;
                    if (!targetWorkspaceId) {
                        const personaWS = await tx.workspace.findFirst({
                            where: {
                                memberships: { some: { userId, workspace: { type: 'PERSONAL' } } }
                            }
                        });
                        targetWorkspaceId = personaWS?.id;
                    }

                    if (targetWorkspaceId) {
                        await tx.workspace.update({
                            where: { id: targetWorkspaceId },
                            data: { credits: { increment: creditAmount } }
                        });
                    }

                    // Legacy Sync & Customer Data
                    await tx.user.update({
                        where: { id: userId },
                        data: {
                            stripeCustomerId: session.customer as string,
                            hasProAccess: true,
                            totalCreditsPurchased: { increment: creditAmount }
                        },
                    });

                    await tx.processedStripeSession.create({
                        data: { sessionId }
                    });

                    logger.info(`[Webhook Success] Added ${creditAmount} credits to workspace: ${targetWorkspaceId} (User: ${username})`);
                });
            } catch (txError) {
                logger.error(`Webhook Transaction Error for session ${sessionId}`, { endpoint: req.url, message: txError instanceof Error ? txError.message : String(txError) });
                return res.status(500).send('Internal transaction failure');
            }
        }
    }

    res.json({ received: true });
}
