---
title: "UI-Analyse: Status-Indikatoren Stapelverarbeitung"
description: "Analyse der visuellen Unterscheidbarkeit von importierten Schülerarbeiten im Batch-Modus."
author: "@ui_expert & @principal_architect"
date: "2026-04-27"
last_updated: "2026-04-27"
status: "Draft"
domain: "technical"
security_classification: "Internal"
---

# UI-Analyse: Status-Indikatoren Stapelverarbeitung

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Der Bericht analysiert ein UX-Problem in der Stapelverarbeitung, bei dem Anwender nicht klar unterscheiden können, ob eine Schülerarbeit bereits erfolgreich importiert (Text extrahiert) wurde oder noch auf diesen Schritt wartet.
> **Zielgruppe:** @product_manager, @ui_expert, Entwickler.

In Koreki erfolgt die Stapelverarbeitung in zwei Phasen: 
1. **Import/OCR:** Extraktion des Textes aus Dokumenten (PDF/Scan) oder Parsing aus Excel (Moodle).
2. **KI-Analyse:** Semantische Auswertung und Korrektur durch das Sprachmodell.

Aktuell verschmelzen diese Zustände visuell im Status `pending`.

---

## 2. Ist-Analyse
Die Untersuchung der Komponente `BatchFileListItem.tsx` zeigt:

*   **Checkbox-Zustand:** Solange ein Element im Status `pending` ist, zeigt es eine Checkbox auf der linken Seite. Dies gilt sowohl für frisch hochgeladene PDFs (vor OCR) als auch für fertig geparste Moodle-Einträge.
*   **Badge-Verhalten:** In `BatchItemStatusSummary.tsx` wird das "Digital ( Credits )"-Badge ausgeblendet, sobald `ocrDone === true` ist. Dies führt dazu, dass ein "fertiges" Element visuell *weniger* Informationen bietet als ein "unfertiges", anstatt den Erfolg positiv zu bestätigen.
*   **Icons:** Es fehlt ein dezidiertes Icon für den Zustand "Text erfolgreich extrahiert, bereit für KI".

---

## 3. Empfohlene Maßnahmen (@ui_expert)

### 3.1 Eindeutige Status-Visualisierung
Wir sollten ein neues Icon-Mapping einführen, um die "Bereitschaft" zu signalisieren:

| Zustand | Aktuelles Icon | Vorgeschlagenes Icon | Begründung |
|---|---|---|---|
| **Wartend auf OCR** | Checkbox | `Loader2` (faint) oder Checkbox | Klarer Wartestatus. |
| **Text bereit (Ready)** | Checkbox | `Check` (grün/blau) + Checkbox | Signalisiert Erfolg der ersten Phase. |
| **KI-Analyse läuft** | `Loader2` (purple) | `Loader2` (purple) | Beibehalten (Industrial Standard). |
| **Analysiert (Done)** | `CheckCircle` (green) | `CheckCircle` (green) | Beibehalten (Industrial Standard). |

### 3.2 Badge-Optimierung
Das Badge sollte nicht verschwinden, sondern den Status bestätigen:
*   **Status Pending:** "Digital (X Credits)" (Grau/Blau)
*   **Status Ready:** "Text bereit" (Grün/Emerald)

---

## 4. Security & Compliance
> [!IMPORTANT]
> Die Status-Icons dienen nur der UI-Führung. Die tatsächliche Datenverarbeitung (OCR/KI) bleibt serverseitig abgesichert.

*   **Audit-Logs:** Status-Übergänge in der Stapelverarbeitung sollten weiterhin im Client-State getrackt werden, um bei Fehlern gezieltes Debugging zu ermöglichen.

---

## 5. Testing & Referenzen
*   **Verwandte Komponenten:** [BatchFileListItem.tsx](../../src/components/batch/BatchFileListItem.tsx)
*   **Vorgeschlagene Tests:** Integration-Test für den Status-Toggle `ocrDone` -> Check Rendering.

---
*Dokumentation erstellt gemäß Koreki Agent Collaboration Protocol.*
