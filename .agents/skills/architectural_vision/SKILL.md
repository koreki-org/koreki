---
name: Architectural Vision
description: Strategische Leitplanken für die technische Evolution von Koreki
---

# Skill: Architectural Vision & Principles

Dieses Dokument definiert die strategischen Leitplanken für die technische Evolution von Koreki. Jede signifikante Architekturänderung muss an diesen Prinzipien gemessen werden.

## 1. Micro-Modularity & API-Paradigma
Jede neue Funktion muss als unabhängiges Modul konzipiert sein. Die Kommunikation zwischen Client und Server erfolgt strikt über definierte Paradigmen (Next.js Server Actions für Mutations, klassische API Routes für externe Webhooks/Edge-Fälle). Die Geschäftslogik in `src/lib/logic.ts` und `src/lib/ai-logic.ts` ist strikt von der UI (`src/components`) getrennt zu halten.

## 2. Stateless Core & Hybrid Sync
Koreki arbeitet primär zustandslos im Browser (`Local-First`). Die Persistenz erfolgt über drei Wege:
- **Cloud (Prisma)**: Für nutzerübergreifende Daten (Credits, User, Privacy).
- **File-Sync (.koreki)**: Für den Transport ganzer Korrektur-Sitzungen ohne Server-Interdependenz.
- **Volatile In-Memory (Zustand)**: Kritische Schülerdaten (Texte, Uploads) leben im Dashboard ausschließlich flüchtig im RAM (`zustand`), um clientseitiges Routing (z. B. von `/app` nach `/admin`) zu überstehen. Aus DSGVO- und Security-Gründen dürfen diese Daten *niemals* in den `localStorage` persistiert werden. Ein harten F5-Refresh löscht diese Daten stets by-design ("Fidelity Guard").

## 3. High-Performance AI Pipeline
- **Latency Optimization**: Nutze kombinierte Prompts (Cleaning + Analyse), um LLM-Anrufe zu minimieren.
- **Failover Logic**: Implementiere sauberes Error-Handling und Retry-Strategien für asynchrone KI-Jobs.
- **High-Fidelity Parsing**: Die PDF-Extraktion muss aktiv Wortgrenzen rekonstruieren und Zeilentrennstriche entfernen, um semantische Integrität vor der KI-Verarbeitung zu garantieren.
- **Core-Overlay Prompt Architecture**: Prompts folgen einer strikten Hierarchie: 
    1. **System-Leitplanken** (JSON-Integrität/Mathe-Präzision) sind unantastbar. 
    2. **Pädagogischer Core** (Semantische Kulanz) schützt vor sprachlicher Pedanterie. 
    3. **Lehrer-Spezialisierung** ist ein **Ergänzungs-Overlay**, kein Override für System-Rules.


## 4. Scalable Multi-Tenancy (RBAC Hardened)
Sicherheit beginnt in der Datenbank. Jede Query muss zwingend auf die `organization_id` filtern. Es darf keine globalen Listenabfragen geben, die potenziell Daten dritter Organisationen exponieren.
- **Role Isolation**: Trenne strikt zwischen globalen Administratoren (SysAdmin) und lokalen Geschäftsstellen-Administratoren (OrgAdmin).

## 5. Open Source Readiness (Zero-Ops Maintenance)
Vermeide proprietäre Vendor-Locks, die eine Selbst-Hosting-Fähigkeit verhindern könnten. Alle Integrationspunkte (Stripe, Logto, Mistral) müssen konfigurierbar bleiben.
- **Automated Hygiene**: Pflege-Tasks (Cleaning, Backups) müssen Teil der App-Infrastruktur sein.

## 6. Industrial Quality Assurance
Die technische Verifizierung der Architektur folgt dem Prinzip **"Logic in Lib, State in Hook"**.
1. **Separation of Concerns**: Massive Berechnungen oder Daten-Transformationen dürfen nicht direkt in Hooks stattfinden. Sie müssen als Pure Functions in `src/lib/` isoliert werden.
2. **Industrial Testing**: Die technische Ausführung von Unit- (Layer 1) und Integrationstests (Layer 2) ist im zentralen Skill [Industrial Testing](file:///.agents/skills/industrial_testing/SKILL.md) definiert.
3. **E2E Automation (Layer 3)**: Kritische User Journeys müssen durch Playwright-Tests (Layer 3) validiert werden, wie im Skill [Playwright Pro](file:///.agents/skills/playwright_pro/SKILL.md) beschrieben. Jede neue Core-Funktion muss diese Standards erfüllen.
4. **Thin Components**: Komponenten und Hooks dienen ausschließlich der Steuerung des Zustands und der UI-Reaktionen.
5. **End-to-End Type Propagation**: Types aus `src/types/index.ts` MÜSSEN bis in die Hook-Signaturen durchgezogen werden. Hooks dürfen keine `any`-Parameter akzeptieren — stattdessen sind konkrete Interfaces zu nutzen (z.B. `User | null`, `BatchFile[]`, `AppSettings`). Die Type-Kette `types/ → hooks/ → components/` darf nirgends durch `any` unterbrochen werden.

## 7. TypeScript-Striktheit (Zero-Tolerance Policy)
TypeScript ist keine optionale Absicherung, sondern die **primäre Verteidigungslinie** gegen Runtime-Fehler.
- **Build-Strictness AKTIV**: `next.config.js` → `typescript.ignoreBuildErrors: false`. Das bedeutet: **Jeder TypeScript-Fehler bricht den Build und die CI-Pipeline.** Neue Fehler MÜSSEN sofort behoben werden — nicht per `@ts-ignore` umgangen.
- **Zero `@ts-ignore`**: Verboten in Produktivcode. Wenn der Compiler sich beschwert, muss das Type-System repariert werden — nicht umgangen. Für externe Libraries ohne Types ist `@ts-expect-error` mit Begründung akzeptabel.
- **Zero `any` in Schnittstellen**: Funktions-Signaturen, Hook-Parameter und Return-Types dürfen kein `any` enthalten. Ausnahmen nur mit explizitem `// ARCH: any required because [Begründung]` Kommentar.
- **`AuthenticatedRequest` Pattern**: API-Routen, die durch `withSecurity()` geschützt sind, MÜSSEN das typisierte `AuthenticatedRequest` Interface verwenden, das `req.user.claims` korrekt typisiert. Kein `@ts-ignore` für Auth-Properties.
- **Zod-Schema ↔ Types Synchronisation**: Wenn ein neues Feld in `src/types/index.ts` hinzugefügt wird, MUSS das korrespondierende Zod-Schema in `src/lib/validation.ts` ebenfalls aktualisiert werden (und umgekehrt). Desynchronisation zwischen Zod und TS-Types ist die häufigste Fehlerquelle.

## 8. Defensive API-Hygiene
Jede API-Route ist eine Angriffsfläche. Zwei Regeln machen sie sicher:
- **Zod-Validation-Gate**: Jede API-Route MUSS ihren Input via Zod-Schema validieren (zentral in `src/lib/validation.ts`). Unkvalidierter `req.body`-Zugriff ist verboten. Einzige Ausnahme: Stripe-Webhooks (eigene Signaturprüfung).
- **Logger-Pflicht (Server-Boundary)**: In **server-side Code** (`src/pages/api/` und `src/lib/`) ist die direkte Nutzung von `console.log/warn/error` verboten. Stattdessen MUSS der PII-sanitized `logger` aus `src/lib/logger.ts` verwendet werden. Begründung: Server-Logs werden persistiert und können Stack Traces mit DB-URLs, Keys oder Nutzerdaten leaken. **Client-side Code** (`src/hooks/`, `src/components/`) darf weiterhin `console.error` nutzen — Browser-Logs werden nicht persistiert und enthalten keine Server-Secrets. Ausnahmen: `instrumentation.ts` (Startup vor Logger-Init) und `logto/[action].ts` (externe Auth-Lib).

## 9. Infrastructure Context (Production)
Koreki ist für den Betrieb in einer **Container-Native Cloud-Umgebung** optimiert:
- **Hosting**: IONOS VPS (Bare-Metal/Docker).
- **Orchestrierung**: Coolify (Self-Hosted PaaS).
- **Reverse Proxy**: Traefik (Automated TLS & IP-Forwarding).
- **Authentication**: Logto (Unified Auth Proxy).
- **DB**: PostgreSQL (Single-Instance in Docker).

### 💡 Force-HTTPS Architecture Rule
Hinter einem Reverse-Proxy (Traefik) MUSS die `baseUrl` im Logto SDK explizit auf `https://` gezwungen werden (via `NEXT_PUBLIC_BASE_URL`), da das SDK `TRUST_PROXY_HEADER` nicht ausliest. Nur dies garantiert fehlerfreie Redirects und Cookie-Zerstörung (Logout).

## 11. Isomorpher AI-Core (Unified Bridge)
Um die absolute Parität zwischen **PURE** (Client-side) und **STANDARD** (Server-side) Modus zu gewährleisten, nutzt Koreki einen isomorphen AI-Core (`src/lib/ai/mistral-provider.ts`).
- **Single Source of Truth**: Sämtliche KI-Logik (Modell-Mappings, Prompt-Templates, robustes JSON-Parsing) MUSS in dieser Bridge gekapselt sein.
- **Identische Qualität**: Ein Lehrer mit eigenem API-Key (PURE) erhält exakt die gleiche pädagogische Präzision wie ein Nutzer im STANDARD-Modus.
- **Privacy Enforcement**: Die Bridge entscheidet zur Laufzeit über den Transportweg (direkt zu Mistral vs. Koreki-API Proxy), ohne die Geschäftslogik zu duplizieren.

## 12. Industrial Identity Standard (JIT & M2M)
Koreki folgt einem "Strict Identity" Paradigma zur Vermeidung von Race-Conditions und inkonsistenten Nutzerzuständen:
- **JIT (Just-In-Time) Provisioning**: Nutzer werden erst beim ersten erfolgreichen Login atomar in einer Datenbank-Transaktion erstellt. Dies muss zwingend über den `UserService` erfolgen.
- **M2M Authoritative Sync**: Rollen (ADMIN/USER) werden bei jedem Login über die Logto Management API (M2M) abgeglichen. Die lokale DB ist nur ein Cache der M2M-Wahrheit.
- **Audit Requirement**: Jeder erfolgreiche Sync muss ein `SECURITY_EVENT: LOGIN_SUCCESS` im `PrivacyLog` triggern (Pillar 8 Compliance).

## 13. KI-First & Strict Data Integrity
Koreki folgt einem "KI-First" Paradigma, bei dem die Präzision durch Instruktions-Härtung (Prompt) statt durch Code-seitige Reparaturversuche erzwungen wird.
- **Instruction Hardening**: Nutze exakte Identifikatoren und Negativ-Beispiele im Prompt (z. B. "OHNE Zusätze").
- **Strict Validation**: Der Orchestrator agiert als strikter Validator (Equality Check `===`). Abweichungen führen zum "Confidence Brake" (Confidence auf 0), um einen manuellen Review zu erzwingen.
- **Unified Logic Paths**: Vermeide Code-Resundanz bei der Daten-Transformation durch zentrale interne Facades (z.B. `internalProcessMapping`).

## 14. Release-Audit Governance (Zero-Clutter Policy)
Um eine unübersichtliche Ordnerstruktur zu vermeiden, dürfen für einzelne Patches/Releases **keine separaten Audit-Dateien** im Repository angelegt werden.
- **Proaktive Verifizierung**: Bei der Begleitung von Releases MUSS der Architect die im Dokument `docs/operations/release-process.md` verankerte Checkliste (Geheimnisse, Versionen, Lizenzen) aktiv und eigenständig prüfen.
- **Verteilte Dokumentation**: Die Freigabe des Audits wird ausschließlich in Git-Commits, Pull-Request-Beschreibungen oder den GitHub-Release-Notes dokumentiert. Die Codebasis selbst bleibt frei von Release-spezifischen Audit-Dateien.

---
*Status: ARCHITECT APPROVED (V9 - ZERO-CLUTTER AUDIT GOVERNANCE)* 🏛️🛡️✅
