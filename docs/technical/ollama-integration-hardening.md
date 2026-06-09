---
title: "Ollama Desktop Integration & SSoT Hardening (V13)"
description: "Dokumentation der lokalen KI-Architektur, der VRE Parameter-Steuerung via Rust-Bridge und der industriellen Härtung."
author: "@principal_architect"
date: "2026-04-12"
last_updated: "2026-04-16"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# Ollama Desktop Integration & SSoT Hardening (V13)

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Zur Gewährleistung maximaler Datenhoheit ermöglicht Koreki im Desktop-Modus die Nutzung lokaler LLMs via Ollama. Dieses Dokument beschreibt die industrielle Härtung der Pipeline, um CORS-Beschränkungen zu umgehen und Fragmentierungsfehler bei großen Modellen (Mistral, Phi-3) auszuschließen.
> **Zielgruppe:** Core-Entwickler, System-Architekten.

Die Transformation zu einem "Industrial Grade" Desktop-Tool erforderte eine robuste Rust-Middleware, die Instabilitäten im KI-Stream und Adressierungsfehler im Netzwerk aktiv abfängt.

---

## 2. Architektur & Systemdesign

### Das Brücken-Modell (Generic AI Proxy)
Aufgrund der **Same-Origin-Policy (SOP)** und fehlender CORS-Header bei Standard-Ollama-Installationen nutzt Koreki das Tauri-Backend als hochperfekten Proxy. Mit Version 0.9.17 wurde dieser Ansatz zum **Generic AI Proxy** erweitert, der nicht nur Ollama, sondern alle OpenAI-kompatiblen Endpunkte (z.B. lokale Qwen-Instanzen) bedient.

*   **Model Strategy (Wizard V10):**
    *   **Gemma 4 (4B):** Multimodales Standard-Modell für Vision & schnelle Scans.
    *   **Mistral Small 3.2:** Die „Efficient Engine“ für präzise Text-Extraktion und OCR-Korrektur.
    *   **Gemma 4 (31B):** High-End Referenz für maximale Korrektur-Tiefe.
*   **Specialized Prompt Routing (V11):** Nutzung dedizierter Spezial-Prompts (`src/prompts/specialized/`), um für jedes Modell optimale Resultate ohne „Prompt-Vergiftung“ anderer Modelle zu erhalten.

#### Rust-Middleware Hardening (Byte-Buffer) 🛡️
Um Datenverlust bei fragmentierten TCP-Paketen zu verhindern (häufig bei Mistral 7B Antworten), wurde ein Byte-Buffer-Akkumulator in Rust implementiert:
*   **Akkumulation:** Roh-Bytes werden gesammelt, bis ein vollständiger Delimiter (`\n`) erkannt wird.
*   **Atome:** Erst vollständige NDJSON-Zeilen werden an den Parser übergeben.
*   **Resilienz:** Verhindert `Partial-JSON` Parsing-Fehler bei hoher Auslastung.

#### VRE Parameter Bridge (V13 Breakthrough) ⛩️
Seit **Iteration V13** unterstützt die Rust-Middleware (`src-tauri/src/lib.rs`) die aktive Steuerung von Sampling-Parametern. Dies ist das Fundament der **VRE-Architektur**.

*   **Parameter Passing:** Die `execute_ollama_command` Funktion akzeptiert nun `temperature` und `top_p`.
*   **Struct Extension:** Die `OllamaOptions` wurden um diese optionalen Felder erweitert, um sie atomar an den `/api/chat` Endpunkt von Ollama zu senden.
*   **Determinismus & Loop-Schutz:** Für lokale Ollama-Modelle wird im Frontend (Einstellungen, hooks) sowie als defensive Absicherung im Backend-Proxy (`ollama-logic.ts`) ein **Mindestwert von `0.1` für die Temperatur** erzwungen (Clamping). Dies verhindert, dass lokale GPU-Inferenz-Instanzen bei einer Temperatur von exakt `0.0` in unendliche Token-Generierungs- oder Grammar-Evaluation-Schleifen geraten. Für Nicht-Ollama-Modelle (Cloud) bleibt das Limit bei `0.0` bestehen.

---

## 3. Implementierung & Industrielle Standards

### A. URL- & Modell-Normalisierung
Eingabefehler in den Settings (z.B. Trailing Slashes oder versehentliche Leerzeichen) werden automatisch normalisiert:
*   **Deep-URL Snipping:** `url.trim_end_matches('/')` verhindert Doppel-Slashes.
*   **Model-Name Trimming:** `model.trim()` eliminiert 404-Fehler durch Whitespace-Artefakte.

### B. Native AI Integrity (Strict Task Mode)
Koreki nutzt den nativen JSON-Modus von Ollama (`format: "json"`). 
*   **Kein Redundanz-Lärm:** Das Feld `cleanedText` wurde global entfernt (Industrial Compact Standard). Die App rekonstruiert die Ansicht bei Bedarf aus den einzelnen Tasks.
*   **Strict Error Policy:** Wenn die KI keine Aufgaben (`tasks`) findet, wird ein expliziter Error geworfen. Es erfolgt **kein** stiller Fallback auf den rohen OCR-Text, um die Datenintegrität der nachgelagerten Korrektur-Logik zu schützen.

### C. Single Source of Truth (SSoT)
Alle Einstellungen werden atomar im `useDashboardStore.ts` verwaltet und sofort im `localStorage` persistiert.

---

### D. Resilience Parser & Recall Hardening (V14/V15)
Um die Extraktionsqualität sicherzustellen, nutzt Koreki zwei Strategien:
1.  **Markdown-Stripping:** Chirurgische Entfernung von Zäunen (` ```json `) vor dem Parsing.
2.  **Recall Hardening:** Einsatz von „Absolute Duty“ Instruktionen und Neupositionierung technischer JSON-Constraints ans Ende des Prompts. Dies zwingt das Modell, das gesamte Dokument inhaltlich zu erfassen, bevor es sich auf die Formatierung konzentriert.

### E. Industrial Context Size (Dynamic Context Escalation)
Zur Vermeidung von Truncation-Fehlern bei komplexen Vision-Tasks oder großen Dokumenten wird der Kontext dynamisch gehärtet:
*   **Auto-Skalierung (Empfohlen):** Ist die Option "Automatische Kontext-Skalierung" im Einstellungen-Modal aktiviert, wird `ollamaNumCtx` im Hintergrund auf `0` gesetzt, und die Kontextgröße wird dynamisch berechnet.
*   **Base Standard / Tiers:** Bei Auto-Skalierung wird der Kontext dynamisch in drei Stufen (`8.192`, `16.384`, `32.768` Token) vergeben, um GPU-VRAM-Preallozierungen bei Ollama gering zu halten.
*   **Token-Schätzung:** Die Schätzung setzt sich aus den Textzeichen des Prompts (Zeichenlänge / 3.7), dem Antwort-Puffer (12.000 Token für Thinking-Modelle, 4.000 Token sonst) sowie einer Bildpauschale zusammen.
*   **Vision-Hardening:** Für Vision-Tasks wird jedes Bild im Request pauschal mit **8.000 Token** kalkuliert, um zu verhindern, dass Vision-Modelle (wie Qwen oder Gemma) bei der Bild-Analyse an die Kontextgrenze stoßen.
*   **Manuelle Steuerung:** Der Nutzer kann die Auto-Skalierung deaktivieren und den Kontext manuell festlegen (z.B. `2048`, `4096`, `8192` etc.).
*   **Implementierung:** Direktes Injection in die Ollama-Optionen via Rust-Backend Proxy (`src/lib/ai/ollama-logic.ts`), abgesichert durch lokale Persistierung im Desktop-Modus (`LocalAiProfileService`).

### F. Dynamic Content-Security-Policy (CSP) whitelisting (V16 breakthrough) 🛡️
In Browser-basierten Umgebungen (wie dem selbstgehosteten Community-Modus) verhindern standardmäßige Content-Security-Policies (CSP) des Webbrowsers den Zugriff auf IP-Adressen im lokalen Netzwerk (z. B. `192.168.x.x`).
*   **Cookie-gestützte Whitelist:** Sobald ein Nutzer eine lokale IP-Adresse für Ollama oder OpenAI im Einstellungs-Modal konfiguriert, wird diese in Browser-Cookies (`koreki_ollama_url` / `koreki_openai_url`) hinterlegt.
*   **Dynamische Middleware:** Eine Next.js-Middleware (`src/middleware.ts`) fängt Page-Requests ab, liest diese Cookies aus und fügt **exakt und ausschließlich die konfigurierten Ursprungsdomänen** (Origins) in die `connect-src`-Directive der CSP ein.
*   **Sicherheitsvorteil:** Dies verhindert den Einsatz von unsicheren globalen Wildcards (`*`) in der CSP für Produktivumgebungen und schützt den Browser vor unerwünschten externen Verbindungen.

---

## 4. Unterstützte Modelle & CPU-Optimierung 🛡️
Koreki unterstützt eine Auswahl an Modellen für verschiedene Hardware-Szenarien:

| Modell | Profil | Usecase |
| :--- | :--- | :--- |
| **Gemma 4 (4B)** | Multimodal | Vision, OCR & schnelle Scans (Standard) |
| **Mistral Small 3.2** | Efficient Engine | PDF-Extraktion & subtile OCR-Fehlererkennung |
| **Gemma 31B** | High-Precision | Maximale pädagogische Korrekturtiefe |

> [!CAUTION]
> **Performance Sizing & Quantization Alert:** 
> 1. **CPU vs. GPU:** Tests ergeben, dass lokale Inferenz auf reinen CPU-Systemen oft unbrauchbar ist. Eine GPU mit mind. 8GB VRAM wird empfohlen.
> 2. **Quantization Warning:** Modelle wie **Gemma 4 26B** wurden aufgrund massiver Instabilitäten bei 4-bit Quantisierung (Ollama Q4_K_M) aus dem Support entfernt. Die Quantisierung führt bei diesen Modellen zu "Grammar-Check-Loops" und GPU-Hangs, die den Workflow blockieren. Für High-Precision Tasks wird stattdessen Cloud-SaaS oder 31B+ auf potenter Hardware empfohlen.

---

## 5. Security & Compliance 🛡️
> [!IMPORTANT]
> **Data Sovereignty:** Im Ollama-Modus bleiben alle Schülerdaten (Texte & Bilder) lokal auf dem Gerät des Nutzers. Es erfolgt kein Cloud-Transfer.

---
*Dokument ID: KOREKI-TECH-011 | Revision: 1.4* 🏛️
