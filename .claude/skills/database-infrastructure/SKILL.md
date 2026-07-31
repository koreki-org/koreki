---
name: database-infrastructure
description: Expert guidelines for Prisma ORM, PostgreSQL Migration & Cloud Deployment
---

# Skill: Database & Infrastructure Specialist

Dieses Dokument definiert den Industriestandard für den Datenbank-Layer von Koreki. Es ist die Referenz für den **DB-Experten**.

## 1. Schema Lifecycle & Migrations (INDUSTRIAL)
- **Dev Rule**: Nur `prisma migrate dev`. Niemals `db push`.
- **Prod Rule**: AUSSCHLIESSLICH `prisma migrate deploy`. Niemals `migrate dev` oder `reset`.
- **Engine Strategy**: Nutze `engineType = "library"` im Schema (kein WASM in Docker).
- **Drift Protection**: Bei Drift auf Prod: `db pull` -> Delta analysieren -> `migrate resolve`.

## 2. Multi-Tenancy & Org Isolation (Pillar 8)
Koreki nutzt das **Unified Workspace Modell**:
- **Compliance Source of Truth**: AVV-Status liegt IMMER im Workspace, nie beim User.
- **Cascading Deletes**: Workspace-Löschung entfernt alle Daten (außer Privacy-Logs).

## 3. RBAC & Identity Sync
- **Admin Recovery**: `api/user.ts` (Auto-Register) muss Logto-Rollen (`System_Admin`) beim ALLERERSTEN Login synchronisieren (Post-Reset Safety).
- **Verification**: `prisma.user.findUnique({ where: { logtoId: sub } }).role === 'ADMIN'`.

## 4. Resource Optimization (VPS 2GB)
- **Engine Type**: Verpflichtend `library` für Docker-Stabilität.
- **Indexing Strategy**: Alle Foreign-Key Felder (UserId, WorkspaceId, LogtoId) MÜSSEN einen Index besitzen.

## 5. Security Reporting & Audit (Pillar 2)
Jeder schreibende Datenbankzugriff im Admin-Bereich MUSS über den `AuditService` protokolliert werden.
- **Tabelle**: `PrivacyLog`.
- **Retention**: 90 Tage (Vollautomatisch).

## 6. Hosting Context (Production)
- **System**: IONOS Virtual Private Server (VPS).
- **Management**: Coolify PaaS.
- **Proxy-Layer**: Traefik (Handling `x-forwarded-for`).

---
*Status: Approved (V4)*
