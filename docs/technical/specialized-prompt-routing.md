---
title: "Specialized Prompt Routing (V13)"
description: "Hierarchisches Prompt-Management zur Modell-spezifischen Optimierung via System/User Split"
author: "@principal_architect"
date: "2026-04-12"
last_updated: "2026-04-16"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Specialized Prompt Routing (V13)

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Dieses System ermöglicht es Koreki, für verschiedene KI-Modelle unterschiedliche Instruktions-Sätze (Prompts) zu verwenden, ohne den Quellcode zu verdoppeln. Es löst das Problem von "Modell-Inkompatibilitäten", bei denen Optimierungen für ein Modell (z.B. Gemma 4) negative Seiteneffekte bei anderen Modellen (z.B. Mistral Small) verursachen würden.
> **Zielgruppe:** @principal_architect, Core-Entwickler, QA.

Koreki verfolgt eine Multi-Modell-Strategie (Mistral SaaS & Ollama Local). Da jedes Modell unterschiedliche Stärken und Schwächen in der Befolgung von JSON-Formaten und Namens-Konventionen hat, entkoppelt das V10-Routing die Instruktionen von der Ausführungs-Logik.

---

## 2. Architektur & Systemdesign
Das System nutzt ein **Base + Override** Pattern:

```mermaid
graph TD
    A[Request Trigger] --> B{Prompt Resolver}
    B -- "Model matches 'gemma'" --> C[Specialized Gemma Template]
    B -- "Model matches 'mistral-small'" --> G[Mistral Small Template]
    B -- "Default / No Match" --> D[Base Template (Root)]
    C --> E[AI Provider (Ollama)]
    G --> E
    D --> F[AI Provider (Mistral/SaaS)]
    E --> G[Standardized JSON Output]
    F --> G
```

### Komponenten (Industrial Split Architecture):
* **Default Templates (`src/prompts/default/`):** Das globale Framework, unterteilt in `system.md` und `user.md`. Optimiert für Mistral Large (SaaS).
* **Specialized Templates (`src/prompts/specialized/`):** Modell-spezifische Klone (z.B. `/gemma4/`), die eigene `system.md` und `user.md` Dateien besitzen. Dies erlaubt die physische Trennung von modell-spezifischen JSON-Schranken vom globalen Standard.
* **Dispatcher (`prompt-builder.ts`):** Orchestriert die Auswahl des Templates und die Injektion der **VRE (Variable Rule Execution)** Parameter (Temperature/Top-P).
* **VRE-Binding:** Der Dispatcher bindet Sampling-Parameter direkt an den Prompt-Typ (z.B. Vision: T:0, Grading: T:0.7). Dies entkoppelt die Modell-Stabilität vom UI-Status.

---

## 3. Implementierung & Nutzung
Der Resolver prüft zur Laufzeit das gewählte Modell:

```typescript
function resolveTemplate(action: string, model?: string): string {
    const isGemma = model?.toLowerCase().includes('gemma');
    if (isGemma) return gemmaTemplates[action];
    
    const isMistralSmall = model?.toLowerCase().includes('mistral-small');
    if (isMistralSmall) return mistralSmallTemplates[action];

    return defaultTemplates[action];
}
```

> [!NOTE]
> **Optimierungspotenzial (Custom Models):**
> Ähnlich wie bei der Kontext-Eskalation greifen spezialisierte Mistral-Templates aktuell nur bei Modellen, die `mistral-small` im Namen tragen. Custom-Modelle (z.B. `mistral-nemo`) fallen auf die `defaultTemplates` zurück. Eine Erfassung aller `mistral`-Identifier wird für zukünftige Iterationen empfohlen.

### Härtungs-Maßnahmen:

#### A. Gemma 4 Spezialisierung
1. **Clean Identifiers:** Strikte Unterbindung von Punktangaben `(3 P)` in Aufgabennamen.
2. **No-Talk-Constraint:** Unterdrückung von Markdown-Rauschen (Backticks), um das native JSON-Parsing von Ollama nicht zu stören.

#### B. Mistral Small 3.2 Spezialisierung („OCR Fidelity“)
1. **Subtle Error Detection:** Explizite Instruktion zur Erkennung von „subtilen“ OCR-Fehlern (z.B. „Arpaden“ statt „anpassen“).
2. **(?) Marker Logic:** Automatisches Setzen des Unsicherheits-Markers hinter fehlerhaften Worten zur Unterstützung der Confidence-Brake.

#### C. Vision Siding & High-Precision Routing (V12)
1. **isComplex Siding:** Im SaaS-Modus werden Bild-Uploads (Scans von **Schüler- und Musterlösungen**) über das Flag `isComplex: true` priorisiert. Dies erzwingt die Nutzung von **Mistral Large Vision** anstatt der Standard-OCR.
2. **Robotic Protocol Integration:** Für Vision-Tasks wird das dedizierte `vision.md` Template (bzw. das hard-coded Backup in `prompt-builder.ts`) verwendet.
3. **Role Segregation:** Die Routing-Logik trennt Instruktionen (System) von Bilddaten (User), um die Befolgungs-Rate des "Robotic Writing Head" Protokolls zu maximieren.

---

## 4. Security & Compliance
* **Datenverarbeitung:** Das Routing selbst verarbeitet keine personenbezogenen Daten (PII). Es steuert lediglich die Instruktionen, die an die Schicht 5 (AI Provider) gesendet werden.
* **Fidelity:** Durch die Trennung wird sichergestellt, dass die strengen Datenschutz-Anweisungen (Cleaning-Rules) für jedes Modell optimal formuliert werden können.

---

## 5. Testing & Referenzen
* **Verwandte Dokumente:** [Architecture](./architecture.md), [Ollama Hardening](./ollama-integration-hardening.md)
* **Test-Coverage:** Die Routing-Logik ist durch Integrationstests in `ollama-logic.test.ts` abgedeckt (Prüfung, ob der korrekte Prompt-String generiert wird).
* **Entwicklungs-ADR:** Industrialization Phase V10.
