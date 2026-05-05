---
title: "Architektur-Vergleich: Deployment Tiers (SaaS vs. Community vs. Desktop)"
description: "Technische Gegenüberstellung der Cloud-basierten SaaS-Variante, der On-Premise Community Edition und der Standalone Desktop-App von Koreki."
author: "@principal_architect"
date: "2026-04-10"
last_updated: "2026-04-26"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Architektur-Vergleich: Deployment Tiers (SaaS vs. Community vs. Desktop) 🏮🛡️🏛️

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Koreki operiert in drei Deployment‑Szenarien: Der cloud‑integrierten **SaaS‑Variante**, der selbstgehosteten **Community Edition (On‑Prem)** und der nativen **Desktop‑App (Lokal)**.
> **Zielgruppe:** CORE‑Entwickler, System‑Architekten und IT‑Admins.
>
> Dieser Modus‑Trialismus ermöglicht maximale Flexibilität — von der schlüsselfertigen Enterprise‑Lösung bis zur vollständig isolierten Offline‑Anwendung.

---

## 2. Architektur & Systemdesign

Der Hauptunterschied liegt in der Infrastruktur‑Abhängigkeit und dem "Schnittpunkt" der Datenverarbeitung.

### Vergleich der Systemkomponenten

| Komponente | **SaaS Mode** (Cloud) | **Community** (On‑Prem) | **Desktop** (Lokal) |
| :--- | :--- | :--- | :--- |
| **Authentifizierung** | Logto (Cloud / OIDC) | **Keycloak / OIDC** (Optional) | **Mock/Local Auth** (Bypass) |
| **Datenbank** | PostgreSQL (Prisma) | **Dateisystem** (JSON) | **Keine** (LocalStorage / Native Vault) |
| **KI‑Execution** | Mistral Bridge (Browser) | Mistral Bridge (Browser) | Bridge / Ollama Proxy |
| **Export‑Weg** | Browser‑Download | Browser‑Download | **Native OS‑Dialoge** (Tauri) |
| **Billing / Credits** | `/api/billing/*` (Stripe) | Bypass (Lizenz‑Modus) | Bypass (Unlimited) |
| **Plattform** | Web‑Browser | Web‑Browser (Docker) | **Native App** (Windows/Mac) |

| **Data Sovereignty** | Koreki Cloud (EU) | Kunden‑eigener Server | 100 % Lokal beim Endnutzer |
| **Persistenz** | Cloud DB / PostgreSQL | Server‑Dateisystem (JSON) | Lokaler Client (**JSON + Native OS Vault**) |

### Das 3‑Tier Persistenz‑Modell (Expert Center)

Mit dem Release von Version 0.9.14 wurde die Architektur für das *Expert Center* (Persistenz von Prompt‑Profilen) auf ein sauberes 3‑Tier‑Modell umgestellt, welches die Stärken jeder Deployment‑Art maximiert:

1. **SaaS‑Modus:** Profile werden über die sichere Next.js API‑Route (`withSecurity`) in die PostgreSQL‑Datenbank geschrieben. Volle Mandanten‑fähigkeit und nahtlose Synchronisation über alle Endgeräte des Users.
2. **Community:** Läuft als lokaler Docker‑Container *mit* aktivem Node.js Server. Die API‑Routen sind aktiv. Je nach Konfiguration wird **Keycloak (OIDC)** zur Authentifizierung genutzt. Der `LocalProfileService` speichert Profile **nutzerspezifisch** auf dem Server-Dateisystem (`profiles_[USER_ID].json`). Dies ermöglicht echtes Multi-User-Szenario ohne Datenbank-Server, wobei Datenverlust durch Browser-Bereinigung ausgeschlossen ist.
3. **Desktop:** Läuft als statischer Export in Tauri. API‑Routen existieren im Build nicht. Ein `isDesktopTarget()` Guard **auf dem Frontend** fängt API‑Aufrufe ab und leitet alle Lese‑/Schreiboperationen direkt in den `localStorage` der Tauri‑Webview um (Expert Center). **Sensible Daten (API-Keys) werden hardwarenah im verschlüsselten OS-Tresor (Windows Credential Manager / GNOME Keyring / macOS Keychain) hinterlegt.** Die App funktioniert 100 % autark und offline.

---

## 3. Implementierung & Nutzung

### Die Desktop‑Guards (`isLocalInstance` vs `isDesktopTarget`)

Um eine saubere Trennung zwischen **Berechtigungen** (Bypass) und **Plattform‑Fähigkeiten** (Tauri APIs) zu gewährleisten, nutzt Koreki zwei verschiedene Guards:

1. **`isLocalInstance()` (Local Guard):** Steuert, ob Authentifizierung und Billing umgangen werden. Aktiv für Desktop‑App und Community Edition.
2. **`isDesktopTarget()` (Plattform Guard):** Steuert, ob native Tauri/Rust APIs (wie `invoke`) aufgerufen werden. **Nur aktiv in der tatsächlichen Desktop‑App.**

Dies verhindert `TypeErrors` im Browser, wenn die Community Edition versucht, auf nicht vorhandene native Funktionen zuzugreifen.

```typescript
// src/lib/env-context.ts (vereinfacht)
export function isLocalInstance(): boolean {
    return mode === 'desktop' || (mode === 'community' && isSingleUser);
}

export function isDesktopTarget(): boolean {
    return getKorekiMode() === 'desktop'; // Nur aktiv für native Desktop‑App
}
```

### Die Unified Export Bridge (`downloadFile`)

Ab April 2026 nutzt Koreki eine einheitliche Abstraktion für alle Dateiexporte. Dies verhindert den "Download‑Block" in der Desktop‑App und garantiert maximale Performance im Web.

1. **SaaS Path**: Standard‑Download via Blob‑URL (mit DOM‑Attaching Fix).
2. **Desktop Path**: Direkter Invoke an den nativen Rust‑Command `save_file_native`.

---

## 4. Security & Compliance 🛡️

> [!IMPORTANT]
> **ARCHITECTURAL INTEGRITY:** Der Desktop‑Modus ist ein reiner UI/Client‑Bypass. Die serverseitigen API‑Routen (`withSecurity`) bleiben unverändert geschützt. Ein Hack im Browser‑Frontend öffnet **keinen** unautorisierten Zugriff auf SaaS‑Datenbanken.

* **Datenverarbeitung:** Im Desktop‑Modus findet **keine** Datenübertragung an Koreki‑Server statt. Alle PDFs und Texte fließen direkt vom Browser zum KI‑Provider (Mistral).
* **Authentifizierung:** Der Zugriff auf SaaS‑Features wird serverseitig weiterhin durch Logto‑Validierung erzwungen.
* **Audit‑Logs:** Im Desktop‑Modus werden keine serverseitigen Audit‑Logs erzeugt, um die Anonymität und Datenhoheit des Nutzers zu wahren.

---

## 5. Testing & Referenzen

* **Architecture:** [Korrektur‑Workflow](./correction-workflow.md)
* **KI‑Pedagogy Framework:** [AI Pedagogy Framework](./ai-pedagogy-framework.md)
* **Desktop‑Export Bridge:** [Koreki Desktop](./koreki-desktop.md)
* **Unit‑Tests:** `tests/unit/lib/file-utils.test.ts` verifiziert die korrekte Pfadwahl der Export‑Bridge.

---

*Dokument ID: KOREKI‑TECH‑009 | Revision: 1.1* 🏛️
