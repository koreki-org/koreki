import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { logger } from './logger';

/**
 * Industrial OIDC Verifier (Keycloak Strategy — Server Side)
 * 🛡️🏛️🗝️
 *
 * Stateless, DB-freie Token-Verifikation für die Community Multi-User Edition.
 * Keycloak (optional via LDAP) ist in diesem Tier die alleinige Source of Truth
 * für Identität UND Rollen — es existiert bewusst keine Koreki-Datenbank, gegen
 * die im Sinne von Säule 8 abgeglichen werden könnte.
 * Siehe docs/technical/community-edition-persistence.md.
 *
 * Gegenstück zu auth-keycloak.ts (Client/Browser, oidc-client-ts).
 * Diese Datei darf NIEMALS in Client-Code importiert werden.
 */

const DEFAULT_ADMIN_REALM_ROLE = 'koreki-admin';
const DEFAULT_USER_REALM_ROLE = 'koreki-user';

/**
 * Keycloak-Realm-Rollen → interne Koreki-Rollen.
 *
 * Schulen dürfen über NEXT_PUBLIC_ADMIN_ROLE_NAME einen abweichenden
 * Rollennamen verwenden, um Konflikte mit bestehenden LDAP-/AD-Rollen zu
 * vermeiden. Dieser wird zusätzlich zum Standardnamen akzeptiert.
 */
function getRealmRoleMap(): Record<string, string> {
    const roleMap: Record<string, string> = {
        [DEFAULT_ADMIN_REALM_ROLE]: 'ADMIN',
        [DEFAULT_USER_REALM_ROLE]: 'USER'
    };

    const configuredAdminRole = process.env.NEXT_PUBLIC_ADMIN_ROLE_NAME?.trim();
    if (configuredAdminRole) {
        roleMap[configuredAdminRole] = 'ADMIN';
    }

    return roleMap;
}

/** Toleranz gegen Uhren-Drift zwischen App- und Keycloak-Container. */
const CLOCK_TOLERANCE = '30s';

interface KeycloakTokenPayload extends JWTPayload {
    /** Keycloak setzt 'Bearer' für Access Tokens und 'ID' für ID Tokens. */
    typ?: string;
    /** Authorized party — bei Public Clients verlässlicher als 'aud'. */
    azp?: string;
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
    /** Nur vorhanden, wenn im Realm ein Role-Mapper konfiguriert ist. */
    roles?: string[];
}

export interface VerifiedKeycloakIdentity {
    sub: string;
    roles: string[];
    issuer: string;
    clientId: string;
    expiresAt: number;
    issuedAt: number;
}

export class KeycloakVerificationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KeycloakVerificationError';
    }
}

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Der Issuer, gegen den der 'iss'-Claim geprüft wird.
 *
 * WICHTIG: Keycloak signiert Tokens immer mit seiner öffentlich konfigurierten
 * Hostname-URL. Der 'iss'-Claim muss daher gegen die PUBLIC-URL geprüft werden,
 * auch wenn wir die Schlüssel über einen internen Pfad abholen.
 */
function getPublicIssuer(): string {
    const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
    if (!issuer) {
        throw new KeycloakVerificationError('NEXT_PUBLIC_OIDC_ISSUER ist nicht konfiguriert.');
    }
    return stripTrailingSlash(issuer);
}

/**
 * Die Basis-URL, über die der Server den JWKS-Endpunkt tatsächlich erreicht.
 *
 * In docker-compose.community-multi-full.yml läuft Keycloak hinter dem
 * Nginx-Gateway. Die öffentliche APP_URL ist aus dem App-Container heraus nicht
 * zwingend auflösbar (Hairpin-NAT), deshalb kann der Abholpfad über
 * OIDC_ISSUER_INTERNAL abweichend gesetzt werden. Fällt auf die Public-URL
 * zurück, wenn nicht gesetzt (Setup mit externem Keycloak).
 */
function getJwksBaseUrl(): string {
    const internal = process.env.OIDC_ISSUER_INTERNAL;
    return internal ? stripTrailingSlash(internal) : getPublicIssuer();
}

/** Client-ID für die azp/aud-Prüfung. Server-eigene Variable mit Public-Fallback. */
function getExpectedClientId(): string {
    const clientId = process.env.OIDC_CLIENT_ID || process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
    if (!clientId) {
        throw new KeycloakVerificationError('OIDC_CLIENT_ID ist nicht konfiguriert.');
    }
    return clientId;
}

type RemoteJwkSet = ReturnType<typeof createRemoteJWKSet>;

let cachedJwks: RemoteJwkSet | null = null;
let cachedJwksUrl: string | null = null;

/**
 * JWKS-Set als Modul-Singleton. createRemoteJWKSet cached die Schlüssel intern
 * und holt sie nur bei unbekannter 'kid' nach — pro Request neu erzeugen würde
 * das Caching aushebeln und Keycloak unnötig belasten.
 */
function getJwks(): RemoteJwkSet {
    const jwksUrl = `${getJwksBaseUrl()}/protocol/openid-connect/certs`;

    if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
        cachedJwks = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 30000 });
        cachedJwksUrl = jwksUrl;
        logger.info('[KeycloakVerifier] JWKS-Endpunkt initialisiert', { jwksUrl });
    }

    return cachedJwks;
}

/**
 * Sammelt Rollen aus allen Stellen, an denen Keycloak sie ablegen kann.
 *
 * 'realm_access.roles' liefert Keycloak IMMER — unabhängig davon, ob im Realm
 * ein Protocol-Mapper konfiguriert ist. Das flache 'roles'-Array existiert nur
 * mit Mapper und wird nur als zusätzliche Quelle gelesen, damit bestehende
 * Installationen ohne Realm-Anpassung weiterlaufen.
 */
function extractRoles(payload: KeycloakTokenPayload, clientId: string): string[] {
    const realmRoles = payload.realm_access?.roles ?? [];
    const clientRoles = payload.resource_access?.[clientId]?.roles ?? [];
    const mappedRoles = Array.isArray(payload.roles) ? payload.roles : [];

    const roleMap = getRealmRoleMap();
    const rawRoles = [...realmRoles, ...clientRoles, ...mappedRoles];
    const internalRoles = rawRoles.map(role => roleMap[role]).filter((role): role is string => Boolean(role));

    return Array.from(new Set(internalRoles));
}

/**
 * Prüft die Client-Bindung des Tokens.
 *
 * Der koreki-app Client ist ein Public Client ohne Audience-Mapper. Keycloak
 * setzt dort typischerweise aud=['account'] und azp='koreki-app' — eine strikte
 * 'aud'-Prüfung würde also gültige Tokens ablehnen. Wir akzeptieren daher
 * beide Bindungsformen, verlangen aber mindestens eine davon.
 */
function hasValidClientBinding(payload: KeycloakTokenPayload, clientId: string): boolean {
    if (payload.azp === clientId) return true;

    const audience = payload.aud;
    if (typeof audience === 'string') return audience === clientId;
    if (Array.isArray(audience)) return audience.includes(clientId);

    return false;
}

/**
 * Liest das Bearer-Token aus dem Authorization-Header.
 */
export function extractBearerToken(authorizationHeader: string | string[] | undefined): string | null {
    if (typeof authorizationHeader !== 'string') return null;

    const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

/**
 * Verifiziert ein Keycloak Access Token vollständig:
 * Signatur (via JWKS), Issuer, Client-Bindung, Ablauf und Token-Typ.
 *
 * Wirft KeycloakVerificationError bei jedem Fehlschlag — der Aufrufer MUSS
 * daraus ein 401 machen und darf die Fehlermeldung nicht an den Client geben.
 */
export async function verifyKeycloakToken(token: string): Promise<VerifiedKeycloakIdentity> {
    const issuer = getPublicIssuer();
    const clientId = getExpectedClientId();

    let payload: KeycloakTokenPayload;

    try {
        const result = await jwtVerify<KeycloakTokenPayload>(token, getJwks(), {
            issuer,
            clockTolerance: CLOCK_TOLERANCE
        });
        payload = result.payload;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new KeycloakVerificationError(`Token-Verifikation fehlgeschlagen: ${message}`);
    }

    // ID Tokens sind zwar korrekt signiert, dienen aber nicht der API-Autorisierung.
    if (payload.typ === 'ID') {
        throw new KeycloakVerificationError('ID Token wurde als Access Token verwendet.');
    }

    if (!hasValidClientBinding(payload, clientId)) {
        throw new KeycloakVerificationError(`Token ist nicht an Client '${clientId}' gebunden.`);
    }

    if (!payload.sub) {
        throw new KeycloakVerificationError('Token enthält keinen sub-Claim.');
    }

    return {
        sub: payload.sub,
        roles: extractRoles(payload, clientId),
        issuer,
        clientId,
        expiresAt: payload.exp ?? 0,
        issuedAt: payload.iat ?? 0
    };
}
