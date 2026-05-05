---
title: "Teststrategie: Industrial Grade Stabilität 🛡️🦅"
description: "Koreki Dokumentation: Teststrategie: Industrial Grade Stabilität 🛡️🦅"
author: "@qa_engineer"
date: "2026-04-23"
last_updated: "2026-04-23"
status: "Approved"
domain: "operations"
security_classification: "Public"
---

# Teststrategie: Industrial Grade Stabilität 🛡️🦅

## 1. Executive Summary & Kontext

Dieses Dokument beschreibt den architektonischen Ansatz für das Testing bei Koreki. Wir verfolgen eine mehrschichtige Strategie, um sicherzustellen, dass die Plattform robust, wartbar und resistent gegen Regressionen ist.

## 1. Die 3-Schicht-Architektur 🏗️

### Layer 1: Logik-Rüstung (Unit Testing)
- **Ziel**: Schrittweise Erhöhung der Abdeckung in `src/lib/` auf 80%+.
- **Fokus**: Pure Functions, mathematische Berechnungen (Noten, Punkte), Billing-Logik und Daten-Orchestrierung.
- **Status**: **Solide Basis erreicht** – Kernmodule wie `logic.ts`, `utils.ts`, `validation.ts` sind bei 96–100%.
- **Abgedeckte Module**: KI-Korrektur-Logik, PDF/Excel-Exporte, Credit-Berechnungen, Task-Splitting.
- **Bekannte Lücken**: `file-utils.ts` (PDF-Extraktion) hat niedrige Coverage – schwer unit-testbar (PDF-Worker), gehört konzeptionell eher in Layer 3.

### Layer 2: Stahldrähte / Steel Threads (Integration Testing)
- **Ziel**: Absicherung der geschäftskritischen "Workflow-Funnels" (Steel Threads).
- **Fokus**: Zusammenspiel der Komponenten, DOM-Events und asynchrones State-Management.
- **Status**: **3 von 3 Stahldrähten implementiert**.
    - [x] **Draht A (Workflow-Orchestrierung)**: Dashboard -> Korrektur starten -> Datenschutz-Modal bestätigt -> Prozess-Start. 🛡️
    - [x] **Draht B (Korrektur-Loop)**: KI-Ergebnis trifft ein -> User editiert Punkte -> Noten/Punkte aktualisieren sich visuell. 🛠️
    - [x] **Draht C (Export-Kette)**: Sitzungsergebnisse vorhanden -> Export getriggert -> Browser-Download verifiziert. 📊

### Layer 3: End-to-End (E2E Testing)
- **Ziel**: Reale Browser-Verifizierung des gesamten Anwendungs-Deployments.
- **Fokus**: Öffentliche Seiten (Zone A: 9 Tests, 36 Checks), Authentifizierungs-Flow (Zone B).
- **Tooling**: Antigravity `browser_subagent` gegen Live-Deployment (kein lokaler Server nötig).
- **Status**: **Zone A implementiert** — auslösbar via `/layer3-smoke` Workflow.
- **Siehe**: `.agents/workflows/layer3-smoke.md`

---

## 2. Werkzeuge & Infrastruktur 🛠️

- **Test-Runner**: Jest (konfiguriert mit JS-DOM für Layer 2).
- **UI-Interaktion**: `@testing-library/react`.
- **Daten-Versorgung**: `src/test/factories.ts` liefert schlanke, typsichere Mock-Daten für alle Layer.
- **Mocks**: 
  - `fetch`: Global gemockt, um API-Orchestrierung zu verifizieren.
  - `Prisma`: Datenbank-Interaktionen werden über `$transaction`-Patterns simuliert.
  - `Browser APIs`: Blobs, URLs und Timer werden in der Testumgebung vollständig kontrolliert.
  - `pdfjs-dist`: Global gemockt in `jest.setup.js`, um ESM-Inkompatibilitäten zu umgehen.
- **Coverage-Gate** (`jest.config.js`):
  - Statements/Lines/Functions: **70%** (Realistisches Minimum)
  - Branches: **50%** (Wegen vieler Infrastruktur-Branches in AI-Orchestrierung)
  - Ausgenommene Module: `prisma.ts`, `logto.ts`, `logto-mgmt.ts`, `stripe.ts` (Infrastruktur-Glue, nicht sinnvoll unit-testbar)

---

## 3. Aktueller Fortschritt (Audit 30.03.2026) 📊

| Ebene | Ziel | Aktuell | Status |
| :--- | :--- | :--- | :--- |
| **Layer 1 Coverage** | 80%+ | **~78%** (ohne Infra-Module) | 🟡 Solide Basis – Lücken identifiziert |
| **Layer 2 Stahldrähte** | 3 / 3 | **3 / 3** | ✅ Architektur-Lebenszyklus vollständig abgesichert |
| **Build-Status** | 260+ / 260+ | **100% GREEN** | 🟢 Alle Tests bestehen zuverlässig |
| **Coverage-Gate** | Enforce | **Aktiv** | ✅ Build bricht bei Regression unter 70% |

### Top-Module (Coverage)
| Modul | Statements | Bewertung |
|:---|:---|:---|
| `logic.ts` | 96,5% | ⭐ Vorbildlich |
| `utils.ts` | 100% | ⭐ Vorbildlich |
| `validation.ts` | 100% | ⭐ Vorbildlich |
| `billing-utils.ts` | 95% | ⭐ Stark |
| `api-utils.ts` | 94% | ⭐ Stark |
| `excel.ts` | 93% | ✅ Gut |
| `ai-logic.ts` | 81% | ✅ Gut |
| `task-utils.ts` | 97% | ⭐ Vorbildlich |

### Bekannte Lücken
| Modul | Coverage | Grund |
|:---|:---|:---|
| `file-utils.ts` | 15% | PDF-Worker-API schwer mockbar, gehört in Layer 3 |
| `rate-limit.ts` | 76% | Cleanup-/Expiry-Logik untestet |

## 4. Wie man beiträgt
1. **Neue Logik?** Erstelle eine `.test.ts` in `__tests__` und halte das Coverage-Gate ein.
2. **Neues Feature?** Prüfe, ob es ein neuer "Stahldraht" ist. Wenn ja, füge einen Integrationstest in der `BatchProcessor.test.tsx` hinzu.
3. **Bugfix?** Füge immer erst einen Regressionstest in der entsprechenden Schicht hinzu, bevor du den Fix pushst.

> [!IMPORTANT]
> **Industrial Grade** bedeutet: Wir testen nicht nur Code, sondern wir **"verifizieren Verhalten"**. Coverage ist eine Metrik, aber die "Stahldrähte" sind unsere eigentliche Versicherungspolice. Die Coverage-Zahlen in der Dokumentation müssen den tatsächlichen Stand widerspiegeln – Ehrlichkeit vor Schönfärberei.


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
