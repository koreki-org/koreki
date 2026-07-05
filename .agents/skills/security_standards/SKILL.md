---
name: Security & Data Privacy
description: Regulatorische und technische Sicherheitsrichtlinien für Koreki (Enterprise Standard)
---

# Skill: Security & Data Privacy Governance

Dieses Dokument definiert die verbindlichen Sicherheitsrichtlinien für Koreki. Es ist der Audit-Standard für den **Security Officer**.

## 1. DSGVO-Integrität & Datensparsamkeit
Jede schülerbezogene Datenverarbeitung muss unter Wahrung der **Datensparsamkeit** erfolgen. Nur Daten, die zwingend für die Korrektur notwendig sind, dürfen verarbeitet werden.

## 2. PII Identification & Cleaning (Redaction-First)
- **Anonymisierung**: Namen, Klassen und Schulen müssen entfernt werden, bevor sie an Cloud-LLMs gesendet werden.
- **Redaction-Policy**: Bei `isRedacted: true` MUSS zwingend der anonymisierte Bild-Abzug (`redactedDataUrl`) verwendet werden.

## 3. Defense-in-Depth Architektur (The 8 Pillars)

### Säule 1: In-Memory Rate Limiting (Kosten- & DDoS-Schutz)
- Alle API-Endpunkte sind durch einen lokalen Rate-Limiter (`rate-limiter-flexible`) geschützt.

### Säule 2: Technical Audit Logging
- Sicherheitskritische Ereignisse werden via `AuditService` in der Datenbank protokolliert.

### Säule 3: CI/CD Security Guard
- **Pre-Push Hook (Lokal)**: Jeder `git push` muss lokal durch Husky (`npm run security-check` & `tsc --noEmit`) validiert werden.
- **Pipeline (Remote)**: Der Build-Prozess erfordert das Bestehen des `security-check` Scripts. (Automatisiert via GitHub Actions).

### Säule 4: Logging Sanitization
- Konsolen-Logs werden automatisch von PII und Secrets bereinigt (`logger.ts`).

### Säule 5: Resource & Fairness Protection
- **Zeichenlimit**: Jede Schüler-Anfrage darf maximal **10.000 Zeichen pro Seite** enthalten (absolutes Cap bei **100.000 Zeichen**).

### Säule 6: Automated Data Retention (Zero-Ops)
- **Speicherbegrenzung**: Alle Einträge in `PrivacyLog`, die älter als **90 Tage** sind, werden automatisch löscht.
- **Vollautomatisierung**: Die Lösch-Routine ist über **Next.js Instrumentation** direkt in die Anwendung integriert (täglich 03:00 Uhr).

### Säule 7: AI Cost Brake (Budget-Schutz)
- Systemweite Kostenkontrolle via `SystemSettings` (Budget-Gate).

### Säule 8: DB-Authoritative RBAC (Double-Lock Role Policy)
- **Prinzip**: Autorisierung erfolgt ausschließlich gegen die Datenbank (`Source of Truth`), nicht gegen Token-Claims.
- **SysAdmin-Isolation**: Nur `User.role === 'ADMIN'` hat globalen Zugriff.
- **OrgAdmin-Isolation**: Aktionsberechtigung ist auf den `workspaceId` Kontext in der `Membership` Tabelle begrenzt. Orga-Verwalter haben keinen globalen God-Mode.

## 4. Zero-Trust API Architecture
- **withSecurity Wrapper**: Jede API-Route MUSS durch den `withSecurity` Wrapper geschützt sein.
- **Mandatentrennung**: In Prisma-Abfragen konsequent `workspaceId` nutzen.

---
*Status: Approved (V5)*
