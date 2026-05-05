---
title: "Unified AI Provider Infrastructure & Reasoning Mode"
description: "Dokumentation der provider-agnostischen KI-Architektur, des Qwen 3.6 'Thinking Mode' und der tier-spezifischen Konfigurationslogik."
author: "@principal_architect"
date: "2026-04-30"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Unified AI Provider Infrastructure & Reasoning Mode 🏮🏛️🛡️

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Seit Version 0.9.17 nutzt Koreki eine unifizierte Provider-Infrastruktur, die den nahtlosen Wechsel zwischen Mistral, Ollama und generischen OpenAI-kompatiblen Endpunkten (z.B. Mittwald) ermöglicht.
> **Zielgruppe:** CORE-Entwickler, System-Admins.

Die Architektur wurde entworfen, um die Abhängigkeit von einzelnen Providern zu minimieren und gleichzeitig High-Performance Modelle wie **Qwen 3.6 (Reasoning)** mit spezialisierten Parametern zu unterstützen.

---

## 2. Architektur & Systemdesign

### Die Isomorphe Bridge (`OpenAICompatibleProvider`)
Im Gegensatz zum spezialisierten `MistralProvider` fungiert der `OpenAICompatibleProvider` als generische Brücke zu jedem Dienst, der den `/v1/chat/completions` Standard implementiert.

*   **Endpoint:** Dynamisch konfigurierbar via `openaiUrl`.
*   **Authentication:** Träger-Token via `openaiKey`.
*   **Reasoning-Injektion:** Unterstützt den nativen **Thinking Mode** (Qwen-Standard) durch Injektion des `enable_thinking` Parameters in den Request-Body.

### Tier-spezifische UI-Logik (`UnifiedAiConfig`)
Die Konfigurationsoberfläche passt sich dynamisch dem Deployment-Tier an:

| Tier | UI-Strategie | Fokus |
| :--- | :--- | :--- |
| **SaaS** | Premium-Karten | DSGVO-Transparenz (Standort-Badges DE/FR), Abstraktion technischer Komplexität. |
| **Community** | Technische Steuerung | Volle Kontrolle über URLs, Keys und Modelle. Unterstützung von globalen Schlüsseln via ENV. |
| **Desktop** | Technische Steuerung | Fokus auf lokale Modelle (Ollama) und CORS-Bypass für Custom-Provider. |

---

## 3. Community Mode & Multi-User Isolation 👥🛡️

In der **Community Edition** kann die KI-Infrastruktur auf zwei Ebenen konfiguriert werden:

1.  **Global (Server-Side):** Der Administrator setzt `MITTWALD_API_KEY` oder `MISTRAL_API_KEY` in der Docker-Umgebung. 
    *   Dies signalisiert der App via `hasGlobalAiKey: true`, dass ein Standard-Provider bereitsteht.
    *   Das automatische **AI-Setup-Modal** wird für Endnutzer unterdrückt, um einen nahtlosen Start zu ermöglichen.
2.  **Individuell (User-Side):** Falls keine globalen Keys gesetzt sind (oder der Nutzer ein eigenes Modell nutzen möchte), erlaubt das **Expert Center** die Hinterlegung individueller Keys (z.B. ein eigener Ollama-Endpunkt für eine Lehrkraft). Diese Keys werden isoliert im Profil des Nutzers gespeichert.

---

## 3. Qwen 3.6 & Deep Thinking Mode 🧠

Koreki optimiert die Inferenz-Parameter automatisch, sobald der **Thinking Mode** aktiviert wird, um die Reasoning-Qualität von Qwen 3.6 zu maximieren:

1.  **Temperature Hardening:** 
    *   Standard (Thinking): `1.0`
    *   Korrektur-Modus (Thinking): `0.6` (Erhöht die Präzision bei Code- und Logikanalysen).
2.  **Context Escalation:** Setzt `max_tokens` automatisch auf bis zu `32.768`, um Raum für die Reasoning-Kette zu schaffen.
3.  **Response Sanitizing:** Der Provider bereinigt die Antwort chirurgisch von `<thinking>` Blöcken und Markdown-Fences, um die Datenintegrität für den nachgelagerten JSON-Parser zu gewährleisten.

---

## 4. Desktop Hardening: Der Generic AI Proxy 🛡️

Aufgrund der **Same-Origin-Policy (SOP)** im Browser können Custom-KI-Endpunkte oft nicht direkt aus der Webview aufgerufen werden (CORS-Fehler).

*   **Lösung:** Koreki nutzt ein generisches Proxy-Kommando im Rust-Backend (`src-tauri/src/lib.rs`).
*   **Mechanismus:** `execute_ai_proxy_command` nimmt den Request entgegen, führt ihn nativ im OS aus (Bypass) und reicht das Ergebnis an das Frontend zurück.
*   **Security:** Der Proxy erzwingt TLS, erlaubt aber (optional konfiguriert) `danger_accept_invalid_certs` für interne Schulnetzwerke.

---

## 5. Konfiguration (Operations)

### SaaS Environment Variables
Für die globale Bereitstellung von Mittwald/Qwen im SaaS-Modus sind folgende Variablen erforderlich:
*   `MITTWALD_API_KEY`: Globaler Schlüssel für den Standard-Reasoning-Provider.

---
*Dokument ID: KOREKI-TECH-012 | Revision: 1.0* 🏛️
