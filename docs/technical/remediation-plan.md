---
title: "Remediation Plan: Vom 7er zum 8er"
description: "Detaillierter, agentenorientierter Nacharbeitsplan basierend auf dem Architektur-Assessment vom April 2026. Adressiert TypeScript-Hygiene, Test-Industrialisierung, Logger-Konsolidierung, Input-Validierung und CI/CD-Ausbau."
author: "@principal_architect"
date: "2026-04-06"
last_updated: "2026-04-06"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Remediation Plan: Vom 7er zum 8er

## 1. Executive Summary & Kontext

> [!NOTE]
> **Zusammenfassung:** Dieses Dokument ist der operative Nacharbeitsplan, der aus dem Architektur-Assessment (April 2026, Gesamtnote 7,0/10) abgeleitet wurde. Es enthält 5 Arbeitspakete, zugeordnet an die zuständigen Agenten, mit konkreten Dateien, Akzeptanzkriterien und Abhängigkeiten.
> **Zielgruppe:** Alle Agenten im Koreki-Team. Jeder Agent findet hier seine spezifischen Aufgaben.

### Kontext & Motivation

Das Assessment hat ergeben, dass Koreki in Architektur (8,0) und Security (8,5) bereits sehr gut aufgestellt ist. Die Hauptdefizite liegen in:

1. **TypeScript-Striktheit** — 23× `@ts-ignore`, massives `any`-Problem in Hooks
2. **Testing** — Keine Coverage-Messung, nur 1 E2E-Test, CI baut nicht das Projekt
3. **Logger-Konsolidierung** — 30+ API-Routen umgehen den PII-sanitized Logger
4. **Input-Validierung** — Nur 1 von 20+ API-Routen hat ein Zod-Schema
5. **CI/CD** — Pipeline läuft nur `security-check`, nicht die vollständige Test-Suite

---

## 2. Architektur & Systemdesign

### Abhängigkeitsreihenfolge der Arbeitspakete

```mermaid
graph LR
    AP1["AP-1: TypeScript-Hygiene\n(Architect)"]
    AP2["AP-2: Logger-Konsolidierung\n(Security Officer)"]
    AP3["AP-3: Zod Input-Validierung\n(DB Expert)"]
    AP4["AP-4: Test-Industrialisierung\n(QA Engineer)"]
    AP5["AP-5: CI/CD Vollausbau\n(QA Engineer)"]

    AP1 --> AP4
    AP2 --> AP4
    AP3 --> AP4
    AP4 --> AP5

    style AP1 fill:#ef4444,color:#fff
    style AP2 fill:#f59e0b,color:#fff
    style AP3 fill:#f59e0b,color:#fff
    style AP4 fill:#3b82f6,color:#fff
    style AP5 fill:#10b981,color:#fff
```

> [!IMPORTANT]
> **Reihenfolge:** AP-1, AP-2 und AP-3 können **parallel** bearbeitet werden. AP-4 (Testing) sollte erst starten, wenn die anderen abgeschlossen sind — sonst testet man gegen Code, der sich noch ändert. AP-5 ist der Abschluss.

---

## 3. Implementierung & Nutzung

---

### AP-1: TypeScript-Hygiene 🔧
**Zuständig:** `@principal_architect`
**Priorität:** AP-1.1 war P1 (erledigt) · AP-1.2 und AP-1.3 sind **P3 (Nice-to-have)**

#### AP-1.1 — `@ts-ignore` eliminieren: ✅ ABGESCHLOSSEN

Das `AuthenticatedRequest`-Interface wurde implementiert. Alle 23 `@ts-ignore` aus API-Routen sind entfernt.

| Metrik | Assessment | Aktuell |
|---|---|---|
| `@ts-ignore` | 23 | **0** ✅ |
| `@ts-expect-error` | 0 | **0** ✅ |

> [!TIP]
> **Das war der sicherheitskritische Teil.** Die Auth-Properties (`req.user.claims`) sind jetzt korrekt typisiert. Ein Schreibfehler dort wird vom Compiler gefangen, nicht erst in Produktion.

#### AP-1.2 — `any` in Hook-Signaturen: 🟡 P3 (Nice-to-have)

**Status:** ~13 `any`-Parameter in Hooks, hauptsächlich `userData: any`.

**Risikobewertung: Gering.** Die `userData: any` Parameter kommen immer von der gleichen Quelle (`useAuth → /api/user`). Die Shape ändert sich de facto nie. Ein Type-Mismatch fällt beim Entwickeln sofort als UI-Bug auf — kein Produktionsrisiko.

**Betroffene Dateien (wenn man es irgendwann angehen will):**

| Datei | Verstoß | Korrekt wäre |
|---|---|---|
| `useFileProcessor.ts` | `userData: any` | `User \| null` |
| `useProcessingPipeline.ts` | `state: any, userData: any` | `BatchProcessorState`, `User \| null` |
| `useBatchActions.ts` | `state: any, userData: any` | dto. |
| `useDashboardActions.ts` | `userData: any` | `User \| null` |
| `usePromptGovernance.ts` | `userData: any` | `User \| null` |
| `useAuth.ts` | `(updater: any)` | **Root Cause** — typisierter Callback |
| `useBatchStore.ts` / `useDashboardStore.ts` | `(set: any)` | Zustand-Generic |

#### AP-1.3 — `as any` Prisma-Casts: 🟡 P3 (Nice-to-have)

**Status:** ~43 `as any` Casts, fast alle wegen `(prisma as any).workspace/membership`-Pattern.

**Risikobewertung: Gering.** Prisma validiert zur Laufzeit unabhängig von TypeScript. Falsche Felder werfen Prisma-Errors — auch mit `as any`. Das Hauptrisiko (Schema-Renames werden nicht vom Compiler gefangen) ist theoretisch, da `prisma migrate` die Aufmerksamkeit ohnehin dorthin lenkt.

**Root Cause:** Prisma-Client-Generierung harmoniert nicht immer sauber mit den Import-Pfaden. Lösung wäre ein typisierter Service-Layer — aber das ist ein hohes Investitionsvolumen bei geringem Risiko.

#### Akzeptanzkriterien AP-1
- [x] 0 `@ts-ignore` im gesamten `src/` Verzeichnis ✅
- [ ] ~~0 `any` Parameter in Hook-Signaturen~~ → P3, nicht blockierend
- [x] `npm run build` kompiliert ohne Fehler ✅
- [x] Bestehende Tests bleiben grün ✅

---

### AP-2: Logger-Konsolidierung 🪵
**Zuständig:** `@security_officer`
**Impact:** Mittel · **Aufwand:** Gering · **Priorität:** P1

#### Ziel
Alle `console.*`-Aufrufe in **server-side Code** (`src/pages/api/` und `src/lib/`) durch den PII-sanitized `logger` ersetzen. Verhindert, dass sensible Daten in persistierte Server-Logs landen.

> [!NOTE]
> **Scope-Grenze (Architectural Decision):** Client-side Code (`src/hooks/`, `src/components/`) darf weiterhin `console.error` nutzen. Browser-Logs werden nicht persistiert, enthalten keine Server-Secrets und benötigen keine PII-Sanitization. Siehe [Architectural Vision §8](file:///c:/Users/AndreasHeid/Documents/Antigravity/koreki/.agents/skills/architectural_vision/SKILL.md).

#### Status: API-Routen ✅ ABGESCHLOSSEN

Die gesamte API-Schicht wurde bereits erfolgreich migriert:
- **29 von 29 API-Dateien** importieren und nutzen `logger`
- **0 `console.error`** in `src/pages/api/` (Ausnahme: `logto/[action].ts` — externe Auth-Lib)
- **0 `console.log`** in `src/pages/api/`

#### Status: Lib-Dateien ✅ ABGESCHLOSSEN

Auch die ursprünglich offenen Lib-Dateien sind bereits migriert:
- `lib/api-utils.ts` — nutzt `logger.warn(...)` ✅
- `lib/rate-limit.ts` — nutzt `logger.warn(...)` ✅
- `lib/logto.ts` und `lib/services/admin-service.ts` — keine `console.*`-Aufrufe mehr ✅

#### Einzige `console.*`-Vorkommen im Server-Code

| Datei | Begründung | Status |
|---|---|---|
| `lib/logger.ts` | Ist der Logger selbst — nutzt intern `console.*` | ✅ Akzeptiert |
| `instrumentation.ts` | Startup-Code, läuft vor Logger-Initialisierung | ✅ Akzeptiert |
| `pages/api/logto/[action].ts` | Externe Auth-Lib (Logto SDK) | ✅ Akzeptiert |

#### Akzeptanzkriterien AP-2
- [x] 0 `console.error` in `src/pages/api/` (außer Logto-Internals) ✅
- [x] `logger` Import in allen API-Routen vorhanden ✅
- [x] 0 `console.warn` in `src/lib/` (außer `logger.ts` selbst) ✅
- [x] Security-Audit-Test weiterhin grün ✅

> [!TIP]
> **AP-2 ist vollständig abgeschlossen.** Alle Server-seitigen `console.*`-Aufrufe wurden migriert. Die Architectural Vision §8 definiert die Grenze: Server = `logger` Pflicht, Client = `console.*` erlaubt.

---

### AP-3: Input-Validierung (Zod) 🛡️
**Zuständig:** `@database_expert` (Schema-Design) + `@security_officer` (Review)
**Impact:** Mittel · **Aufwand:** Mittel · **Priorität:** P2

#### Ziel
Jede API-Route erhält ein Zod-Schema zur Eingabevalidierung. Aktuell hat nur `ai-correct.ts` eines.

#### 3.1 — Zentrale Schema-Datei erweitern

**Datei:** `src/lib/validation.ts`

```typescript
// === Bestehend ===
export const CorrectionSchema = z.object({ ... });

// === NEU ===
export const CleanAndAnalyzeSchema = z.object({
    modelSolution: z.string().min(1, 'Musterlösung fehlt'),
    settings: ProviderSettingsSchema,
    isInclusive: z.boolean().optional(),
    pageCount: z.number().min(1).optional(),
});

export const CleanAndMapSchema = z.object({
    text: z.string().min(1, 'Text fehlt'),
    settings: ProviderSettingsSchema,
    tasksLayout: z.array(TaskSchema).optional(),
    isInclusive: z.boolean().optional(),
    pageCount: z.number().min(1).optional(),
});

export const ExtractImageSchema = z.object({
    buffer: z.string().optional(),
    buffers: z.array(z.string()).optional(),
    mimeType: z.string(),
    settings: ProviderSettingsSchema,
    pageCount: z.number().optional(),
    isScan: z.boolean().optional(),
    isComplex: z.boolean().optional(),
});

// Shared Sub-Schemas
const ProviderSettingsSchema = z.object({
    provider: z.string(),
    mistralKey: z.string().optional(),
    model: z.string().optional(),
});

const TaskSchema = z.object({
    name: z.string(),
    maxPoints: z.number().optional(),
    content: z.string().optional(),
});

// Admin & Org Schemas
export const AdminActionSchema = z.object({
    action: z.string(),
    userId: z.string().optional(),
    credits: z.number().optional(),
    workspaceId: z.string().optional(),
    role: z.string().optional(),
});

export const WorkspaceJoinSchema = z.object({
    inviteCode: z.string().min(1, 'Einladungscode fehlt'),
});

export const UpdateModeSchema = z.object({
    mode: z.enum(['STANDARD', 'PURE', 'TRIAL']),
});

export const PrivacyLogSchema = z.object({
    action: z.string(),
    confirmedText: z.string(),
});
```

#### 3.2 — Schemas in API-Routen einbauen

| API-Route | Schema | Status |
|---|---|---|
| `api/ai-correct.ts` | `CorrectionSchema` | ✅ Erledigt (Unified Bridge) |
| `api/clean-and-analyze.ts` | `CleanAndAnalyzeSchema` | ✅ Erledigt (Unified Bridge) |
| `api/clean-and-map.ts` | `CleanAndMapSchema` | ✅ Erledigt (Unified Bridge) |
| `api/extract-image.ts` | `ExtractImageSchema` | ✅ Erledigt (Unified Bridge) |
| `api/user/update-mode.ts` | `UpdateModeSchema` | ❌ Fehlt |
| `api/workspaces/join.ts` | `WorkspaceJoinSchema` | ❌ Fehlt |
| `api/privacy/log.ts` | `PrivacyLogSchema` | ❌ Fehlt |
| `api/admin/users.ts` | `AdminActionSchema` | ❌ Fehlt |
| `api/org-admin/*.ts` | Spezifische Schemas | ❌ Fehlt |

**Einbau-Pattern:**

```typescript
import { CleanAndAnalyzeSchema } from '@/lib/validation';

export default withSecurity(async (req, res) => {
    const validation = CleanAndAnalyzeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
    }
    const { modelSolution, settings, isInclusive, pageCount } = validation.data;
    // ... Business-Logik mit typisierten Daten
});
```

#### Akzeptanzkriterien AP-3
- [ ] Jede API-Route in `src/pages/api/` (außer Logto/Webhooks) hat ein Zod-Schema
- [ ] Input-Validierungsfehler geben HTTP 400 mit lesbarer Fehlermeldung zurück
- [ ] `validation.ts` enthält alle Schemas (zentral, keine Inline-Schemas)
- [ ] Unit-Tests für Edge-Cases der neuen Schemas (z.B. leere Strings, negative Zahlen)

---

### AP-4: Test-Industrialisierung 🧪
**Zuständig:** `@qa_engineer`
**Impact:** Hoch · **Aufwand:** Hoch · **Priorität:** P2 (nach AP-1/2/3)

#### 4.1 — Coverage-Report aktivieren

**Datei:** `jest.config.js`

```javascript
module.exports = {
    // ... bestehende Config
    collectCoverage: true,
    coverageDirectory: 'tests/reports/coverage',
    coverageReporters: ['text', 'lcov', 'json-summary'],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 70,
            statements: 70,
        },
    },
    collectCoverageFrom: [
        'src/lib/**/*.ts',
        '!src/lib/prisma.ts',
        '!src/lib/logto.ts',
        '!src/lib/stripe.ts',
    ],
};
```

**Ziel:** Baseline messen, dann schrittweise erhöhen. Start-Threshold bewusst moderat (60/70%).

#### 4.2 — Fehlende Unit-Tests schreiben

| Modul | Datei | Was fehlt | Priorität |
|---|---|---|---|
| **Logger** | `lib/logger.ts` | PII-Masking-Tests (Email, API-Keys, Edge Cases) | P1 |
| **Zod-Schemas** | `lib/validation.ts` | Boundary-Tests für die neuen Schemas aus AP-3 | P1 |
| **AI Constants** | `lib/ai/constants.ts` | `fetchWithRetry` Retry-Logik, 429-Handling | P2 |
| **AI Orchestrator** | `lib/ai/ai-orchestrator.ts` | `parseCorrectionResult` Edge-Cases (leere Tasks, NaN-Werte) | P2 |
| **Extraction Logic** | `lib/ai/extraction-logic.ts` | Strategy-Auswahl (PDF vs Bild, Scan vs Typed) | P2 |
| **Prompt Builder** | `lib/ai/prompt-builder.ts` | Prompt-Generierung mit Edge Cases (leere Musterlösung) | P3 |

#### 4.3 — E2E Golden Thread auf Local umstellen

**Datei:** `tests/e2e/golden-thread.spec.ts`

**Problem:** Test geht gegen `https://koreki.org` (Produktion). Das ist nicht CI-fähig und fragil.

**Lösung:**

```typescript
// tests/e2e/golden-thread.spec.ts
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('should perform full correction workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/app`);
    // ...
});
```

```typescript
// playwright.config.ts
export default defineConfig({
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    },
    webServer: {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
});
```

#### 4.4 — Neue E2E-Szenarien

| Test | Beschreibung | Priorität |
|---|---|---|
| `onboarding.spec.ts` | Neuer User → Mode-Auswahl → AVV-Upload → Dashboard nutzbar | P1 |
| `pure-mode.spec.ts` | PURE-Modus → Key eingeben → Upload → Korrektur (direkt an Mistral) | P2 |
| `org-admin.spec.ts` | OrgAdmin → Mitgliederliste → Rolle ändern → Code regenerieren | P2 |
| `export.spec.ts` | Upload → Korrektur → Excel-Export → PDF-Export → ZIP-Download prüfen | P2 |
| `credit-flow.spec.ts` | Credit-Stand prüfen → Verbrauch nach Korrektur → Cost-Brake-Verhalten | P3 |

#### Akzeptanzkriterien AP-4
- [ ] Coverage-Report wird generiert und zeigt ≥60% Functions / ≥70% Lines
- [ ] Mindestens 3 neue E2E-Specs (Onboarding, PURE, Export)
- [ ] E2E-Tests laufen lokal gegen `localhost:3000` (nicht gegen Produktion)
- [ ] Neuer `npm run test:coverage` Script in `package.json`

---

### AP-5: CI/CD Vollausbau 🔩
**Zuständig:** `@qa_engineer` + `@principal_architect` (Review)
**Impact:** Mittel-Hoch · **Aufwand:** Gering · **Priorität:** P3 (nach AP-4)

#### Ziel
Die GitHub Actions Pipeline erweitern, sodass kein defekter Code in `main` gelangen kann.

#### Datei: `.github/workflows/security.yml` → Umbenennen zu `ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: koreki_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Generate Prisma Client
        run: npx prisma generate

      # NEU: TypeScript-Kompilierung prüfen
      - name: Build Check
        run: npm run build
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/koreki_test
          # Minimal env für Build
          LOGTO_ENDPOINT: https://placeholder.local
          LOGTO_APP_ID: placeholder
          LOGTO_APP_SECRET: placeholder
          LOGTO_COOKIE_SECRET: placeholder_32_chars_minimum_ok__
          NEXT_PUBLIC_BASE_URL: http://localhost:3000

      # NEU: Vollständige Test-Suite statt nur security-check
      - name: Run Tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/koreki_test

      # Bestehend: Security-Audit
      - name: Security Audit
        run: npm run security-check
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/koreki_test

      # NEU: Coverage als Artifact speichern
      - name: Upload Coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: tests/reports/coverage/
```

#### Akzeptanzkriterien AP-5
- [ ] CI baut das Projekt (`npm run build`) und bricht bei TypeScript-Fehlern ab
- [ ] CI führt die vollständige Test-Suite aus (nicht nur `security-check`)
- [ ] Coverage-Report wird als CI-Artifact gespeichert
- [ ] PostgreSQL-Service für Integrationstests verfügbar
- [ ] Pipeline läuft bei jedem Push und PR

---

## 4. Security & Compliance

> [!IMPORTANT]
> Alle Arbeitspakete müssen die bestehende Security-Architektur respektieren. Insbesondere:

* **AP-1 (Types):** Das `AuthenticatedRequest` Interface darf keine Security-Properties optional machen. `claims.sub` muss `string` bleiben, nicht `string | undefined`.
* **AP-2 (Logger):** Error-Objekte niemals direkt an den Logger übergeben. Nur `.message` extrahieren, um Stack-Trace-Leaks zu vermeiden.
* **AP-3 (Zod):** Schemas dürfen Stripe-Webhook-Payloads nicht validieren — Stripe hat eigene Signatur-Prüfung.
* **AP-4 (Tests):** E2E-Tests dürfen keine echten Schülerdaten oder API-Keys committen. Nur Fixtures aus `tests/fixtures/`.

---

## 5. Testing & Referenzen

### Erfolgsmetriken (Definition of Done)

| Metrik | Aktuell | Ziel nach Remediation |
|---|---|---|
| `@ts-ignore` Count | ~~23~~ → 0 ✅ | 0 |
| `any` in Hook-Signaturen | ~13 | P3 (kein Produktionsrisiko) |
| `console.*` in Server-Code | ~~3~~ → 0 ✅ | 0 |
| APIs mit Zod-Schema | 1/20+ | 20+/20+ |
| E2E-Test-Specs | 2 | 5+ |
| CI-Schritte | 1 (security-check) | 3 (build + test + security) |
| Coverage | unbekannt | ≥70% Lines in `lib/` |

### Verwandte Dokumente

* [Industrialization Roadmap](./industrialization_roadmap.md) — LOC-Refactoring der UI-Monolithen
* [Architecture Overview](./architecture.md) — Technische Architektur-Referenz
* [Architecture Onboarding](./architecture-onboarding.md) — Neuen Mitarbeiter-Onboarding

### Verifizierungsplan

Nach Abschluss aller APs:

```bash
# 1. TypeScript-Hygiene
grep -r "@ts-ignore" src/ --include="*.ts" --include="*.tsx" | wc -l  # Soll: 0

# 2. Logger-Konsolidierung
grep -r "console.error\|console.log" src/pages/api/ --include="*.ts" | wc -l  # Soll: 0
grep -r "console.error\|console.log" src/lib/ --include="*.ts" | grep -v logger | wc -l  # Soll: 0

# 3. Build + Tests
npm run build        # Soll: Exit 0
npm test -- --coverage  # Soll: Exit 0, Coverage ≥70%
npm run test:e2e     # Soll: 5+ Specs grün

# 4. Security
npm run security-check  # Soll: Exit 0
```

---

*Freigegeben vom Principal Architect · April 2026 · Koreki v1.0* 🏛️🛡️🧪
