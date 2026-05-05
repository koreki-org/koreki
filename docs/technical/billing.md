---
title: "Koreki Abrechnungssystem (Billing & Tokens)"
description: "Technisches Architektur-Dokument: Koreki Abrechnungssystem (Industrial Precision Billing)"
author: "@principal_architect"
date: "2026-05-03"
last_updated: "2026-05-03"
status: "Stable"
domain: "technical"
security_classification: "Public"
---

# Koreki Abrechnungssystem (Billing & Tokens)

## 1. Executive Summary & Kontext

Koreki nutzt ein **hochpräzises Abrechnungssystem (Industrial Precision Billing)**, um die tatsächlichen API-Kosten ("Tokens") lückenlos zu tracken und über Budgets zu kontrollieren. Das System unterscheidet strikt zwischen der Nutzer-Sicht (Credits) und der System-Sicht (Echtgeld-Äquivalente).

## 2. Das Credit-System (Nutzer-Sicht)

Credits dienen der einfachen Abstraktion für Endnutzer. Abrechnungsbasis ist die **Analyseseite**.

### A) Workflow-Kosten
- **Musterlösung (Digital):** 1 Credit / Seite (Layout & Parsing)
- **Musterlösung (Scan):** 2 Credits / Seite (OCR + Layout)
- **Schülerabgabe (Digital):** 2 Credits / Seite (Cleaning + Korrektur)
- **Schülerabgabe (Scan):** 3 Credits / Seite (OCR + Cleaning + Korrektur)

### B) PURE Modus & Zero-Ops Bypass
- **PURE Modus (SaaS):** Nutzer mit eigenem API-Key zahlen 0 Credits für Infrastruktur-Schritte. Die Schlüssel werden im Browser-RAM gehalten.
- **Billing Bypass (Community/Desktop):** In lokalen Instanzen (`isLocalInstance()`) werden Credits automatisch als "vorhanden" markiert, um administrativen Overhead zu vermeiden (Zero-Ops). **Die Desktop-App agiert dauerhaft im PURE-Modus und nutzt den OS-nativen Vault zur sicheren Speicherung der API-Keys.**

---

## 3. Industrial Precision Billing (System-Sicht) 🏛️🛡️

Seit Version 0.9.x nutzt Koreki ein **reines Split-Pricing-Verfahren**. Es gibt keine Pauschalpreise pro 1M Tokens mehr. Jeder Aufruf wird nach Input- und Output-Tokens getrennt bewertet.

### A) Kostenträger-Rechnung (Präzisions-Modus)
Jeder API-Call wird über `processBillingAndUsage()` (in `src/lib/billing-utils.ts`) verbucht. Dabei werden folgende Daten erfasst:
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
`text.length <= pageCount * 4000`
Dies verhindert "Runaway-Kosten" durch fehlerhafte OCR-Ergebnisse oder böswillige Überlastung.

### B) API-Schutz (Expert Role)
Die Rolle `EXPERTE` kann zwar Prompts anpassen, hat aber **keinen Zugriff** auf die finanziellen Billing-Einstellungen. Diese sind strikt der Rolle `ADMIN` vorbehalten.

## Code Map
- **Zentrale Abrechnungs-Engine:** `src/lib/billing-utils.ts`
- **Preiskalkulation (Pure):** `src/lib/billing-logic.ts`
- **Monatlicher Reset:** `src/lib/billing.ts`
- **Admin Interface:** `src/components/settings/GlobalBillingSettings.tsx`
- **API-Endpoint:** `src/pages/api/admin/settings.ts`
