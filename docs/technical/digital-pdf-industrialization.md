---
title: "Digital PDF Industrialization & KI-First Integrity"
description: "Standard für die hochpräzise Extraktion digitaler PDFs und die KI-gestützte Datenintegrität."
author: "@principal_architect"
date: "2026-04-08"
last_updated: "2026-04-08"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Digital PDF Industrialization & KI-First Integrity

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Dieses Dokument definiert den technischen Standard für die Verarbeitung digitaler PDF-Dokumente in Koreki. Es adressiert das Problem der Wort-Fragmentierung und Zeilenumbruch-Problematik ("4 TB" vs "4T B").
> **Zielgruppe:** Entwickler (AI & Frontend), Architect.

Koreki muss Schülerabgaben mit mathematischer Präzision bewerten. Da PDF-Extraktoren oft semantische Informationen (Wortgrenzen, Silbentrennung) verlieren, wurde ein industrieller Rekonstruktions-Layer implementiert, der Text vor der KI-Verarbeitung säubert.

---

## 2. Architektur & Systemdesign

### Word-Boundary Reconstruction Layer
Der Extraktionsprozess in `file-utils.ts` nutzt drei Stufen zur Sicherstellung der Daten-Fidelity:

1. **Marked Content Enhancement**: Nutzung von `includeMarkedContent: true` zur Erfassung strukturierter PDF-Tags.
2. **Same-Line Merging**: Zusammenführung von Textfragmenten auf derselben Y-Achse, um künstliche Leerzeichen innerhalb von Fachbegriffen (z.B. "4 TB") zu verhindern.
3. **Hyphenation Recovery**: Intelligente Entfernung von Zeilentrennstrichen am Zeilenende, um Wörter wieder zusammenzuführen, bevor sie an die KI gesendet werden.

---

## 3. Implementierung: KI-First Data Integrity

Koreki folgt dem **KI-First** Prinzip. Anstatt unpräzise KI-Antworten durch heuristischen Code zu "reparieren", wird die Präzision durch Instruktions-Härtung erzwungen.

### A. Instruction Hardening (Prompt)
Jeder Mapping- oder Korrektur-Prompt MUSS den `KRITISCH (Namensformat)` Block enthalten:
- EXAKT-Vorgabe für Aufgabennamen.
- Verbot von Zusätzen (Punkte, Klammern).
- Fallback-Pflicht für unbeantwortete Aufgaben.

### B. Strict Validation (Code)
Im `ai-orchestrator.ts` wird die KI-Antwort strikt validiert:
```typescript
const aiTask = analysis.tasks.find(t => t.name === layoutTask.name); // Strikte Gleichheit
```

### C. The Confidence Brake
Falls die KI ein strukturelles Mismatch liefert (Name nicht gefunden), wird die `overallConfidence` des Dokuments sofort auf **0** gesetzt. Dies erzwingt die manuelle Prüfung durch den Lehrer ("Review empfohlen").

---

## 4. Security & Compliance
> [!IMPORTANT]
> Die PDF-Extraktion findet vollständig **clientseitig** (Isomorphic Bridge) statt. Es werden keine rohen PDF-Dateien für die Extraktion an Server-Endpunkte gesendet, sofern der Nutzer im PURE-Modus arbeitet.

* **Audit-Logs:** Mapping-Fehler werden im Browser-Log (`API response:`) für Debugging-Zwecke explizit ausgegeben.

---

## 5. Testing & Referenzen
* **Unit-Tests:** `tests/unit/pdf-extraction.test.ts` (Validierung von Spacing und Hyphenation).
* **Integration:** `useProcessingPipeline.ts` (Unified Mapping Facade).
* **Verwandte Dokumente:** [Technical Architecture](./architecture.md)

---
*Status: ARCHITECT APPROVED (V1 - INDUSTRIAL RELEASE)* 🏛️🛡️✅
