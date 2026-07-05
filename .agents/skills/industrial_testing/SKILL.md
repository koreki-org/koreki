---
name: Industrial Testing
description: Standards für Layer 1 (Unit) & Layer 2 (Integration) Testing (Industrial Grade)
---

# Skill: Industrial-Grade Testing (Layer 1 & 2) 🧪🛡️🚀

Dieses Dokument definiert den Standard für die technische Verifizierung der Koreki-Plattform. Es ist die zentrale Referenz für Unit- und Integrationstests.

## 1. Layer 1: Unit Verification (Atomic Logic)
Jede isolierte Logik muss zwingend durch Unit-Tests abgesichert sein.

- **Unit-First Protocol**: Logik wird in `src/lib/` als reine Funktion (Pure Function) extrahiert und in `tests/unit/` getestet, bevor sie in Hooks oder Komponenten zum Einsatz kommt.
- **Hook-Math Testing**: Mathematische Transformationen (z.B. Koordinaten-Mapping in der Redaction-Engine) werden isoliert via `@testing-library/react-hooks` validiert.
- **Security Audit Check**: Automatisierter Scan aller API-Routen auf Auth-Wrapper und No-Bypass-Patterns (`tests/unit/security-audit.test.ts`).

## 2. Layer 2: Integration Verification (Steel Threads)
Validierung des Zusammenspiels mehrerer Module und Services.

- **Service-Transaction Testing**: Validierung atomarer Domain-Operationen (z.B. `AdminService`) gegen gemockte Datenbank-States.
- **Organization Isolation**: Sicherstellung der Mandantentrennung auf API-Ebene (`tests/integration/Multitenancy.test.ts`).
- **Compliance Gating**: Prüfung der Triage-Logik für AVV-Uploads und Datenschutz-Bestätigungen.

## 3. Industrial Mocking Strategy ⚙️
Standards für deterministische Tests in einer komplexen Browser/Cloud-Umgebung.

- **Browser APIs**: Nutze dedizierte Mocks für `window.location`, `canvas`, `URL.createObjectURL` und andere Browser-only APIs.
- **Act() Discipline**: Jeder State-changing Interaction muss in einem eigenen `act()` Block gekapselt sein, um deterministische State-Propagierung zu garantieren.
- **Functional State Updates**: Teste gezielt auf Race Conditions, indem Hooks mit schnellen, aufeinanderfolgenden Eingaben konfrontiert werden.

- **Isolation**: Jeder Test-Case muss den Global-State (Mocks, Timeouts) im `afterEach` bereinigen.

## 5. Security & Fairness Verification (Pillar 1-5) 🛡️⚖️
Die neue Sicherheitsarchitektur muss explizit in den Test-Suiten abgebildet sein:

- **Rate-Limit Verification**: Integration-Tests zur Simulation von API-Spamming. Prüfung auf den `429 Too Many Requests` Statuscode.
- **Audit-Log Integrity**: Verifizierung, dass sicherheitskritische Operationen (z.B. Auth-Fehler) einen korrekten Eintrag in der `PrivacyLog` Tabelle erzeugen.
- **Resource Fairness (Pillar 5)**: Unit-Tests für den `withSecurity` Wrapper. Prüfung, ob `text.length > pageCount * 1000` zuverlässig blockiert wird.
- **Log-Masking Test**: Prüfung des `logger.ts` via Spies/Mocks, um sicherzustellen, dass E-Mails und Keys in der Konsole unkenntlich gemacht werden.

## 6. AI Integrity & Error Validation (Industrial Grade) 🤖🛡️
Mit dem "KI-First" Paradigma müssen Tests die Integrität der KI-Antworten validieren:

- **Strict Mapping Verification**: Prüfung der `internalProcessMapping` Logik auf deterministische Zuordnung bei exakten Namens-Treffern.
- **Confidence Brake Test**: Automatisierte Verifizierung, dass strukturelle AI-Fehler (Namens-Mismatch) zuverlässig eine `overallConfidence` von 0 und eine sichtbare Fehlermeldung triggern.
- **Hyphenation & Spacing Integrity**: Regression-Tests für die PDF-Extraktion (`file-utils.ts`), die sicherstellen, dass Wortgrenzen nach Refactorings erhalten bleiben.

## 7. Platform Isolation & Multi-Platform Testing (Industrial Grade) 🌐🛡️
Da Koreki sowohl als SaaS (Web) als auch als Desktop-App (Tauri) existiert, müssen Tests plattform-unabhängig funktionieren:

- **Environment Isolation**: Tests laufen standardmäßig im **SaaS-Modus**. Lokale Einstellungen in `.env.local` (z.B. `NEXT_PUBLIC_KOREKI_DESKTOP=true`) werden im globalen `jest.setup.js` neutralisiert, um "False Positives" zu verhindern.
- **Deterministic Switching**: Zur gezielten Verifizierung der Desktop-Logik muss die Umgebung explizit gesetzt werden:
  `cross-env KOREKI_TEST_PLATFORM=desktop npm test`
- **Unit Isolation**: Unit-Tests für plattform-unabhängige Logik (z.B. `pdf.ts`) MÜSSEN `isDesktopMode` lokal mocken, um unabhängig von globalen Flags deterministisch zu bleiben.

---
*Status: Approved (V4)*

