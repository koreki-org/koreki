import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../src/lib/security';
import prisma from '../../src/lib/prisma';
import { logSecurityEvent } from '../../src/lib/audit-service';

// 1. Mock Infrastructure
jest.mock('../../src/lib/logto', () => ({
    logtoClient: {
        withLogtoApiRoute: jest.fn((handler) => handler)
    }
}));

jest.mock('../../src/lib/prisma', () => ({
    user: {
        findUnique: jest.fn()
    },
    privacyLog: {
        create: jest.fn().mockResolvedValue({})
    }
}));

jest.mock('../../src/lib/audit-service', () => ({
    logSecurityEvent: jest.fn().mockResolvedValue({})
}));

describe('Rate Limit Integration (Layer 2 - Spam Protection)', () => {

    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        // Die Limiter halten ihren Zaehlerstand im Speicher ueber Tests hinweg.
        // Deshalb bekommt jeder Test eine eigene IP UND eine eigene Nutzer-ID —
        // seit die zweite Stufe auf der Nutzer-ID zaehlt, reicht die IP nicht mehr.
        const uniqueIp = `192.168.1.${Math.floor(Math.random() * 254)}`;
        const uniqueSub = `spammer-${Math.random().toString(36).slice(2)}`;
        req = {
            headers: { 'x-forwarded-for': uniqueIp },
            socket: {},
            user: { isAuthenticated: true, claims: { sub: uniqueSub } },
            body: {}
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u-spam',
            role: 'USER',
            memberships: []
        });
    });

    it('blockt eine angemeldete Lehrkraft erst nach 60 KI-Anfragen (Saeule 1, Stufe 2)', async () => {
        const handler = jest.fn(async (req, res) => {
            res.status(200).json({ success: true });
        });

        const protectedHandler = withSecurity(handler, { isAi: true });

        // 60 traegt eine Klassenkorrektur in einem Durchgang. Frueher war hier
        // nach 10 Schluss, weil pro IP statt pro Nutzer gezaehlt wurde.
        for (let i = 0; i < 60; i++) {
            await protectedHandler(req, res);
        }

        expect(handler).toHaveBeenCalledTimes(60);
        expect(res.status).not.toHaveBeenCalledWith(429);

        await protectedHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.stringContaining('Zu viele Anfragen')
        }));
        expect(handler).toHaveBeenCalledTimes(60);

        // Das protokollierte Subjekt ist jetzt die Nutzer-ID, nicht die IP.
        expect(logSecurityEvent).toHaveBeenCalledWith(
            'anonymous',
            null,
            'RATE_LIMIT_EXCEEDED',
            expect.stringContaining(req.user.claims.sub),
            req.headers['x-forwarded-for']
        );
    });

    it('laesst Kolleginnen hinter derselben IP nicht fuereinander mitzahlen (NAT)', async () => {
        const handler = jest.fn(async (req, res) => {
            res.status(200).json({ success: true });
        });

        const protectedHandler = withSecurity(handler, { isAi: true });

        // Erste Lehrkraft schoepft ihr Kontingent aus.
        for (let i = 0; i < 61; i++) {
            await protectedHandler(req, res);
        }
        expect(res.status).toHaveBeenCalledWith(429);

        // Zweite Lehrkraft, gleiche Schul-IP, eigene Anmeldung.
        const colleague = {
            ...req,
            user: { isAuthenticated: true, claims: { sub: `kollegin-${Math.random().toString(36).slice(2)}` } }
        };
        const freshRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

        await protectedHandler(colleague, freshRes as any);

        // Genau der Fall, an dem die alte IP-Zaehlung eine ganze Schule lahmlegte.
        expect(freshRes.status).not.toHaveBeenCalledWith(429);
        expect(freshRes.status).toHaveBeenCalledWith(200);
    });

    it('should allow more requests on a non-AI endpoint (Baseline)', async () => {
        const handler = jest.fn(async (req, res) => {
            res.status(200).json({ success: true });
        });

        // Use a fresh IP
        req.headers['x-forwarded-for'] = '10.0.0.1';
        const protectedHandler = withSecurity(handler, { isAi: false });

        // 15 requests should easily pass (Limit is 100)
        for (let i = 0; i < 15; i++) {
            await protectedHandler(req, res);
        }

        expect(handler).toHaveBeenCalledTimes(15);
        expect(res.status).not.toHaveBeenCalledWith(429);
    });

});
