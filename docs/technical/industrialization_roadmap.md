---
title: "🗺️ Koreki Industrialization Roadmap: Die finale Säuberung"
description: "Technisches Architektur-Dokument: 🗺️ Koreki Industrialization Roadmap: Die finale Säuberung"
author: "@principal_architect"
date: "2026-04-05"
last_updated: "2026-04-05"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# 🗺️ Koreki Industrialization Roadmap: Die finale Säuberung

## 1. Executive Summary & Kontext

Dieses Dokument dient als strategischer Fahrplan für die restliche Dekonstruktion der Monolithen in Koreki. Ziel ist es, jede Datei auf unter 150 Zeilen zu bringen und eine strikte Trennung von UI und Logik (Facade-Pattern) zu erzwingen.

## 🏮 Übersicht der verbleibenden Monolithen (>200 LOC)

| Datei | Größe (LOC) | Aufgabe | Risiko | Prio |
| :--- | :--- | :--- | :--- | :--- |
| `RedactionModal.tsx` | 367 | Anonymisierungs-Engine (Canvas + PDF.js) | 🛑 Hoch | 1 |
| `features.tsx` | 301 | Feature-Übersicht & Landing-Logik | 🟢 Gering | 5 |
| `app.tsx` | 293 | Dashboard Master-Controller | 🛑 Hoch | 2 |
| `AVVUploadModal.tsx` | 242 | Rechtskonformitäts-Upload (Legal) | 🟡 Mittel | 3 |
| `AppHeader.tsx` | 237 | Navigation, Status & Credits | 🟡 Mittel | 4 |
| `api/admin/users.ts` | 237 | Backend Nutzerverwaltung & DB-Calls | 🟡 Mittel | 6 |
| `BatchProcessor.tsx` | 221 | Prozess-Orchestrierung | 🛑 Hoch | 1 |

---

## 🏗️ Kommende Stufen (Roadmap)

### Stufe 7: Dashboard Master Cleanup (`app.tsx`)
- **Ziel**: Den Haupt-Controller von UI-Zuständen befreien.
- **Strategie**: `useDashboardOrchestrator.ts` für Modal-Triage (Compliance-Gating) erstellen.
- **Nutzen**: Verhindert "White Screens" und Auth-Race-Conditions.

### Stufe 8: Privacy & Redaction Engine (`RedactionModal.tsx`)
- **Ziel**: Den 367-Zeilen Canvas-Monolithen zerschlagen.
- **Strategie**: `useRedactionEngine.ts` für die PDF-Mathematik extrahieren.
- **Nutzen**: Sicherstellung der DSGVO-Integrität durch präzise Schwärzung.

### Stufe 9: Global State & Status (`AppHeader.tsx`)
- **Ziel**: Den Header verschlanken.
- **Strategie**: `useGlobalStatus.ts` für Credits, Budgets und Profile extrahieren.
- **Nutzen**: Schnellere Ladezeiten und sauberere Navigation.

### Stufe 10: Legal & Compliance Automatisierung (`AVVUploadModal.tsx`)
- **Ziel**: Rechtsdokumente sauber handhaben.
- **Strategie**: `useLegalVault.ts` für AVV-Workflows erstellen.
- **Nutzen**: Rechtssicherheit für Schulen (Automatisierter Validierungsprozess).

---

## ✅ Status-Definition "Industrial Stable"
Eine Komponente gilt erst dann als industrialisiert, wenn:
1. Das UI weniger als 150 Zeilen umfasst.
2. Die gesamte Geschäftslogik in einem Facade-Hook liegt.
3. Der Code durch den automatisierten `security-audit.test.ts` Check läuft.
4. Alle kritischen Pfade (Upload, Korrektur, Export) unit-getestet sind.

---
*Erstellt am: 2026-04-03 - Bereit für die nächste Session.* 🏮🛡️🚀🏛️


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
