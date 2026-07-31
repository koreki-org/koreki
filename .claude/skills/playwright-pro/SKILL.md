---
name: playwright-pro
description: Standards für Industrial-Grade E2E Automation (Playwright)
---

# Skill: Industrial-Grade E2E Automation (Playwright)

Dieses Dokument definiert den Standard für die Testautomatisierung der Koreki-Plattform. Es ist als verbindlicher Leitfaden für den **QA Engineer** zu verstehen.

## 1. Deterministic Selectors
Verwende nach Möglichkeit robuste, datenbasierte Selektoren (`data-testid`), anstelle von brüchigen CSS-Klassen oder Element-Hierarchien.

## 2. Asynchronous Handling (AI Delays)
Aufgrund der Latenzen bei OCR und KI-Korrektur:
- **Poller-Prinzip**: Warte explizit auf Status-Änderungen in der UI (z.B. "Korrigiert"-Badge) oder im Backend-Status (`/api/ai-status`).
- **Wait Policy**: Vermeide starre `page.waitForTimeout()`. Nutze stattdessen `expect(...).toBeVisible({ timeout: 15000 })`.

## 3. The "Golden Thread" Smoke Test
Der primäre Testfall für jede Code-Änderung:
- **Login**: Authentifizierung gegen Logto-Mock oder Test-User.
- **Upload**: Hochladen einer gültigen Musterlösung (PDF) und einer Schülerarbeit.
- **Correction**: Prüfung, ob die KI-Korrektur initialisiert und abgeschlossen wurde.
- **Verification**: Prüfung der generierten Punkte und des Feedbacks.
- **Export**: Export eines ZIPs oder Excels und Prüfung der Dateiintegrität.

## 4. Multi-Tenant Isolation Tests
Führe regelmäßig Tests durch, bei denen zwei separate Sessions versuchen, auf die Daten der jeweils anderen Organisation zuzugreifen (Cross-Tenant Security Check).

## 5. Mobile Emulation
Nutze die Playwright Mobile Emulations-Profiles, um die Responsive-UX bei kritischen Interaktionen (z.B. der `RedactionModal`) auf Smartphones zu verifizieren.
