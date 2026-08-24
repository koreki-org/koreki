---
title: "Unified AI Provider Infrastructure & Reasoning Mode"
description: "Dokumentation der provider-agnostischen KI-Architektur, des Qwen 3.6 'Thinking Mode' und der tier-spezifischen Konfigurationslogik."
author: "@principal_architect"
date: "2026-04-30"
last_updated: "2026-08-25"
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

### Serverseitiges Ollama-Routing (Community Edition)
> [!IMPORTANT]
> Um in verteilten Schulnetzen den Zugriff auf lokale oder zentrale Inferenz-Ressourcen zu garantieren, werden im Community-Modus (STANDARD) alle Ollama-Anfragen **serverseitig** durch die Next.js-API-Endpunkte geschleift.
> * **Vorteil:** Die App-Server können auf eine zentrale Ollama-Instanz zugreifen, die im privaten Schulnetzwerk gehostet wird, ohne dass Lehrkräfte Ollama auf ihren Arbeitsplatzrechnern installieren müssen.
> * **Sicherheit:** CORS-Probleme des Browsers werden vollständig vermieden, da der Server direkt via HTTP mit dem Ollama-Host kommuniziert.
> * **Keine stillen Fallbacks:** Sollte Ollama auf der Serverseite nicht erreichbar sein, wird ein Verbindungsfehler zurückgegeben und nicht unbemerkt auf SaaS-Modelle (wie Mistral oder Mittwald) ausgewichen.

---

## 3. Qwen 3.6 & Deep Thinking Mode 🧠

> [!TIP]
> **Modell-Empfehlung (Goldstandard):** Für alle Bilderkennungs- (Vision/OCR), Mapping- und Korrekturaufgaben in Koreki ist **Qwen 3.6** (insbesondere das Preset `qwen3.6:35b`) derzeit **mit Abstand das beste und leistungsfähigste Modell**. Dank seiner dynamischen Bildauflösung und der hochentwickelten Mixture-of-Experts (MoE) Inferenz liefert es präzisere OCR-Ergebnisse bei Handschriften und komplexen Tabellen als andere Open-Weight-Modelle (wie Gemma).

Koreki optimiert die Inferenz-Parameter automatisch, sobald der **Thinking Mode** (gesteuert über `enableThinking` im KI-Intelligenz-Modal) aktiviert wird, um die Reasoning-Qualität von Qwen 3.6 zu maximieren:

1.  **Temperature Hardening & Clamping** (überarbeitet am 25.08.2026):
    *   **Eine Quelle, keine Kopien:** Untergrenzen und Standardwerte stehen als Konstanten in [temperature-guidance.ts](../../src/lib/ai/temperature-guidance.ts). Oberfläche, beide Provider und der Prompt-Bau beziehen sie von dort. Zeigt der Regler eine Zahl an, die der Server anschließend anhebt, zählt die Oberfläche etwas an, das nie ankommt — genau dieser Zustand bestand vorher an drei Parametern gleichzeitig.
    *   **Korrektur:** `0.1`, zugleich Untergrenze. Kein providerspezifischer Sonderwert mehr — der OpenAI-Weg setzte hier bis dahin eigenmächtig `0.6`, sobald Thinking aktiv war.
    *   **Zweitmeinung:** Untergrenze `0.2`. Die einzige Aktion, die in Prosa antwortet; dort kann die Wiederholungsschleife tatsächlich auftreten, weil kein Schema die Ausgabe zum Ende zwingt.
    *   **Bilderkennung:** Untergrenze `0.4` bei lokalen Modellen.
    *   **Kein modellspezifischer Boden mehr:** Der frühere Aufschlag für Gemma/MoE (`0.5`) ist entfallen. Er schützte vor derselben Schleife, traf aber auch die strukturierte Korrektur, wo sie nicht entstehen kann — und kostete dort Reproduzierbarkeit.

    > [!WARNING]
    > **Frühere Fassungen dieses Dokuments beschrieben eine Backend-Sperre in `ollama-logic.ts`, die es dort nie gab.** Sie existierte ausschließlich im `openai-provider.ts` und in der Oberfläche. Wer sich darauf verließ, dass eine zu niedrige Temperatur serverseitig abgefangen wird, lag beim Ollama-Weg falsch. Die Untergrenze greift dort jetzt tatsächlich.
2.  **Context Escalation:** Setzt `max_tokens` automatisch auf bis zu `32.768`, um Raum für die Reasoning-Kette zu schaffen.
3.  **Response Sanitizing:** Der Provider bereinigt die Antwort chirurgisch von `<thinking>` Blöcken und Markdown-Fences, um die Datenintegrität für den nachgelagerten JSON-Parser zu gewährleisten.

> [!WARNING]
> **Known Issue: Mittwald & Qwen 3.6 (4k Context / enable_thinking Problem)**
> Beim Einsatz des LiteLLM Proxys (Mittwald) in Verbindung mit Qwen 3.6 kam es bei der Aktivierung von `enable_thinking: true` historisch zu Abstürzen oder Fehlern ("Unknown model name"). **In der Praxis handelt es sich hierbei jedoch höchstwahrscheinlich um ein 4k-Kontext-Limit-Problem**, da der extensive Reasoning-Output den Puffer sprengt und der Fehler unsauber maskiert wird. Das `enable_thinking` Flag wird daher nun explizit an das Backend durchgeleitet, um das KI-Intelligenz-Modal zu bedienen. Es muss jedoch infrastrukturseitig sichergestellt werden, dass die Kontextgrenzen (bis zu 32k) korrekt unterstützt werden.

---

## 4. Isomorphe Präzisions-Sperre & Mistral Medium 3.5 (System-Lock) 🏛️🔒

Um die absolute Integrität von Schülerabgaben zu schützen und unerwünschte „mentale Reparaturen“ (das semantische Glattbügeln von Schülerfehlern durch die KI) zu verhindern, verfügt die Pipeline über einen strikten **System-Lock** für Vorbereitungs- und Mapping-Schritte (`clean-and-map`, `clean-and-analyze`):

### Präzisions-Sperre (System-Lock)
* **Wirkung:** Sobald eine systeminterne Extraktions- oder Mapping-Aktion ausgeführt wird, werden benutzerdefinierte Profiltemperaturen ( z. B. eine hohe Kreativitätstemperatur von `0.7` für freies Feedback) **ignoriert**.
* **Parameter:** Diese Aktionen werden im Provider-Layer standardmäßig fest auf `temperature: 0.0` und `top_p: 0.1` (SaaS APIs wie Mistral) fixiert. Dies erzwingt ein vollständig deterministisches Verhalten (Greedy Decoding) ohne jegliche Halluzination.
* **Ollama-Sonderregelung (Lokale Inferenz):** Bei der Ausführung über lokale Ollama-Modelle weicht das System ab, um Inferenz-Schleifen und Abstürze in Verbindung mit dem JSON-Modus (`format: "json"`) zu verhindern. Hier gelten für `clean-and-map` und `clean-and-analyze` feste, modell-spezifische Parameter, die Profileinstellungen vollständig ignorieren:
  * **Gemma / MoE Modelle:** Fest auf `temperature: 0.5` und `top_p: 0.9`.
  * **Qwen Modelle:** Fest auf `temperature: 0.3` und `top_p: 0.9`.
  * **Andere Modelle:** Fest auf `temperature: 0.2` und `top_p: 0.9` (zur Stabilitätsoptimierung von `0.1` angehoben).
* **Prompt-Absicherung:** Alle `analyze-and-map` System-Prompts besitzen eine strikte Negativ-Klausel, die das Verändern von fachlichen Variablen/Formelzeichen (wie $Z$ statt $I$) explizit verbietet, um bewertungsrelevante Fehler unverfälscht abzubilden.

### Mistral Medium Standard (`mistral-medium-2604`)
* Für Vorbereitungsaufgaben (`clean-and-map` und `clean-and-analyze`) nutzt Koreki im Mistral-Modus standardmäßig das mathematisch optimierte **Mistral Medium** (`mistral-medium-2604`).
* Dies stellt eine signifikant höhere Genauigkeit und Prompt-Treue sicher als kleinere Modelle (*Small*), vermeidet jedoch den unnötigen Latenz- und Kosten-Overhead von Flaggschiff-Modellen (*Large*).

### Integrierte Vision- & Thinking-Governance
* **Vision-Steuerung:** Die benutzerspezifischen Parameter aus dem Intelligenz-Modal (`settings.visionTemperature`, `settings.visionTopP`, etc.) werden nun über alle Schnittstellen (einschließlich des OCR-Endpunkts `extract-image.ts`) getreu berücksichtigt.
* **Thinking-Governance (Selektive Deaktivierung):**
  * **Didaktische Aktionen (Thinking AN):** Der Thinking-Modus wird standardmäßig ausschließlich für didaktische Kernbereiche verwendet, die menschliche Bewertung und Freitext-Feedback erfordern. Dies betrifft die Aktionen `correction` und `second-opinion`.

    > [!NOTE]
    > **Gemessen am 24.08.2026** (120 Korrekturläufe gegen `qwen3.6:35b`, lokal): Thinking ist der wirksamste Einzelschalter für die Genauigkeit der Punktevergabe. Auf einer Aufgabe, bei der die Korrektur ohne Thinking in 1 von 10 Läufen den fachlich verteidigbaren Wert traf, traf sie ihn mit Thinking und Temperatur `0.0` in **10 von 10** — bei einer Streuung von null. Die Toleranz gegenüber eigener Formulierung litt dabei nicht: Eine vollständige Antwort in eigenen Worten behielt 10/10 die volle Punktzahl. Endlosschleifen traten in keinem der 80 Thinking-Läufe auf.
    >
    > **Der Preis ist Rechenzeit: Faktor 4,4** (14,8 s → 64,7 s je Aufgabe). Bei 25 Schülern ist das der Unterschied zwischen etwa 6 und etwa 27 Minuten. Auf einem Rechner ohne GPU, wo bereits ohne Thinking 290–500 s je Korrektur anfallen, ist das nicht zumutbar — die Voreinstellung gehört deshalb an die verfügbare Rechenleistung gebunden, nicht global gesetzt. Gegen Mistral ist der Effekt ungemessen.
    >
    > Der Rückfallwert im Ollama-Pfad stand bis zum 25.08.2026 auf `false` und widersprach damit dieser Governance, dem Standardprofil und ADR 001. Ohne geladenes Profil lief die Korrektur also ohne Denkschritt.
  * **Strukturelle Systemaktionen & Tool-Calling (Thinking AUS):** Um massive Latenz-Verzögerungen (z. B. bei Mittwald) und unvollständige JSON-Generierungen zu unterbinden, ist Thinking für alle rein strukturellen Aktionen standardmäßig global **deaktiviert** (sowohl bei Ollama als auch beim OpenAI-Provider). Dies betrifft `generate-graph`, `refine-graph`, `generate-calc-trace`, `refine-calc-trace`, `calc-trace-extraction` und `variable-extraction`. Diese Aktionen erzeugen direkt kompakte JSONs oder Tool-Calls in wenigen Sekunden.
  * **vLLM-Konformität (Mittwald) — überholt:** Frühere Revisionen dieses Dokuments beschrieben, der Thinking-Modus werde über das vLLM-spezifische `chat_template_kwargs`-Objekt gesteuert. **Das ist nicht mehr der Fall.** Mittwalds LiteLLM-Proxy stürzt bei nicht-standardisierten Zusatzfeldern (`chat_template_kwargs`, `enable_thinking`) ab, weil er die Anfrage fälschlich einem Anthropic-/Custom-Katalog zuordnet. `openai-provider.ts` sendet diese Felder deshalb bewusst **nicht** mehr; das Reasoning-Verhalten ergibt sich aus dem System-Prompt und dem nativen Modellverhalten.
  * `enableThinking` steuert damit beim OpenAI-kompatiblen Provider ausschließlich die Inferenz-Parameter (Temperatur, `top_p`, `max_tokens`), nicht mehr ein eigenes Request-Feld.

---

## 5. OCR-Strategie: Der Umschalter »Hohe Genauigkeit« 🖋️

> [!IMPORTANT]
> **Kurzfassung:** Die Schalterstellung *aus* ist für **Mistral OCR** vorgesehen. Für Handschriften reicht dessen Qualität derzeit nicht, deshalb läuft Handschrift ausschließlich über Qwen/Mittwald (Schalter *an*). Ein automatischer Rückfall existiert bewusst nicht.

### Was der Schalter tut

| Stellung | Bilderkennung | Korrektur |
| :--- | :--- | :--- |
| **Aus** (Standard) | Mistral, dedizierter Endpunkt `POST /v1/ocr`, Modell `MISTRAL_OCR_MODEL` | Mistral `mistral-medium-latest` |
| **An** (Hohe Genauigkeit) | Qwen 3.6 über Mittwald (`/chat/completions` mit `image_url`) | Qwen 3.6 über Mittwald |

Entscheidungsstellen im Code: Sichtbarkeit in `BatchHeader.tsx` (`!isLocalInstance() && provider === 'mistral'`), OCR-Routing in `extract-image.ts`, Korrektur-Routing in `ai-correct.ts`.

**Warum es den Schalter nur im SaaS gibt:** Auf Desktop- und Community-Instanzen wählt der Betreiber sein Modell ohnehin direkt in den Einstellungen — eine „Eskalation" wäre dort sinnlos. Der Schalter ist die einzige Schreibstelle für `ocrStrategy`, und der Batch-Store hält den Wert nur im Speicher (kein `persist`, Vorgabe `'standard'`). Auf lokalen Instanzen kann `isComplex` daher **strukturell nie** `true` werden. Wer diese Annahme ändert, muss die Routing-Bedingungen in beiden Endpunkten erneut prüfen.

### Warum Mistral OCR die Handschrift derzeit nicht trägt

`MISTRAL_OCR_MODEL` zeigt auf `mistral-ocr-latest`. Dieser Alias ist inzwischen auf die **vierte OCR-Generation** weitergerollt (`mistral-ocr-4-1`); die ursprüngliche Ablehnungsentscheidung fiel noch gegen eine ältere Generation. Ein erneuter Test am 10.08.2026 gegen `tests/fixtures/schuelerloesung.pdf` (echte Handschrift, 4 Seiten, ~59 s) zeigt:

* Seitenstruktur und Aufgabenzuordnung werden zuverlässig erkannt.
* Auf **Wortebene** bricht die Erkennung an genau den fachlich tragenden Stellen: „auf alle Datenträger verteilt" wurde zu „auf alle Daten-träge verkelt", „Vorteil: Höhere Geschwindigkeit" zu „vorkel: Höher Geschwindigkeit".

Für eine Bewertung ist das disqualifizierend: Ein verlesener Fachbegriff kostet den Schüler den Punkt. Mistral OCR bleibt damit für getippte und sauber gescannte Dokumente gesetzt, für Handschrift jedoch nicht ausreichend.

### Bewusste Entscheidung: kein Rückfall

Fällt Mittwald aus (ungültiger Schlüssel, erschöpftes Kontingent, Nichterreichbarkeit), weicht Koreki **nicht** selbsttätig auf Mistral OCR aus. Handschrift-Erkennung ist damit von Mittwald einfach abhängig — ein bekannter Single Point of Failure, kein Versehen.

Begründung:

1. **Prinzipientreue:** Ein automatischer Wechsel wäre ein stiller Fallback und widerspricht der Leitplanke »Keine stillen Fallbacks« im Abschnitt *Community Mode & Multi-User Isolation*. Bei einer Bewertung wiegt das schwerer als bei einer Verbindung — die Lehrkraft bekäme eine Note, die auf schlechter erkanntem Text beruht, ohne es zu bemerken.
2. **Die Qualität trägt es nicht:** Ein Sicherheitsnetz, das systematisch Fachbegriffe verfälscht, ersetzt einen Ausfall durch einen schwerer erkennbaren Fehler.
3. **Der Ausfall ist inzwischen lesbar:** Seit der Vereinheitlichung der Fehlerübersetzung (`provider-error.ts`) meldet ein Anbieter-Ausfall sich als **502** mit klarem Text („Zugang abgelehnt … Kontingent aufgebraucht") statt als generischer 500. Die Lehrkraft kann den Schalter bewusst ausschalten und mit Standard-OCR weiterarbeiten.

> [!NOTE]
> **Auslöser zur Neubewertung:** Sobald Mistral eine neue OCR-Generation veröffentlicht (`mistral-ocr-5*` oder ein neuer `-latest`-Alias), ist der Test oben zu wiederholen. Trägt die Handschrift-Qualität dann, kann diese Entscheidung fallen — dann aber als *sichtbarer* Rückfall mit Markierung der betroffenen Abgaben, nicht als stiller.

Der auskommentierte Vision-Zweig in `extract-image.ts` stammt aus der Zeit vor Qwen: Mistrals `vision`-Aktion läuft über `/chat/completions` mit `mistral-large-latest` und ist **nicht** der OCR-Pfad. Er ist bewusst stillgelegt, nicht vergessen.

---

## 6. Desktop Hardening: Der Generic AI Proxy 🛡️

Aufgrund der **Same-Origin-Policy (SOP)** im Browser können Custom-KI-Endpunkte oft nicht direkt aus der Webview aufgerufen werden (CORS-Fehler).

*   **Lösung:** Koreki nutzt ein generisches Proxy-Kommando im Rust-Backend (`src-tauri/src/lib.rs`).
*   **Mechanismus:** `execute_ai_proxy_command` nimmt den Request entgegen, führt ihn nativ im OS aus (Bypass) und reicht das Ergebnis an das Frontend zurück.
*   **Security:** Der Proxy erzwingt TLS, erlaubt aber (optional konfiguriert) `danger_accept_invalid_certs` für interne Schulnetzwerke.

---

## 7. Konfiguration (Operations)

### SaaS Environment Variables
Für die globale Bereitstellung von Mittwald/Qwen im SaaS-Modus sind folgende Variablen erforderlich:
*   `MITTWALD_API_KEY`: Globaler Schlüssel für den Standard-Reasoning-Provider.

---
*Dokument ID: KOREKI-TECH-012 | Revision: 1.2* 🏛️
