---
title: "Quickstart: Lokale Testumgebung (Community Single)"
description: "Anleitung zum schnellen Starten von Koreki im zustandslosen Single-User Modus für lokale Tests und Layer 3 Verifizierungen."
author: "@principal_architect"
date: "2026-05-05"
last_updated: "2026-05-05"
status: "Approved"
domain: "operations"
security_classification: "Internal"
---

# Quickstart: Lokale Testumgebung (Community Single)

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Der 'Community Single Mode' ist die effizienteste Umgebung für lokale Entwicklung und Layer 3 (E2E) Tests. Er eliminiert die Abhängigkeit von externen Auth-Providern (Logto/Keycloak) und relationalen Datenbanken (PostgreSQL).
> **Zielgruppe:** Entwickler und QA-Engineers.

Diese Umgebung ist das primäre Werkzeug für die schnelle Verifizierung des "Golden Thread" Workflows (Upload -> OCR -> KI -> Export), ohne eine vollständige Infrastruktur hochfahren zu müssen.

---

## 2. Architektur & Systemdesign

Der Modus nutzt das **Industrial Local Bypass** Muster, um Authentifizierung und Persistenz zu virtualisieren:

```mermaid
graph LR
    A[Browser] --> B[Next.js App]
    B -- "isLocalInstance() == true" --> C[LocalSecurityBypass]
    B -- "Mode: community" --> D[LocalProfileService]
    D -- "Persistenz" --> E[(Filesystem /data)]
```

---

## 3. Implementierung & Nutzung

### Schnellstart-Konfiguration (.env.local)
Um die Umgebung zu aktivieren, müssen folgende Flags in der `.env.local` gesetzt sein:

```env
# Kern-Modus
NEXT_PUBLIC_KOREKI_MODE=community
NEXT_PUBLIC_SINGLE_USER_MODE=true
NEXT_PUBLIC_AUTH_TYPE=NONE

# WICHTIG: Desktop-Export deaktivieren für API-Routen Support
NEXT_PUBLIC_KOREKI_DESKTOP=false

# Datenbank (Dummy für Prisma-Initialisierung)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# KI-Schlüssel
MISTRAL_API_KEY=your_key
```

### Befehle
1. **Abhängigkeiten & Client:**
   ```powershell
   npm install
   npx prisma generate
   ```

2. **Dev-Server starten:**
   ```powershell
   npm run dev
   ```

3. **Verifizierung:**
   Öffne `http://localhost:3000`. Wenn kein Login erscheint und die App direkt ins Dashboard lädt, ist das Setup erfolgreich.

---

## 4. Security & Compliance (Mandatory)
> [!IMPORTANT]
> Dieser Modus ist ausschließlich für **Testzwecke** und die **lokale Nutzung** vorgesehen. 

* **Datenverarbeitung:** In diesem Modus werden Experten-Profile unverschlüsselt im Projektordner (`/data/prompts/`) gespeichert.
* **Authentifizierung/Autorisierung:** Vollständiger Bypass. Jeder, der Zugriff auf den Port 3000 hat, ist Administrator.
* **Audit-Logs:** Werden nur im Standard-Output (Terminal) geloggt, nicht in der Datenbank.

---

## 5. Testing & Referenzen
* **Verwandte Dokumente:** [Teststrategie](./testing.md), [Community Edition Persistence](../technical/community-edition-persistence.md)
* **Test-Coverage:** Dieser Modus ist die Basis für die Layer 3 Playwright Tests in `tests/e2e/`.
* **Layer 3 Ausführung:**
  ```powershell
  # Test gegen laufende Instanz
  npx playwright test
  ```
