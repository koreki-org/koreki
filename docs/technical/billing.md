---
title: "Koreki Abrechnungssystem (Billing & Tokens)"
description: "Technisches Architektur-Dokument: Koreki Abrechnungssystem (Industrial Precision Billing)"
author: "@principal_architect"
date: "2026-05-03"
last_updated: "2026-08-27"
status: "Stable"
domain: "technical"
security_classification: "Public"
---

# Koreki Abrechnungssystem (Billing & Tokens)

> [!IMPORTANT]
> **Inhalt am 27.08.2026 gegen den Code geprüft.** Drei Angaben waren überholt: die zentrale Abrechnungsfunktion samt ihrer Datei, die Zeichengrenze und die Credit-Tabelle. Bestätigt: das Split-Pricing, die Budget-Bremse mit `429`, die Felder in `SystemSettings` und der Bypass für lokale Instanzen.

## 1. Executive Summary & Kontext

Koreki nutzt ein **hochpräzises Abrechnungssystem (Industrial Precision Billing)**, um die tatsächlichen API-Kosten ("Tokens") lückenlos zu tracken und über Budgets zu kontrollieren. Das System unterscheidet strikt zwischen der Nutzer-Sicht (Credits) und der System-Sicht (Echtgeld-Äquivalente).

## 2. Das Credit-System (Nutzer-Sicht)

Credits dienen der einfachen Abstraktion für Endnutzer. Abrechnungsbasis ist die **Analyseseite**.

### A) Workflow-Kosten

Abgerechnet wird **je Aufruf**, nicht je erzeugtem Teilergebnis. Ein Korrekturlauf kostet `pageCount` Credits, also 1 Credit je Seite (`src/hooks/file-processor/useCorrectionRun.ts`, `src/pages/api/billing/pure-deduct.ts`). Eine vorgeschaltete Bilderkennung wird als eigener Aufruf abgerechnet.

Die Voranzeige in der Oberfläche schätzt entsprechend: 1 Credit je Seite für digitale Abgaben, 2 für eingescannte, weil dort die Bilderkennung hinzukommt (`estimatedCredits` in `src/hooks/file-processor/useBatchActions.ts`).

> [!WARNING]
> Die frühere Staffel an dieser Stelle (1/2/2/3 Credits je Seite nach Dokumentart) entspricht nicht dem Code.

### B) PURE Modus & Zero-Ops Bypass
- **PURE Modus (SaaS):** Nutzer mit eigenem API-Key zahlen 0 Credits für Infrastruktur-Schritte. Die Schlüssel werden im Browser-RAM gehalten.
- **Billing Bypass (Community/Desktop):** In lokalen Instanzen (`isLocalInstance()`) werden Credits automatisch als "vorhanden" markiert, um administrativen Overhead zu vermeiden (Zero-Ops). **Die Desktop-App agiert dauerhaft im PURE-Modus und nutzt den OS-nativen Vault zur sicheren Speicherung der API-Keys.**

---

## 3. Industrial Precision Billing (System-Sicht) 🏛️🛡️

Seit Version 0.9.x nutzt Koreki ein **reines Split-Pricing-Verfahren**. Es gibt keine Pauschalpreise pro 1M Tokens mehr. Jeder Aufruf wird nach Input- und Output-Tokens getrennt bewertet.

### A) Kostenträger-Rechnung (Präzisions-Modus)
Jeder API-Call wird über `performBillingAction()` in `src/lib/billing.ts` verbucht. Die früher hier genannte Funktion `processBillingAndUsage()` und die Datei `src/lib/billing-utils.ts` existieren **nicht mehr**; `performBillingAction` hat sie abgelöst und übernimmt zusätzlich die Auflösung des Arbeitsbereichs. Dabei werden folgende Daten erfasst:
- **Input-Tokens:** Die an die KI gesendeten Daten (Texte, Bilder).
- **Output-Tokens:** Die von der KI generierte Antwort.

Die Kostenrechnung erfolgt dynamisch:
`Gesamtkosten = (Input-Tokens / 1M * Input-Preis) + (Output-Tokens / 1M * Output-Preis)`

### B) Monitoring & Kostenbremse (SystemSettings)
Das System aggregiert die monatliche Nutzung in der `SystemSettings`-Tabelle:
- `ocrInputMonthlyUsage` / `ocrOutputMonthlyUsage`
- `correctionInputMonthlyUsage` / `correctionOutputMonthlyUsage`

> [!IMPORTANT]
> **Die Budget-Bremse:** Erreichen die summierten Kosten das definierte `ocrBudget` oder `correctionBudget`, blockiert das System weitere Anfragen mit einem `429 Too Many Requests`. Die Budget-Werte werden monatlich automatisch zurückgesetzt.

### C) Nutzer-Kosten-Analyse
Im Admin-Dashboard wird für jeden Nutzer eine Echtzeit-Analyse erstellt. Diese zeigt nicht nur die Token-Mengen, sondern den exakten Euro-Betrag, aufgeschlüsselt nach:
1. **Modul** (OCR vs. KI)
2. **Richtung** (Input-Kosten vs. Output-Kosten)

Dies ermöglicht eine lückenlose Transparenz darüber, welche Workflows die Cloud-Ressourcen am stärksten beanspruchen.

---

## 4. Sicherheits-Features 🛡️

### A) Textmengen-Limit (Halluzinations-Schutz)
Vor jedem KI-Aufruf wird die Textmenge geprüft:
`studentText.length <= min(pageCount * 10000, 100000)`

Also **10.000 Zeichen je Seite**, gedeckelt bei 100.000 Zeichen je Anfrage (`src/lib/security.ts`). Die frühere Angabe von 4.000 stimmt nicht. Ein Überschreiten wird als `AI_PIPELINE_ANOMALY` im Sicherheitsprotokoll vermerkt. Dies verhindert "Runaway-Kosten" durch fehlerhafte OCR-Ergebnisse oder böswillige Überlastung.

### B) API-Schutz (Expert Role)
Die Rolle `EXPERTE` kann zwar Prompts anpassen, hat aber **keinen Zugriff** auf die finanziellen Billing-Einstellungen. Diese sind strikt der Rolle `ADMIN` vorbehalten.

## Code Map
- **Zentrale Abrechnungs-Engine:** `src/lib/billing.ts` → `performBillingAction()`
- **Preiskalkulation (Pure):** `src/lib/billing-logic.ts`
- **Monatlicher Reset & Bypass für lokale Instanzen:** `src/lib/billing.ts`
- **Admin Interface:** `src/components/settings/GlobalBillingSettings.tsx`
- **API-Endpoint:** `src/pages/api/admin/settings.ts`
