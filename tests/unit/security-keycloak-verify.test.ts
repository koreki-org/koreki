/**
 * @jest-environment node
 */
import { SignJWT, exportJWK, generateKeyPair, type JWK, type JWTPayload } from 'jose';

/**
 * Industrial Auth Verification Audit (Layer 1)
 * 🛡️🗝️ Community Multi-User (Keycloak)
 *
 * Beweist, dass die API-Schicht ausschließlich kryptografisch verifizierte
 * Tokens akzeptiert. Der historische Bypass über client-gelieferte
 * Identitäts-Header ist hier als expliziter Regressionstest abgesichert.
 */

const mockJwks: { keys: JWK[] } = { keys: [] };

jest.mock('jose', () => {
    const actual = jest.requireActual('jose');
    return {
        ...actual,
        // JWKS wird nicht über das Netz geholt, sondern aus dem Test-Keyset bedient.
        createRemoteJWKSet: () => actual.createLocalJWKSet(mockJwks),
    };
});

import {
    verifyKeycloakToken,
    extractBearerToken,
    KeycloakVerificationError
} from '@/lib/auth-keycloak-server';

const ISSUER = 'https://sso.schule.test/auth/realms/koreki';
const CLIENT_ID = 'koreki-app';
const KEY_ID = 'test-signing-key';

let signingKey: CryptoKey;
let foreignKey: CryptoKey;

interface TokenOptions {
    payload?: JWTPayload & Record<string, unknown>;
    issuer?: string;
    expiresIn?: string;
    key?: CryptoKey;
}

const createToken = async (options: TokenOptions = {}): Promise<string> => {
    const {
        payload = {},
        issuer = ISSUER,
        expiresIn = '5m',
        key = signingKey
    } = options;

    return new SignJWT({
        typ: 'Bearer',
        azp: CLIENT_ID,
        realm_access: { roles: ['koreki-user'] },
        ...payload
    })
        .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
        .setIssuer(issuer)
        .setSubject((payload.sub as string) ?? 'user-uuid-1')
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(key);
};

beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true });
    const foreignPair = await generateKeyPair('RS256', { extractable: true });

    signingKey = keyPair.privateKey as CryptoKey;
    foreignKey = foreignPair.privateKey as CryptoKey;

    const publicJwk = await exportJWK(keyPair.publicKey);
    mockJwks.keys.push({ ...publicJwk, alg: 'RS256', kid: KEY_ID, use: 'sig' });

    process.env.NEXT_PUBLIC_OIDC_ISSUER = ISSUER;
    process.env.OIDC_CLIENT_ID = CLIENT_ID;
});

describe('Keycloak Token Verification', () => {

    it('accepts a correctly signed token and returns the verified identity', async () => {
        const token = await createToken({ payload: { sub: 'teacher-42' } });
        const identity = await verifyKeycloakToken(token);

        expect(identity.sub).toBe('teacher-42');
        expect(identity.issuer).toBe(ISSUER);
        expect(identity.roles).toEqual(['USER']);
    });

    it('maps the koreki-admin realm role to the internal ADMIN role', async () => {
        const token = await createToken({
            payload: { realm_access: { roles: ['koreki-admin', 'koreki-user'] } }
        });
        const identity = await verifyKeycloakToken(token);

        expect(identity.roles).toContain('ADMIN');
        expect(identity.roles).toContain('USER');
    });

    it('reads roles from realm_access even without a realm protocol mapper', async () => {
        // Kein flaches 'roles'-Array im Token — genau der Fall einer Realm-Config
        // ohne Custom-Mapper. realm_access liefert Keycloak immer.
        const token = await createToken({
            payload: { realm_access: { roles: ['koreki-admin'] }, roles: undefined }
        });
        const identity = await verifyKeycloakToken(token);

        expect(identity.roles).toEqual(['ADMIN']);
    });

    it('honours a school-specific admin role name from NEXT_PUBLIC_ADMIN_ROLE_NAME', async () => {
        process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME = 'lehrer-admin';
        try {
            const token = await createToken({
                payload: { realm_access: { roles: ['lehrer-admin'] } }
            });
            const identity = await verifyKeycloakToken(token);

            expect(identity.roles).toEqual(['ADMIN']);
        } finally {
            delete process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME;
        }
    });

    it('ignores realm roles that have no internal Koreki equivalent', async () => {
        const token = await createToken({
            payload: { realm_access: { roles: ['offline_access', 'uma_authorization'] } }
        });
        const identity = await verifyKeycloakToken(token);

        expect(identity.roles).toEqual([]);
    });

    it('rejects a token signed by an unknown key', async () => {
        const token = await createToken({ key: foreignKey });
        await expect(verifyKeycloakToken(token)).rejects.toThrow(KeycloakVerificationError);
    });

    it('rejects an expired token', async () => {
        const token = await createToken({ expiresIn: '-10m' });
        await expect(verifyKeycloakToken(token)).rejects.toThrow(KeycloakVerificationError);
    });

    it('rejects a token from a foreign issuer', async () => {
        const token = await createToken({ issuer: 'https://evil.test/realms/koreki' });
        await expect(verifyKeycloakToken(token)).rejects.toThrow(KeycloakVerificationError);
    });

    it('rejects a token that is not bound to the Koreki client', async () => {
        const token = await createToken({ payload: { azp: 'some-other-client', aud: 'account' } });
        await expect(verifyKeycloakToken(token)).rejects.toThrow(KeycloakVerificationError);
    });

    it('rejects an ID token used in place of an access token', async () => {
        const token = await createToken({ payload: { typ: 'ID' } });
        await expect(verifyKeycloakToken(token)).rejects.toThrow(KeycloakVerificationError);
    });

    it('rejects arbitrary non-JWT strings', async () => {
        await expect(verifyKeycloakToken('not-a-token')).rejects.toThrow(KeycloakVerificationError);
    });
});

describe('Bearer Token Extraction', () => {

    it('extracts the token from a well-formed Authorization header', () => {
        expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
        expect(extractBearerToken('bearer abc.def.ghi')).toBe('abc.def.ghi');
    });

    it('returns null for missing, malformed or non-string headers', () => {
        expect(extractBearerToken(undefined)).toBeNull();
        expect(extractBearerToken('')).toBeNull();
        expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
        expect(extractBearerToken(['Bearer a', 'Bearer b'])).toBeNull();
    });

    /**
     * REGRESSIONSTEST für den geschlossenen Auth-Bypass.
     * Identität darf ausschließlich aus dem Authorization-Header stammen —
     * x-koreki-user-id / x-koreki-user-roles sind keine Vertrauensquelle mehr.
     */
    it('provides no path to derive an identity from legacy identity headers', () => {
        const legacyHeaders = {
            'x-koreki-user-id': 'attacker-controlled',
            'x-koreki-user-roles': '["ADMIN"]'
        } as Record<string, string>;

        expect(extractBearerToken(legacyHeaders['x-koreki-user-id'])).toBeNull();
        expect(extractBearerToken(legacyHeaders['x-koreki-user-roles'])).toBeNull();
    });
});
