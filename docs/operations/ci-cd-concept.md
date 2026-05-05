---
title: "🚀 Koreki CI/CD Blueprint (Industrial Grade)"
description: "Koreki Dokumentation: 🚀 Koreki CI/CD Blueprint (Industrial Grade)"
author: "@qa_engineer"
date: "2026-04-23"
last_updated: "2026-04-23"
status: "Approved"
domain: "operations"
security_classification: "Public"
---

# 🚀 Koreki CI/CD Blueprint (Industrial Grade)

## 1. Executive Summary & Kontext

Dieses Dokument beschreibt die Architektur der kontinuierlichen Integration (CI) und Bereitstellung (CD) für die Koreki-Plattform. Ziel ist es, die 100%ige Stabilität der Produktionsumgebung durch automatisierte Qualitätsschranken zu garantieren.

## 🏗️ Pipeline-Architektur (Mermaid)

```mermaid
graph TD
    A[👨‍💻 Local Push] -->|triggers| B(GitHub Actions Pipeline)
    
    subgraph "CI Phase (Validation)"
        B --> C[🔍 Linting & Type Check]
        C --> D[🧪 Unit & Integration Tests]
        D --> E[🏗️ Production Build Test]
    end
    
    subgraph "CD Phase (Deployment)"
        E -->|Success| F[🚀 Coolify Webhook Trigger]
        F --> G[🐳 VPS Docker Build & Start]
    end
    
    subgraph "Smoke Test (Verification)"
        G --> H[💨 E2E Layer 3 Smoke Test]
        H -->|Fail| I[🔴 Warning / Alert]
        H -->|Success| J[🟢 Production Stable]
    end

    D -->|Fail| K[🛑 Block Deployment]
    E -->|Fail| K
```

## 📋 Die 4 Phasen der Qualitätssicherung

### 1. Phase: Statische Analyse (Linting & Types)
*   **Werkzeuge**: `npm run lint`, `tsc --noEmit`
*   **Ziel**: Verhindert Syntaxfehler, nicht deklarierte Variablen und Typ-Inkompatibilitäten, bevor sie überhaupt gebaut werden.

### 2. Phase: Logik-Validierung (Unit & Integration)
*   **Werkzeuge**: `npm test` (Jest)
*   **Ziel**: Automatische Ausführung aller 260+ Tests in `tests/unit` und `tests/integration`. Diese Phase stellt sicher, dass Notenberechnungen, KI-Parsing und UI-Komponenten logisch einwandfrei bleiben.

### 3. Phase: Build-Verifizierung
*   **Werkzeug**: `npm run build`
*   **Ziel**: Bestätigt, dass keine Next.js spezifischen Fehler (z.B. falsche Routen, fehlende Server-Props) den produktiven Betrieb stören.

### 4. Phase: E2E Smoke Test (Layer 3)
*   **Werkzeug**: `npm run test:e2e` (Playwright)
*   **Ziel**: Wird **nach** dem Deployment ausgeführt. Verifiziert den „Golden Thread“ gegen die Live-URL. Dies ist die ultimative Bestätigung, dass die Seite für den Endkunden benutzbar ist.

## 🔐 Geheimnis-Management (GitHub Secrets)

Damit die Pipeline gegen die Produktion testen kann (Layer 3), müssen folgende Variablen sicher in den **GitHub Actions Secrets** hinterlegt werden:

| Secret Name | Zweck |
| :--- | :--- |
| `E2E_TEST_USER` | Der Test-Nutzer für den Login-Check. |
| `E2E_TEST_PASSWORD` | Das Passwort für den Test-Nutzer. |
| `MISTRAL_API_KEY` | Erforderlich für KI-Tests (falls Mocking deaktiviert). |
| `COOLIFY_WEBHOOK` | Die URL, die das eigentliche Deployment anstößt. |

## 🛡️ Schutzmechanismus: "Block on Failure"
In diesem Setup wird GitHub so konfiguriert, dass der **Webhook zu Coolify nur ausgelöst wird**, wenn alle CI-Phasen (1-3) mit einem grünen Exit-Code enden. Das verhindert, dass eine kaputte Version jemals die Nutzer erreicht.

---
*Status: Industrial Grade Concept Ready for Implementation*


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

* **Verwandte Dokumente:** [release-process.md](file:///c:/Users/AndreasHeid/Documents/Antigravity/koreki/docs/operations/release-process.md)
* **Test-Coverage:** TBD
* **Externe Referenzen:** TBD
