---
title: "Koreki Security Pillars: The Industrial Defense Standard"
description: "Definition der 9 industriellen Sicherheits-Säulen von Koreki für Enterprise-Stability und Datenschutz."
author: "@security_officer"
date: "2026-04-20"
last_updated: "2026-04-20"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Koreki Security Pillars: The Industrial Defense Standard

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Koreki folgt einer strukturierten "Pillar-Architektur", um Sicherheitsstandards konsistent über alle Komponenten hinweg durchzusetzen. Jede Säule adressiert eine spezifische Bedrohungskategorie.
> **Zielgruppe:** Security Officer, Architekten, Cloud-Operations.

Dieses Dokument dient als zentrale Referenz für die Sicherheits-Governance von Koreki. Es stellt sicher, dass sowohl die SaaS- als auch die Desktop-Variante (Tauri) den industriellen Anforderungen an Datenschutz und System-Integrität entsprechen.

---

## 2. Die 9 Sicherheits-Säulen

Die Sicherheitsarchitektur von Koreki ruht auf 9 identifizierten Säulen:

### Säule 1: In-Memory Rate Limiting
- **Ziel:** Schutz vor DDoS und Kosten-Explosionen.
- **Implementierung:** Alle API-Endpunkte nutzen `rate-limiter-flexible`.

### Säule 2: Technical Audit Logging
- **Ziel:** Nachvollziehbarkeit sicherheitskritischer Ereignisse.
- **Implementierung:** `AuditService` protokolliert Ereignisse (Login, Auth-Fehler, Anomalien) in die `PrivacyLog` Tabelle.

### Säule 3: CI/CD Security Guard
- **Ziel:** Schutz vor Regressionen in sicherheitskritischem Code.
- **Implementierung:** Automatisierte Security-Checks im Build-Prozess und Pre-Push Hooks.

### Säule 4: Logging Sanitization
- **Ziel:** Verhinderung von PII-Leaks in Logs.
- **Implementierung:** Der zentrale `logger.ts` bereinigt alle Ausgaben automatisch von E-Mails, API-Keys und Secrets.

### Säule 5: Resource & Fairness Protection
- **Ziel:** Stabiler Betrieb unter Last.
- **Implementierung:** Strikte Zeichenlimits pro Schüler-Request (10.000 Zeichen/Seite) verhindern Overflows und Ressourcen-Erschöpfung.

### Säule 6: Automated Data Retention
- **Ziel:** Einhaltung der Löschfristen (DSGVO).
- **Implementierung:** Automatische Löschung von Log-Einträgen, die älter als 90 Tage sind via Next.js Instrumentation.

### Säule 7: AI Cost Brake
- **Ziel:** Budgetkontrolle.
- **Implementierung:** Systemweite Limits für KI-Vorgänge pro Workspace.

### Säule 8: DB-Authoritative RBAC & Settings Governance
- **Ziel:** Schutz vor Privilege Escalation und unautorisierter Systemkonfiguration.
- **Implementierung:** 
    - Rollenprüfung erfolgt ausschließlich gegen die Datenbank (Source of Truth) oder verifizierte OIDC-Claims (Community).
    - **Settings Governance:** Systemkritische UI-Elemente (KI-Provider, API-Keys, Setup-Modals) sind durch einen Role-Guard geschützt. Nur Nutzer mit der Admin-Rolle (`ADMIN`) haben Zugriff auf diese Konfigurationen.
    - **Flexible Gating:** Unterstützung für anpassbare Admin-Rollennamen (via `NEXT_PUBLIC_ADMIN_ROLE_NAME`), um Sicherheitsstrukturen an lokale Gegebenheiten (z. B. Schulnetze) anzupassen.

### Säule 9: Network Isolation (Desktop Mode) 🛡️ [NEW]
- **Ziel:** Absoluter Schutz vor unbeabsichtigten Datenabflüssen im Desktop-Modus.
- **Implementierung:** 
    - Einführung eines **Centralized API Transport Guard** (` apiClient.ts`).
    - **Whitelist-Logik:** Im Desktop-Modus werden alle Calls zu `*.koreki.org` (SaaS) hart geblockt.
    - **Erlaubte Kanäle:** Nur lokale Netzwerke (Ollama), Localhost und die whitelisted Mistral API (PURE Mode) sind passierbar.
    - **Fail-Safe:** Erkennt der Client eine SaaS-URL im Desktop-Kontext, bricht der Request sofort mit einem `SecurityError` ab.

---

## 3. Implementierung & Nutzung

Im Desktop-Modus wird die Isolation automatisch durch den Hook `isDesktopMode()` gesteuert. Alle Entwickler MÜSSEN den `apiClient` verwenden:

```typescript
import { apiClient } from '@/lib/api-client';

// Sicher im Desktop-Mode (wird geblockt, wenn externe SaaS-URL)
const response = await apiClient.post('/api/some-action', data);
```

---

## 4. Security & Compliance (Industrial Grade)
> [!IMPORTANT]
> Pillar 9 stellt sicher, dass Koreki Desktop auch in sensiblen Hochsicherheitsumgebungen (z.B. Offline-Schulnetze) betrieben werden kann, ohne dass die Cloud-Identität von Koreki kompromittiert wird.

- **Datenverarbeitung:** In Pillar 9 werden IP-Adressen gegen eine Regex für private Netzwerke geprüft.
- **Audit-Logs:** Jeder Block-Vorgang durch Pillar 9 wird mit einem `NETWORK_ISOLATION_BREACH` Error in der Konsole geloggt.

---

## 5. Testing & Referenzen
* **Unit Tests:** `tests/unit/api-client.test.ts` verifiziert die Regelsätze von Pillar 9.
* **Architektur-Referenz:** [Architecture Document](./architecture.md)
* **Status:** Aktiv seit Version 1.0.1 (Desktop Build 7a1a4d).
