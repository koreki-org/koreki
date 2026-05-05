---
title: "Koreki Desktop: Native Architecture & Local-First Capability"
description: "Technische Dokumentation der Koreki Desktop-Applikation inklusive nativer Bridges (Tauri), Ollama-Integration und dem Unified Export System."
author: "@principal_architect"
date: "2026-04-12"
last_updated: "2026-04-12"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Koreki Desktop: Native Architecture & Local-First Capability 💻🛡️🏛️

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Die Koreki Desktop-App ist ein nativer Client, der maximale Datenhoheit durch lokale Ausführung, Offline-Fähigkeiten und **OS-native Tresor-Verschlüsselung** ermöglicht.
> **Zielgruppe:** CORE-Entwickler, System-Architekten, Security-Auditoren.

Koreki wird primär als SaaS-Plattform entwickelt (**SaaS Priority**), bietet jedoch für datenschutz-kritische Umgebungen eine Desktop-Variante an. Diese ermöglicht die Nutzung lokaler KI-Modelle (Ollama) und den direkten Zugriff auf OS-native Funktionen, ohne die Web-Kompatibilität des Kern-Systems zu verletzen.

---

## 2. Architektur & Systemdesign
Die Desktop-App basiert auf **Tauri V2**, wodurch ein minimaler Ressourcenverbrauch und eine strikte Trennung zwischen Frontend (Next.js) und System-Logik (Rust) erreicht wird.

### Unified AI Bridge (Isomorph)
Koreki nutzt eine isomorphe Bridge-Architektur. Dieselbe Logik (`mistral-provider.ts`) steuert sowohl Cloud-Modelle als auch lokale Instanzen.

```mermaid
graph TD;
    subgraph "Frontend (React/Next.js)"
        UI[User Dashboard]
        AP[Action Processors]
        FB[File Export Bridge]
    end

    subgraph "Tauri Layer (Rust)"
        OC[Ollama Command]
        NC[Native Save Command]
        PM[Ping Manager]
    end

    subgraph "Local OS / Environment"
        OL[Ollama Local LLM]
        FS[Filesystem (Native Dialog)]
    end

    UI --> AP
    AP -- "Invoke" --> OC
    OC --> OL
    FB -- "Invoke" --> NC
    NC --> FS
```

---

## 3. Implementierung & Nutzung

### 3.1 Unified Export Bridge (`downloadFile`)
Um die Parity zwischen Web und Desktop zu wahren, werden alle Exporte (Excel, PDF, .koreki) über eine zentrale Abstraktion geleitet.

```typescript
// src/lib/file-utils.ts
export const downloadFile = async (data, fileName, mimeType) => {
    if (isDesktopMode()) {
        // Nutzt die native Rust-Bridge für Speicherdialoge
        await invoke('save_file_native', { data, filename: fileName });
    } else {
        // Fallback auf Standard Browser-Download (SaaS)
        const url = window.URL.createObjectURL(blob);
        // ... Link manipulation ...
    }
};
```

### 3.2 Native Save Bridge (Rust Side)
Der Desktop-Modus verzichtet auf schwere JS-Plugins im Frontend und nutzt stattdessen einen spezialisierten Rust-Command mit dem `rfd` Crate (Recursive File Dialog).

```rust
#[tauri::command]
async fn save_file_native(data: Vec<u8>, filename: String) -> Result<bool, String> {
    let dialog = rfd::AsyncFileDialog::new().set_file_name(&filename).save_file();
    if let Some(file_handle) = dialog.await {
        let mut file = File::create(file_handle.path())?;
        file.write_all(&data)?;
        Ok(true)
    } else {
        Ok(false)
    }
}
```

---

## 4. Security & Compliance 🛡️
> [!IMPORTANT]
> **Data Sovereignty by Design**: Im Desktop-Modus findet keine Verarbeitung von Schülerdaten auf Koreki-Zentral-Servern statt.

* **Datenverarbeitung:** Alle Dokumente verbleiben im Arbeitsspeicher des Clients oder werden lokal gespeichert. Bei Nutzung von Ollama fließen Daten ausschließlich zum lokalen Endpoint (`localhost:11434`).
* **Credential Security:** Im Gegensatz zur SaaS-Variante werden API-Keys (z.B. Mistral) auf Desktop **niemals im RAM oder LocalStorage** gehalten. Sie werden direkt an den verschlüsselten Tresor des Betriebssystems (Windows Safe Store / Linux Secret Service / macOS Keychain) delegiert.
* **SaaS Priority Protection**: Die Desktop-Bypasses sind über `isDesktopMode()` in `src/lib/env-context.ts` abgesichert (Domain-Lock), um eine versehentliche Aktivierung in der Cloud-Produktion zu verhindern.
* **Audit-Logs**: Kritische Aktionen werden lokal über Tauri-Log-Plugins protokolliert, nicht serverseitig.

---

## 5. Testing & Referenzen

* **Tiers-Vergleich:** [SaaS vs. Community vs. Desktop Comparison](./deployment-tiers-comparison.md)
* **KI-Härtung:** [Ollama Integration & Hardening](./ollama-integration-hardening.md)
* **Offline-Status:** [Disconnected Mode](./disconnected-mode.md)
* **Unit-Tests:** `tests/unit/lib/file-utils.test.ts` verifiziert die korrekte Pfadwahl der Export-Bridge.

## 6. Build & Deployment 🚀

Um ein produktionsbereites Bundle für Windows oder Linux zu erstellen, muss der entsprechende Build-Befehl ausgeführt werden.

### 6.1 Windows (MSI/EXE)
```bash
npm run build:desktop
```
Die fertigen Installer befinden sich unter `src-tauri/target/release/bundle/msi/`.

### 6.2 Linux (Ubuntu/Debian .deb)
Für den Build auf Ubuntu (oder via WSL) müssen zunächst die System-Abhängigkeiten installiert werden:

```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libdbus-1-dev pkg-config build-essential
```

Anschließend kann der Build gestartet werden:
```bash
npm run build:desktop
```
Das fertige Paket befindet sich unter `src-tauri/target/release/bundle/deb/`.

> [!IMPORTANT]
> **Secret Service Integration:** Auf Linux nutzt Koreki die `secret-service` D-Bus API für den Vault. Stellen Sie sicher, dass ein Keyring-Dienst (z.B. GNOME Keyring) aktiv ist, um API-Keys sicher zu speichern.

---
*Dokument ID: KOREKI-TECH-015 | Revision: 1.2 (Linux Support)* 🏛️
