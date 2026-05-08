---
title: "AI Pedagogy Framework (V13/VRE)"
description: "Framework für faire, präzise und pädagogisch sinnvolle KI-Korrekturen via VRE Parameter-Steuerung"
author: "@principal_architect"
date: "2026-04-06"
last_updated: "2026-05-09"
status: "Approved"
domain: "technical"
security_classification: "Public"
---

# AI Pedagogy Framework (V13/VRE)

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Dieses Dokument definiert die Architektur der KI-Prompts in Koreki. Es stellt sicher, dass Korrekturen mathematisch präzise (Teilpunkte), aber inhaltlich fair (semantische Kulanz) erfolgen.
> **Zielgruppe:** @principal_architect, KI-Agents, Backend-Entwickler.

Koreki ist kein generischer Chatbot, sondern ein spezialisiertes Werkzeug für Lehrer. Um Vertrauen in die KI-Bewertung zu schaffen, muss das System die Balance zwischen **struktureller Strenge** (Punkte zählen) und **pädagogischer Flexibilität** (Inhalt verstehen statt Worte klauben) halten.

---

## 2. Architektur: Das Drei-Layer-Modell
Koreki-Prompts folgen einer strikten Hierarchie, um Stabilität und Fairness zu garantieren.

### Layer 1: System-Leitplanken (Immutable)
Diese Ebene ist im Core-Template (`correction.md`) fest verankert und kann nicht durch Nutzer-Prompts außer Kraft gesetzt werden.
*   **JSON-Integrität**: Rückgabe muss dem definierten Schema entsprechen.
*   **Struktur-Treue**: Aufgaben-Namen und Max-Points aus der Musterlösung sind Gesetz.
*   **Mathematische Präzision**: Die Vergabe von Teilpunkten folgt einer logischen, nachvollziehbaren Teilabzug-Logik.

### Layer 2: Pädagogischer Core (Semantic Fairness)
Die "Anti-Pedanterie"-Regel stellt sicher, dass die KI nicht zum "Erbsenzähler" wird.
*   **Inhaltliche Kulanz**: Korrekte Konzepte in einfacher Sprache (z.B. "höhere Geschwindigkeit") werden als RICHTIG bewertet, auch wenn die Musterlösung komplexere Fachtermini ("Durchsatzoptimierung") nutzt.
*   **Semantisches Matching**: Der Fokus liegt auf der Logik der Antwort, nicht auf der Wortwahl.

### Layer 3: Fach-Spezialisierung (Expert Overlays)
Individuelle Lehrer-Instruktionen ergänzen das System, ohne die Leitplanken zu gefährden.
*   **Persona**: Setzt die Rolle (z.B. "Als Fachlehrer für Informatik...").
*   **Fokus**: Erlaubt spezifische Schwerpunkte (z.B. "Achte besonders auf Quellkritik").
*   **Status**: Diese Anweisungen sind **Ergänzungen**, keine Overrides für System-Regeln.

---

## 3. Implementierung: High-Fidelity Correctness
Um "mentale Reparaturen" der KI zu verhindern, nutzen wir folgende Guards:

*   **Fidelity Guard**: Die KI darf Schülerfehler (z.B. Rechenfehler) nicht gedanklich korrigieren, sondern muss den Text bewerten, wie er da steht.
*   **Evidence-Only**: Halluzinationen von fehlenden Antworten sind verboten; bei Platzhaltern (z.B. "/") werden konsequent 0 Punkte vergeben.

```markdown
// Beispiel für den hierarchischen Aufbau im Prompt:
1. System-Leitplanken (Mandatory)
2. Pädagogischer Core (Mandatory)
3. Fach-Spezialisierung (Custom Supplement)
4. Kontext: Musterlösung + Schülertext
```

---

## 4. Security & Compliance
> [!IMPORTANT]
> Da Prompts PII (Personenidentifizierbare Informationen) enthalten können, erfolgt die Verarbeitung ausschließlich zustandslos.

*   **Datenminimierung**: Der `clean-text`-Schritt entfernt Namen und Noise vor der Korrektur.
*   **Prompt-Injection Protection**: Durch das Hard-Coding der System-Leitplanken im Server-seitigen Template ist das Risiko minimal, dass Nutzer-Input das System-Verhalten (z.B. Crediting) manipuliert.

---

## 5. Chain-of-Thought Scratchpad (Internal Evaluation Buffer)

Koreki implementiert das **Scratchpad-Verfahren (Chain-of-Thought)** zur drastischen Steigerung der Bewertungskompetenz und arithmetischen Präzision der KI:

*   **Der "correctionNotes"-Puffer**: Vor der finalen numerischen Festlegung der Punkte (`pointsObtained`) wird die KI über das JSON-Schema gezwungen, ein internes Feld `"correctionNotes"` zu befüllen.
*   **Warum dieser Ablauf entscheidend ist:** Da Large Language Models sequentiell (Wort für Wort von links nach rechts) generieren, neigen sie zu Berechnungsfehlern oder voreiligen Schlüssen, wenn sie sofort eine Zahl (`pointsObtained`) ausgeben müssen. 
*   **Kognitiver Schmierzettel:** Durch das Vorschalten des Textfeldes `"correctionNotes"` führt die KI den logischen Abgleich (Fakten, Syntax oder schrittweise Berechnungen) explizit durch, *bevor* die Bewertung deterministisch festgelegt wird.
*   **Backend-Robustheit:** Unser isomorpher JSON-Parser in `ai-orchestrator.ts` ist so konzipiert, dass er die zusätzliche `"correctionNotes"`-Eigenschaft beim Mapping auf das Koreki-Datenmodell verwirft. Dadurch bleibt das System zu 100 % abwärtskompatibel, und es entstehen keinerlei Parsing-Fehler oder Performance-Overheads im Backend.

---

## 6. Variable Thermal Sizing (VRE Philosophy)

Ein Kernpfeiler der Koreki-Pädagogik ist die Trennung der Sampling-Strategien basierend auf dem Task-Kontext.

### Phase 1: Die "Eiszeit" (Extraction-Fidelity)
Bei der Texterkennung (Vision) und Layout-Analyse (Mapping) wird eine **Temperature von 0.0** verwendet.
*   **Rational:** In dieser Phase darf kein pädagogischer Interpretationsspielraum existieren. Die KI fungiert als rein physischer Sensor. Jede Form von Kreativität wird hier als Halluzination gewertet.

### Phase 2: Die "Pädagogische Wärme" (Grading-Kulanz)
Bei der inhaltlichen Bewertung (Correction) wird eine **Temperature von 0.7** verwendet.
*   **Rational:** Nur hier ist "Fuzzy-Logic" erwünscht, um semantische Ähnlichkeiten zu erkennen (z.B. "höhere Geschwindigkeit" vs. "Durchsatz"). Ohne diese Wärme würde die KI zu einer pedantischen Wort-Suchmaschine degradieren.

---

## 7. Testing & Referenzen
*   **Verwandte Dokumente:** [Architecture Document](./architecture.md), [OCR Integrity Standards](./ocr-integrity-standards.md)
*   **Test-Case RAID 0**: Dieser Case dient als Benchmark für die inhaltliche Kulanz. "Höhere Geschwindigkeit" muss ohne Abzug als korrekt akzeptiert werden.
*   **ADR Link**: [VRE Architecture Patch (2026-04-16)]
