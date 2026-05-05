---
description: Führt den Layer 3 (E2E) Golden-Thread Smoke Test gegen die Produktionsumgebung aus.
---

Dieser Workflow verifiziert die vollständige Systemintegrität von der Anmeldung bis zur KI-basierten Korrektur.

1. **Vorbereitung**: Stelle sicher, dass die Test-Assets vorhanden sind.
// turbo
run_command: powershell -File ./tests/setup-fixtures.ps1

2. **Test-Ausführung**: Führe den Golden-Thread Test via Playwright aus.
// turbo
run_command: npm run test:e2e tests/e2e/golden-thread.spec.ts -- --project=chromium --reporter=list

3. **Status-Check**: Überprüfe die Screenshots im Verzeichnis `tests/reports/screenshots`.
- 00_dashboard_start.png
- 01_muster_done.png
- 02_schueler_done.png
- 03_bilderkennung_done.png
- 04_final_korrektur.png
