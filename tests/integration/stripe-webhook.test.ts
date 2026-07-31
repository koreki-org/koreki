import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../src/pages/api/stripe/webhook';
import stripe from '../../src/lib/stripe';

// Raw body is read via `micro`'s buffer() helper before signature verification.
jest.mock('micro', () => ({
    buffer: jest.fn().mockResolvedValue(Buffer.from('raw-body')),
}));

jest.mock('../../src/lib/stripe', () => ({
    __esModule: true,
    default: {
        webhooks: { constructEvent: jest.fn() },
    },
}));

const mockTx = {
    processedStripeSession: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
    },
    workspace: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
    },
    user: {
        update: jest.fn().mockResolvedValue({}),
    },
};

jest.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn((cb: any) => cb(mockTx)),
    },
}));

describe('Stripe Webhook (Layer 2) — Golden-Path Money Flow', () => {
    let req: Partial<NextApiRequest>;
    let res: Partial<NextApiResponse> & { status: jest.Mock; json: jest.Mock; send: jest.Mock };

    const buildEvent = (opts: {
        sessionId?: string;
        userId?: string;
        creditAmount?: string;
        country?: string;
        workspaceId?: string;
    } = {}) => ({
        type: 'checkout.session.completed',
        data: {
            object: {
                id: opts.sessionId ?? 'sess_123',
                metadata: {
                    userId: opts.userId ?? 'user-1',
                    username: 'testuser',
                    creditAmount: opts.creditAmount ?? '50',
                    workspaceId: opts.workspaceId,
                },
                customer_details: { address: { country: opts.country ?? 'DE' } },
                customer: 'cus_123',
            },
        },
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

        req = {
            method: 'POST',
            url: '/api/stripe/webhook',
            headers: { 'stripe-signature': 'sig_test' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };

        mockTx.processedStripeSession.findUnique.mockResolvedValue(null);
        mockTx.workspace.findFirst.mockResolvedValue({ id: 'ws-personal-1' });
    });

    it('credits the personal workspace on a valid DE checkout.session.completed event', async () => {
        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(buildEvent());

        await handler(req as NextApiRequest, res as NextApiResponse);

        expect(mockTx.workspace.update).toHaveBeenCalledWith({
            where: { id: 'ws-personal-1' },
            data: { credits: { increment: 50 } },
        });
        expect(mockTx.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            data: expect.objectContaining({ totalCreditsPurchased: { increment: 50 } }),
        }));
        expect(mockTx.processedStripeSession.create).toHaveBeenCalledWith({ data: { sessionId: 'sess_123' } });
        expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('does not credit twice for a session already processed (idempotency)', async () => {
        mockTx.processedStripeSession.findUnique.mockResolvedValue({ sessionId: 'sess_123' });
        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(buildEvent());

        await handler(req as NextApiRequest, res as NextApiResponse);

        expect(mockTx.workspace.update).not.toHaveBeenCalled();
        expect(mockTx.user.update).not.toHaveBeenCalled();
        expect(mockTx.processedStripeSession.create).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('rejects purchases from outside Germany without crediting (tax compliance gate)', async () => {
        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(buildEvent({ country: 'US' }));

        await handler(req as NextApiRequest, res as NextApiResponse);

        expect(mockTx.workspace.update).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ received: true, error: expect.any(String) }));
    });

    it('rejects requests with an invalid Stripe signature', async () => {
        (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        await handler(req as NextApiRequest, res as NextApiResponse);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockTx.workspace.update).not.toHaveBeenCalled();
    });

    it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;

        await handler(req as NextApiRequest, res as NextApiResponse);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });
});
