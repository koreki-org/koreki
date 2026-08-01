/**
 * @jest-environment node
 */

/**
 * Industrial Authorization Audit (Layer 1)
 * 🛡️🏛️ Community Multi-User (Keycloak)
 *
 * Prüft den Autorisierungszweig von withSecurity im DB-freien Community-Tier:
 * Identität und Rollen stammen ausschließlich aus dem verifizierten Token.
 * Ergänzt security-keycloak-verify.test.ts, das die Token-Prüfung selbst abdeckt.
 */

const mockVerifyKeycloakToken = jest.fn();
const mockLogSecurityEvent = jest.fn();

jest.mock('@/lib/logto', () => ({ logtoClient: { withLogtoApiRoute: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/services/user-service', () => ({ UserService: { ensureUserExists: jest.fn() } }));
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(true) }));
// Die Factories werden gehoist — Zugriff auf die Mocks daher nur verzögert, innerhalb einer Funktion.
jest.mock('@/lib/audit-service', () => ({
    logSecurityEvent: (...args: unknown[]) => mockLogSecurityEvent(...args)
}));

jest.mock('@/lib/env-context', () => ({
    isLocalInstance: () => true,
    isKeycloakAuth: () => true
}));

jest.mock('@/lib/auth-keycloak-server', () => ({
    extractBearerToken: (header?: string) =>
        typeof header === 'string' && /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '') : null,
    verifyKeycloakToken: (...args: unknown[]) => mockVerifyKeycloakToken(...args)
}));

import type { NextApiResponse } from 'next';
import { withSecurity, type AuthenticatedRequest } from '@/lib/security';

interface MockResponse {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
}

const createResponse = (): MockResponse => {
    const res: Partial<MockResponse> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res as MockResponse;
};

const createRequest = (headers: Record<string, string> = {}): AuthenticatedRequest =>
    ({ headers, url: '/api/admin/global-ai-settings', method: 'GET', socket: {} } as unknown as AuthenticatedRequest);

const verifiedIdentity = (roles: string[]) => ({
    sub: 'lehrkraft-uuid',
    roles,
    issuer: 'https://sso.schule.test/auth/realms/koreki',
    clientId: 'koreki-app',
    expiresAt: Math.floor(Date.now() / 1000) + 300,
    issuedAt: Math.floor(Date.now() / 1000)
});

describe('withSecurity — Community Multi-User Authorization', () => {
    let handler: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = jest.fn().mockResolvedValue(undefined);
    });

    it('denies an admin route to a valid token without the admin role', async () => {
        mockVerifyKeycloakToken.mockResolvedValue(verifiedIdentity(['USER']));
        const res = createResponse();

        await withSecurity(handler, { requireAdmin: true })(
            createRequest({ authorization: 'Bearer gueltiges-token' }),
            res as unknown as NextApiResponse
        );

        expect(res.status).toHaveBeenCalledWith(403);
        expect(handler).not.toHaveBeenCalled();
        expect(mockLogSecurityEvent).toHaveBeenCalledWith(
            'lehrkraft-uuid', null, 'ACCESS_DENIED', expect.any(String), expect.any(String)
        );
    });

    it('grants an admin route to a valid token carrying the admin role', async () => {
        mockVerifyKeycloakToken.mockResolvedValue(verifiedIdentity(['ADMIN', 'USER']));
        const res = createResponse();

        await withSecurity(handler, { requireAdmin: true })(
            createRequest({ authorization: 'Bearer gueltiges-token' }),
            res as unknown as NextApiResponse
        );

        expect(handler).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(403);
    });

    it('grants a non-admin route to a valid token without the admin role', async () => {
        mockVerifyKeycloakToken.mockResolvedValue(verifiedIdentity(['USER']));
        const res = createResponse();

        await withSecurity(handler)(
            createRequest({ authorization: 'Bearer gueltiges-token' }),
            res as unknown as NextApiResponse
        );

        expect(handler).toHaveBeenCalled();
    });

    it('derives the identity from the token and ignores client-supplied headers', async () => {
        mockVerifyKeycloakToken.mockResolvedValue(verifiedIdentity(['USER']));
        const res = createResponse();

        const req = createRequest({
            authorization: 'Bearer gueltiges-token',
            'x-koreki-user-id': 'fremde-lehrkraft',
            'x-koreki-user-roles': '["ADMIN"]'
        });

        await withSecurity(handler, { requireAdmin: true })(req, res as unknown as NextApiResponse);

        // Die gefälschten Header dürfen weder Identität noch Rolle beeinflussen.
        expect(res.status).toHaveBeenCalledWith(403);
        expect(handler).not.toHaveBeenCalled();
    });

    it('rejects a request without a bearer token', async () => {
        const res = createResponse();

        await withSecurity(handler)(createRequest(), res as unknown as NextApiResponse);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(handler).not.toHaveBeenCalled();
        expect(mockVerifyKeycloakToken).not.toHaveBeenCalled();
    });

    it('rejects a request whose token fails verification', async () => {
        mockVerifyKeycloakToken.mockRejectedValue(new Error('signature mismatch'));
        const res = createResponse();

        await withSecurity(handler)(
            createRequest({ authorization: 'Bearer manipuliert' }),
            res as unknown as NextApiResponse
        );

        expect(res.status).toHaveBeenCalledWith(401);
        expect(handler).not.toHaveBeenCalled();
    });

    it('does not leak verification details to the client', async () => {
        mockVerifyKeycloakToken.mockRejectedValue(new Error('JWKS host unreachable at http://gateway'));
        const res = createResponse();

        await withSecurity(handler)(
            createRequest({ authorization: 'Bearer manipuliert' }),
            res as unknown as NextApiResponse
        );

        expect(res.json).toHaveBeenCalledWith({ error: 'Nicht angemeldet.' });
    });

    it('allows anonymous access without a token when the route permits it', async () => {
        const res = createResponse();

        await withSecurity(handler, { allowAnonymous: true })(
            createRequest(),
            res as unknown as NextApiResponse
        );

        expect(handler).toHaveBeenCalled();
        const [req] = handler.mock.calls[0];
        expect(req.user.isAuthenticated).toBe(false);
    });
});
