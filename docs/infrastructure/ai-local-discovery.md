---
title: Lokale KI-Infrastruktur (AMDS & SSL-Fidelity)
status: stable
domain: infrastructure
security_classification: internal
---

# Lokale KI-Infrastruktur (Desktop & Community)

## Übersicht
Um die User Experience bei der Nutzung lokaler LLMs (Ollama) zu optimieren, implementiert Koreki ein System zur automatischen Modell-Erkennung und flexiblen SSL-Handhabung.

## Features

### 1. AMDS (Automatic Model Discovery & Selection)
Das System löst generische Modell-Presets (z. B. "Gemma 31B") automatisch auf die lokal installierten Versionen auf.
- **Logik**: Fuzzy-Matching über den Modellnamen (Präfix-Matching).
- **Priorisierung**: `:latest` Tags werden bevorzugt behandelt.
- **UI-Feedback**: Erfolgreiche Auflösungen werden mit einem Info-Badge ("Lokal aufgelöst zu...") markiert.

### 2. SSL-Fidelity (Self-Signed Certificates)
Für Enterprise-Umgebungen unterstützt die Desktop-App die Verbindung zu Ollama-Instanzen über HTTPS mit selbstsignierten Zertifikaten.
- **Failover-Strategie**: Bei SSL-Fehlern versucht das Backend automatisch eine Verbindung mit deaktivierter Zertifikatsprüfung.
- **Sicherheit**: Die Verbindung wird nur zugelassen, wenn der Nutzer die URL explizit konfiguriert hat. Ein Warnhinweis/Indikator im UI informiert über den Status.

## Technische Details

### Backend (Rust/Tauri)
- **Kommandos**: `ping_ollama_command`, `get_ollama_models_command`, `execute_ollama_command`.
- **Client**: Nutzung von `reqwest` mit `danger_accept_invalid_certs(true)` im Failover-Fall.

### Frontend (React)
- **Logik**: Zentralisiert in `src/lib/ai/ollama-logic.ts`.
- **UI-Komponenten**: `AiSetupModal.tsx` und `PrivacySection.tsx` nutzen die Discovery-Logik.

## Security Notes
- Selbstsignierte Zertifikate werden nur im Desktop-Modus automatisch akzeptiert.
- In der Community Edition ist eine manuelle Bestätigung im Browser erforderlich.
