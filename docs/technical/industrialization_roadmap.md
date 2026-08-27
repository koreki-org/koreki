---
title: "🗺️ Koreki Industrialization Roadmap: Die finale Säuberung"
description: "Technisches Architektur-Dokument: 🗺️ Koreki Industrialization Roadmap: Die finale Säuberung"
author: "@principal_architect"
date: "2026-04-05"
last_updated: "2026-08-27"
status: "Deprecated"
domain: "technical"
security_classification: "Public"
---

# 🗺️ Koreki Industrialization Roadmap: Die finale Säuberung

> [!WARNING]
> **Historisches Dokument. Stand der Prüfung: 27.08.2026.**
> Dieser Fahrplan stammt vom 05.05.2026 und beschreibt einen Plan, nicht das System. Die geplanten Extraktionen sind umgesetzt — die Größenziele wurden überwiegend verfehlt, in zwei Fällen ins Gegenteil. Er ist als Absichtserklärung von damals zu lesen, nicht als Beschreibung von heute. Verbindlich sind stattdessen die Grenzen aus `tests/unit/file-size-governance.test.ts`.

## Prüfung vom 27.08.2026

**Umgesetzt:** Alle drei geplanten Hooks existieren — `useDashboardOrchestrator.ts` (Stufe 7), `useRedactionEngine.ts` (Stufe 8), `useGlobalStatus.ts` (Stufe 9).

**Größenziele:** Das Ziel „jede Datei unter 150 Zeilen" wurde aufgegeben. Maßgeblich sind heute 300 Zeilen für Komponenten, Hooks und Seiten sowie 500 für `lib/`, erzwungen durch einen Wächter-Test mit eingefrorenen Altlasten.

| Datei | damals | heute | |
|---|---|---|---|
| `RedactionModal.tsx` | 367 | 316 | geschrumpft, weiterhin über der Grenze |
| `features.tsx` | 301 | 346 | gewachsen |
| `app.tsx` | 293 | **488** | **um 195 Zeilen gewachsen** — trotz Extraktion des Orchestrators |
| `AVVUploadModal.tsx` | 242 | 152 | Ziel erreicht |
| `AppHeader.tsx` | 237 | verschoben nach `src/components/layout/` | |
| `api/admin/users.ts` | 237 | 94 | Ziel erreicht |
| `BatchProcessor.tsx` | 221 | 275 | gewachsen |

`app.tsx` ist der auffälligste Fall: Die Extraktion fand statt, die Datei wuchs trotzdem. Sie steht heute unter einer Ratsche bei 489 Zeilen und darf nur noch schrumpfen.

---

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
