---
title: "[Titel der Dokumentation]"
description: "[Kurze Zusammenfassung, um was es hier geht]"
author: "[Name oder Rolle, z.B. @principal_architect]"
date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
status: "[Draft | In Review | Approved | Deprecated]"
domain: "[technical | compliance | operations | strategy | user-guide]"
security_classification: "[Public | Internal | Confidential | Restricted]"
---

# [Titel der Dokumentation]

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Beschreibe in 2-3 Sätzen das Problem, den Use-Case oder das System, das hier dokumentiert wird.
> **Zielgruppe:** An wen richtet sich dieses Dokument? (Entwickler, Security, PM, Nutzer)

[Füge hier den Kontext und die Einordnung in das Gesamtsystem ein. Warum gibt es diese Komponente/diesen Prozess?]

---

## 2. Architektur & Systemdesign (Optional)
> [!TIP]
> Verwende Mermaid.js Blöcke (` ```mermaid `) anstatt statischer Bilder, um Sequenzen oder Systemarchitekturen darzustellen.

[Wie funktioniert die Komponente technisch? Welche Dienste oder Datenbank-Modelle sind involviert?]

---

## 3. Implementierung & Nutzung
[Anleitung, Code-Beispiele, API-Routen, CLI-Commands oder Flow-Beschreibungen.]

```typescript
// Beispiel-Snippet für Code-Blöcke
function example(): void {
  console.log("Docs-as-code is the way.");
}
```

---

## 4. Security & Compliance (Mandatory for Industrial Grade)
> [!IMPORTANT]
> Keine Komponente ohne Security-Betrachtung. Erläutere hier Datenflüsse, Privacy-Aspekte (GDPR/DSGVO) und Access-Controls (RBAC).

* **Datenverarbeitung:** (Werden PII / sensible Daten verarbeitet?)
* **Authentifizierung/Autorisierung:** (Wer darf hierauf zugreifen?)
* **Audit-Logs:** (Werden kritische Aktionen protokolliert?)

---

## 5. Testing & Referenzen
> [!WARNING]
> Verlinke hier zwingend auf zugehörige GitHub PRs, Tasks oder Architektur-Entscheidungen (ADR).

* **Verwandte Dokumente:** [Link zu anderem Dokument](./anderes-dokument.md)
* **Test-Coverage:** (Gibt es Playwright E2E Tests oder Jest Unit-Tests für diesen Bereich?)
* **Externe Referenzen:** [Link zur API Doku des Providers](https://...)
