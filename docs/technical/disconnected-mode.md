---
title: "Konzept: Disconnected Mode (Offline Sandbox) 🔌🏗️"
description: "Technisches Architektur-Dokument: Konzept: Disconnected Mode (Offline Sandbox) 🔌🏗️"
author: "@principal_architect"
date: "2026-04-05"
last_updated: "2026-04-05"
status: "Draft"
domain: "technical"
security_classification: "Public"
---

# Konzept: Disconnected Mode (Offline Sandbox) 🔌🏗️

## 1. Executive Summary & Kontext

Dieses Dokument hält die Idee fest, Koreki lokal lauffähig zu machen, ohne dass eine externe Infrastruktur (Logto, Stripe, Postgres/Docker) vorhanden sein muss. Dies ist besonders wertvoll für Reisen, Ressourcenschonung und schnelles UI-Prototyping.

## 1. Das "Zero-Dependency" Ziel 🎯
Entwickler sollen in der Lage sein, das gesamte System mit nur `npm install` und `npm run dev` zu starten, indem alle externen Abhängigkeiten durch lokale Mocks ersetzt werden.

## 2. Die Mock-Strategie (Ebenen) 🎭

### A. Auth-Mocking (Logto Ersatz)
*   **Aktivierung**: `NEXT_PUBLIC_MOCK_AUTH=true`
*   **Technik**: Der `useAuth` Hook fragt nicht die `/api/user` ab, sondern liefert direkt ein statisches User-Objekt (`id: 'mock-123', role: 'ADMIN'`) zurück.
*   **Effekt**: Sofortiger Einstieg ins Dashboard ohne Logto-Account oder Redirect.

### B. Datenbank-Mocking (Postgres Ersatz)
*   **Aktivierung**: `MOCK_DATABASE=true`
*   **Technik**: Prisma nutzt eine **lokale SQLite-Datei** (`dev.db`). 
*   **Herausforderung**: Das `schema.prisma` muss so generiert sein, dass es mit SQLite kompatibel ist (z.B. Enums als Strings).
*   **Effekt**: Persistenz ohne Docker oder Cloud-Datenbank.

### C. Stripe-Mocking (Billing Ersatz)
*   **Aktivierung**: `MOCK_STRIPE=true`
*   **Technik**: API-Routne (z.B. `/api/billing/pure-deduct`) überspringen den Stripe-Aufruf und geben immer `status: 200` zurück.
*   **Effekt**: Testen von Credit-Abzügen und UI-Feedback ohne Stripe Test-Keys.

## 3. Playwright Integration 🏎️
GUI-Tests können in diesem Modus extrem schnell laufen, da sie:
1.  Keine Netzwerk-Latenz haben.
2.  Keine flakigen Logto-Redirects durchlaufen.
3.  Vollständig deterministisch sind (gleiche Daten bei jedem Start).

---

## 4. Warum wir es (noch) nicht umsetzen ⏳
*   **Wartungsaufwand**: Jedes neue Datenbank-Feature oder Auth-Property müsste im Mock-System gespiegelt werden.
*   **Environment Drift**: Es besteht die Gefahr, dass "Lokal alles grün" ist, aber im echten Deployment (Postgres/Logto) Fehler auftreten.
*   **Fokus**: Aktuelle Priorität liegt auf der **Industrial Grade Stabilität** der echten Schichten (Layer 1 & 2).

> [!NOTE]
> Dieses Konzept bleibt als "Architektur-Backlog" bestehen und kann reaktiviert werden, wenn die lokale Developer Experience (DevX) zum Flaschenhals wird.


---

## X. Security & Compliance (Mandatory for Industrial Grade)
> [!IMPORTANT]
> Keine Komponente ohne Security-Betrachtung. (TBD)

* **Datenverarbeitung:** TBD
* **Authentifizierung/Autorisierung:** TBD
* **Audit-Logs:** TBD

---

## Y. Testing & Referenzen
> [!WARNING]
> Verlinke hier zwingend auf zugehörige GitHub PRs, Tasks oder Architektur-Entscheidungen (ADR).

* **Verwandte Dokumente:** TBD
* **Test-Coverage:** TBD
* **Externe Referenzen:** TBD
