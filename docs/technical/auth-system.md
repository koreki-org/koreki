---
title: "Authentifizierung & Benutzerverwaltung (Auth System)"
description: "Technisches Architektur-Dokument: Authentifizierung & Benutzerverwaltung (Auth System)"
author: "@principal_architect"
date: "2026-04-29"
last_updated: "2026-04-29"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Authentifizierung & Benutzerverwaltung (Auth System)

Koreki nutzt ein hybrides Authentifizierungsmodell, das je nach Deployment-Szenario zwischen **Logto (Cloud/SaaS)** und **Keycloak/Generic OIDC (Community Edition)** unterscheidet. Die Integration stellt sicher, dass Nutzer-Identitäten konsistent verwaltet werden, während die Systemarchitektur (DB vs. No-DB) flexibel bleibt.

---

## 1. Executive Summary & Kontext

Koreki nutzt **Logto** als zentralen Identity Provider (IDP). Die Integration erfolgt über das `@logto/next` SDK in Next.js und stellt eine nahtlose Verbindung zwischen der externen Authentifizierung und der internen Benutzerdatenbank (Prisma) her.

---

## 1. High-Level Architektur

Koreki verfolgt einen **Auto-Provisioning-Ansatz (JIT)**. Das bedeutet, dass Nutzerkonten in der lokalen Datenbank automatisch erstellt werden, sobald sich ein Nutzer erfolgreich über Logto anmeldet.

```mermaid
graph TD
    A[Nutzer / Browser] -->|1. Login / Register| B(Logto IDP)
    B -->|2. Callback| C[Koreki Backend]
    C -->|3. Get Claims| B
    C -->|4. M2M Role Sync| B
    C -->|5. JIT Provisioning / Sync| D[(Prisma Database)]
    D -->|6. Session Set| A
```

---

## 2. Der Login-Flow (OIDC)

Der Authentifizierungsprozess wird über eine dynamische Route abgewickelt, die alle Logto-Aktionen (SignIn, SignOut, Callback) zentralisiert.

### Sequenzdiagramm

```mermaid
sequenceDiagram
    participant U as Nutzer (Browser)
    participant K as Koreki (API)
    participant L as Logto Server (OIDC + M2M)
    participant DB as Prisma (User Table)

    U->>K: GET /api/logto/sign-in (oder sign-up)
    K-->>U: 302 Redirect to Logto (interactionMode check)
    U->>L: Login / Registrierung
    L-->>U: 302 Redirect to /api/logto/callback?code=...
    U->>K: GET /api/logto/callback
    K->>L: Token Exchange (Code -> JWT)
    L-->>K: User Claims (Id, Username)
    K-->>U: 302 Redirect to /app
    Note over U, DB: Erster App-Aufruf triggert JIT Sync
    U->>K: GET /api/user
    K->>L: M2M: Get Authoritative Roles
    L-->>K: Roles (Admin, User, etc.)
    K->>DB: UserService.ensureUserExists (Atomic Transaction)
    alt User neu (Provisioning)
        DB->>DB: Create User + Personal Workspace (20 Credits)
    else User vorhanden (Sync)
        DB->>DB: Update Profile & Authoritative Role
    end
    K->>DB: privacyLog.create (Audit Trail)
    K-->>U: User Context (Credits, AVV-Status, Role)
```

---

## 3. User-Synchronisierung & Provisioning

Koreki implementiert ein **Industrial Just-In-Time (JIT) Provisioning**. Der Nutzer existiert in der lokalen Datenbank erst, wenn er sich das erste Mal erfolgreich authentifiziert hat.

### Features:
- **Atomic Provisioning**: Die Erstellung des Nutzers, des persönlichen Workspaces und der Owner-Membership erfolgt in einer **Prisma-Transaktion**. Ein automatischer Catch-Block fängt Race-Conditions (P2002) ab, falls ein Nutzer mehrere Tabs gleichzeitig öffnet.
- **Personal Workspace & Start-Credits**: Jeder neue Nutzer erhält automatisch einen persönlichen Workspace mit **20 Start-Credits**.
- **Authoritative M2M Profile & Role Sync**: Da OIDC-Claims (Session-Daten) unvollständig oder veraltet sein können, nutzt Koreki die **Logto Management API (M2M)** als sekundäre, autoritative Quelle. Wenn Profil-Informationen (z.B. E-Mail/Name) in den Claims fehlen, werden diese direkt vom Logto-Server abgefragt und in der lokalen DB "geheilt". Dies stellt sicher, dass Rollenänderungen und Profil-Updates sofort wirksam werden.
- **Ghost-User Prevention**: Beim Aufruf von `/api/user` wird zusätzlich geprüft, ob der Nutzer im Logto-System noch existiert. Falls ein Admin einen Nutzer in Logto löscht, wird dessen Zugriff in Koreki blockiert, selbst wenn das Session-Cookie noch gültig ist.

---

## 4. Sicherheitsmechanismen (Pillar 8 Architecture)

### Unified Security Wrapper (`withSecurity`)
Alle API-Endpunkte sind mit dem zentralen Sicherheits-Wrapper geschützt. Dieser übernimmt konsequent:
1. **Authentifizierung**: Context-Check via Logto User Context.
2. **Rate-Limiting**: Schutz vor DoS (Traefik-IP-kompatibel via `req.ip`).
3. **Pillar 8 RBAC**: DB-authoritative Rollenprüfung (Source of Truth nach M2M-Sync).
4. **Char-Limits**: Durchsetzung der Prompt-Grenzwerte (10k/Seite).
5. **Audit Trail**: Jeder erfolgreiche Login wird als `SECURITY_EVENT: LOGIN_SUCCESS` im `PrivacyLog` mit IP-Adresse und Zeitstempel protokolliert.

```typescript
export default withSecurity(async (req, res) => {
    const { isAuthenticated, claims } = req.user;
    // Granulare Logik...
}, { requireAdmin: 'ORG' }); // Optionale Rollen-Sperre
```

### Force-HTTPS & Proxy Integrity
Hinter dem Traefik-Proxy wird das SDK durch die `baseUrl` zur Nutzung von HTTPS gezwungen. Die IP-Erkennung berücksichtigt die `x-forwarded-for` Listen.

---

## 5. Desktop Security (Native Vault)

In der Desktop-Umgebung (Tauri) speichert Koreki sensible Zugangsdaten (wie API-Keys für Mistral oder OpenAI) **niemals** im `localStorage` oder in den `Cookies` des Browsers. Stattdessen wird die native Verschlüsselung des jeweiligen Betriebssystems angesprochen (Industrial Grade Security).

### OS-Level Vault Integration (`keyring-rs` v2)
Die Desktop-App nutzt das Crate `keyring` (Version 2.3.3, da Version 3 standardmäßig nur nicht-persistente Session-Keys anlegt), um Schlüssel dauerhaft und hardwarenah gesichert zu speichern:
- **Windows:** Speicherung im `Windows Credential Manager` (unter "Generische Anmeldeinformationen" als `koreki-app:koreki-mistral-key`). Wird als `CRED_PERSIST_LOCAL_MACHINE` hinterlegt.
- **Linux (Ubuntu):** Speicherung über die `secret-service` D-Bus API (z.B. GNOME Keyring oder KWallet). Der Tresor wird durch das Login-Passwort des Benutzers ver- und entschlüsselt.
- **macOS:** Speicherung im nativen `Keychain` (Apple Keychain Services).

**Vorteil:** Die Schlüssel sind gegen Diebstahl aus dem Dateisystem oder Auslesen der lokalen Anwendungsdaten geschützt. Eine Extraktion ist nur mit administrativen Rechten oder dem OS-Passwort des Benutzers möglich.

---

## 6. Technische Referenz

| Komponente | Dateipfad | Aufgabe |
| :--- | :--- | :--- |
| **Konfiguration** | `src/lib/logto.ts` | Definition von Endpoint, App-ID und Scopes. |
| **M2M Logik** | `src/lib/logto-mgmt.ts` | Authoritative Abfrage von Profilen und Rollen. |
| **Auth-Handler** | `src/pages/api/logto/[action].ts` | Einstiegspunkt (sign-in, sign-up, sign-out, callback, forgot-password). |
| **Email-Dienst** | **SendGrid** | Versendet Verifizierungscodes und Password-Reset Links. |
| **User Service** | `src/lib/services/user-service.ts` | JIT Provisioning, Atomare Transaktionen, Sync-Logik. |
| **Sync-Endpoint** | `src/pages/api/user.ts` | Orchestriert Sync, Context-Rückgabe und Audit Logging. |
| **User-Management** | `src/pages/api/admin/users.ts` | Admin-Interface zur Verwaltung der lokalen User-Daten. |
| **Email-Dienst** | **SendGrid** | Versendet Verifizierungscodes und Password-Reset Links. |

---

## 7. Password Recovery & Email Integration (SendGrid) 📧🛡️

Seit V0.9.15 verfügt Koreki über eine integrierte Passwort-Wiederherstellung. 

### Architektur des Password-Resets:
1.  **Hosted Flow**: Der "Passwort vergessen"-Link leitet den Nutzer an Logto weiter (`interactionMode: 'forgot_password'`).
2.  **Mailing-Infrastruktur**: Koreki nutzt **SendGrid** als verifizierten SMTP-Relay. Die Domain `koreki.org` ist mittels DKIM, SPF und DMARC (Pillar 10 Hardening) bei Ionos autorisiert.
3.  **Hybrid-Identität**: Nutzer können sich wahlweise via **Username** oder **Email** anmelden. Passwörter können jedoch nur wiederhergestellt werden, wenn der Account mit einer verifizierten E-Mail verknüpft ist.
4.  **OTP-Verifizierung**: Statt unsicherer Links setzt Koreki auf 6-stellige **One-Time-Passwords (OTP)**, die direkt in der Logto-Maske eingegeben werden.

### Konfiguration (SaaS/On-Prem):
*   Der Mail-Versand wird über den Logto-Connector konfiguriert. 
*   Absenderadresse: `no-reply@koreki.org` (Industrial Standard).

---

## 8. Community Gatekeeper (Keycloak & Generic OIDC) 🛡️🗝️

Für die **Community Edition** (Self-Hosted) unterstützt Koreki eine alternative Authentifizierung via Keycloak oder andere OIDC-kompatible Provider.

### Architektur-Merkmale:
- **Stateless Gatekeeper**: Im Gegensatz zum SaaS-Modus benötigt die Community Edition für die Authentifizierung **keine serverseitige Datenbank**. Die Sitzung wird rein im Browser via `localStorage` verwaltet.
- **Identity Proxy**: Der Gatekeeper extrahiert Name und ID des Lehrers direkt aus dem OIDC-Token und stellt diese der App zur Verfügung.
- **Auto-Persistenz**: Experten-Prompts werden im Community-Modus automatisch auf dem Server-Dateisystem gespeichert, verknüpft mit der Keycloak-ID (siehe [Community Persistence](./community-edition-persistence.md)).
- **Settings Governance (Zahnrad-Schutz)**: In Multi-User-Umgebungen (z. B. Schulen) ist der Zugriff auf Systemeinstellungen (KI-Provider, API-Keys) rollenbasiert geschützt. Nur Nutzer mit der Admin-Rolle können das Einstellungs-Zahnrad und das Initial-Setup-Modal sehen.

### Konfiguration & Rollen:
Über die Umgebungsvariable `NEXT_PUBLIC_AUTH_TYPE=KEYCLOAK` wird der Logto-Pfad deaktiviert und die OIDC-Schleuse aktiviert.

- **Admin-Rolle**: Standardmäßig wird nach der Rolle `Admin` im Token gesucht. 
- **Flexibilität**: Über `NEXT_PUBLIC_ADMIN_ROLE_NAME` kann ein abweichender Rollenname (z. B. `koreki-admin` für Schulnetze) konfiguriert werden, um Konflikte mit bestehenden Rollen zu vermeiden.
- **Token-Mapping**: Keycloak muss so konfiguriert sein, dass Rollen im Claim `roles` (Plural) übertragen werden.

---

---

> [!TIP]
> Um einem Nutzer Admin-Rechte zu geben, muss dieser in der **Logto Console** (nicht in der Koreki-DB) der Rolle "Admin" zugewiesen werden. Die Synchronisation erfolgt beim nächsten Seitenaufruf automatisch.
