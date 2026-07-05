---
name: Prompt Engineering
description: Standards für generische, robuste und pädagogisch faire KI-Instruktionen (Koreki AI Pipeline)
---

# Skill: Prompt Engineering & Generalization Governance

Dieses Dokument definiert den Industriestandard für die Erstellung und Pflege von KI-Prompts bei Koreki. Es ist die Referenz für den **Prompt Engineer**.

## 1. Generalization-First Principle (Zero-Case-Overfitting)
Die wichtigste Regel dieses Skills: **Ein gemeldetes Einzelfall-Problem ist niemals die Lösung, sondern nur das Symptom.**

- **Verbot wörtlicher Fallbeispiele**: Konkrete Schülerantworten, exakte Zahlenwerte oder wortgetreue Formulierungen aus einem gemeldeten Fehlerfall dürfen nicht 1:1 als Few-Shot-Beispiel in `system.md`, `user.md` oder Skill-Dateien unter `src/prompts/` einfließen. Ein Prompt, der auf einen bestimmten Schülernamen, eine bestimmte Zahl oder einen bestimmten Fachbegriff zugeschnitten ist, funktioniert nur für diesen einen Fall und verschlechtert potenziell die Bewertung strukturell anderer, aber äquivalenter Fälle.
- **Abstraktions-Pflicht**: Vor jeder Änderung muss die Regel in der Form "Wenn [strukturelle Bedingung], dann [Verhalten]" formulierbar sein — unabhängig vom Wortlaut des Auslöser-Falls. Beispiel: aus einem gemeldeten Fall zu "höhere Geschwindigkeit vs. Durchsatz" wird die generische Regel "semantisch äquivalente Fachbegriffe sind gleichwertig zu werten", nicht eine Sonderregel für genau dieses Wortpaar.
- **Test-Case ≠ Prompt-Content**: Der gemeldete Einzelfall wird als Regressionstest verwendet (siehe Abschnitt 5), nicht als Instruktionstext.

## 2. Drei-Layer-Prompt-Hierarchie (Immutable Order)
Koreki-Prompts folgen strikt dem in [AI Pedagogy Framework](../../../docs/technical/ai-pedagogy-framework.md) definierten Modell:

1.  **System-Leitplanken (Layer 1, unveränderlich)**: JSON-Integrität, Struktur-Treue (Aufgabennamen/Max-Points aus Musterlösung), mathematische Präzision.
2.  **Pädagogischer Core (Layer 2, Strict-by-Default)**: Objektive, mathematisch präzise Bewertung ohne implizite Kulanz.
3.  **Fach-Spezialisierung (Layer 3, Ergänzungs-Overlay)**: Lehrer-Persona und Kulanz-Steuerung via `expertInstructions` oder Skills — niemals ein Override der Layer 1/2.

Jede Prompt-Änderung muss angeben, welcher Layer betroffen ist. Änderungen an Layer 1 oder 2 haben eine deutlich höhere Beweislast als Ergänzungen in Layer 3.

## 3. Model-Parity & Anti-Divergenz
Koreki konsolidiert modellspezifische Prompts nach dem **Inheritance-Modell** (siehe [ADR 002](../../../docs/adr/002-prompt-architecture-tech-debt.md)): ein Default-Template plus minimale, modellspezifische Guard-Snippets (z. B. `specialized/gemma4/guard.md`), statt vollständig geklonter Ordner.
- **Konsolidierungs-Pflicht**: Neue modellspezifische Sonderbehandlung ist nur zulässig, wenn sie nicht als generisches Härtungs-Snippet in `default` funktioniert (z. B. Qwens OCR-Unsicherheitsmarker wurden erfolgreich in `default` überführt).
- **Divergenz-Check**: Bei jeder inhaltlichen Änderung an einem Template prüfst du, ob Pflicht-Bestandteile (`correctionNotes`, `{{expertInstructions}}`) in allen verbleibenden Varianten weiterhin vorhanden sind.

## 4. VRE Sampling Discipline (Variable Thermal Sizing)
Die Trennung der Sampling-Strategie nach Task-Kontext ist Gesetz, nicht Konvention:
- **Extraction-Fidelity (Vision/OCR/Mapping)**: Temperature **0.0**. Kein Interpretationsspielraum — jede Kreativität ist hier eine Halluzination.
- **Grading-Kulanz (inhaltliche Korrektur)**: Temperature **0.7**, um semantische Äquivalenz zu erkennen.
- **Lokale Modelle (Ollama)**: Abweichende Mindesttemperaturen aus Inferenz-Stabilitätsgründen (Gemma/MoE 0.5, Qwen 0.3) sind dokumentierte Ausnahmen, keine generelle Aufweichung der Regel.

Eine Prompt-Änderung, die diese Trennung verwischt (z. B. Kulanz in die Extraction-Phase einschleust), ist ein Layer-1-Verstoß.

## 5. Testing & Validation Protocol
Prompt-Änderungen haben laut [ADR 002](../../../docs/adr/002-prompt-architecture-tech-debt.md) aktuell **keinen automatisierten Qualitätsnachweis** — das macht die Generalization-First-Disziplin umso wichtiger.
<!-- PAUSIERT (2026-07-05): Noch nicht Teil des Workflows, da uns dafür aktuell die Testing-Praxis fehlt. Reaktivieren, sobald ein Mindest-Testprozess für Prompt-Änderungen etabliert ist.
- **Minimum-3-Case-Matrix**: Jede inhaltliche Änderung wird manuell gegen mindestens drei Antwort-Qualitäten getestet: sehr gut / teilweise korrekt / falsch — zusätzlich zum ursprünglich gemeldeten Fall.
-->
- **Regression-Set statt Prompt-Text**: Der gemeldete Fall wird als Testfall in die Test-Suite aufgenommen (Abstimmung mit `@qa_engineer` / [Industrial Testing Skill](../industrial_testing/SKILL.md)), nicht als Sonderregel im Prompt kodiert.
- **Struktur-Tests bevorzugt**: Wo möglich, automatisierte Tests ergänzen, die prüfen, ob Pflichtfelder (`correctionNotes`, Confidence-Rubrik) in allen Templates vorhanden bleiben, statt inhaltliche Korrektheit rein manuell zu verifizieren.

## 6. Prompt-Injection & PII Discipline
Schülertexte sind nicht-vertrauenswürdiger Input, der in Prompts eingebettet wird:
- **Redaction-First bleibt vorgelagert**: PII-Cleaning (siehe [Security Standards Skill](../security_standards/SKILL.md)) erfolgt vor dem Prompt-Assembly, nicht im Prompt selbst.
- **Rollen-Trennung**: System-Instruktionen und variabler User-Content (Schülertext, Musterlösung) bleiben strukturell getrennt (System- vs. User-Message), um Prompt-Injection durch Schülertext zu erschweren.

## 7. Content-vs-Engine Separation
Gemäß [Prompt Architecture V2](../../../docs/technical/prompt-architecture-v2.md) gilt eine klare Trennung:
- **Engine** (`src/lib/ai/prompt-builder.ts`): Logik, Platzhalter-Auflösung, Modell-Routing.
- **Content** (`src/prompts/core/`, `src/prompts/identities/`, `src/prompts/skills/`): Pädagogischer Text, in Markdown mit YAML-Frontmatter.

Neue oder geänderte Instruktionstexte gehören in die Content-Library, nicht als zusätzliche Template-Literale in die Engine — auch nicht "vorübergehend".

## 8. Format- & Integritäts-Guards
Diese bestehenden Mechanismen dürfen durch Prompt-Änderungen nicht geschwächt werden:
- **Fidelity Guard**: Schülerfehler dürfen von der KI nicht gedanklich korrigiert werden.
- **Evidence-Only**: Keine Halluzination fehlender Antworten; Platzhalter erhalten konsequent 0 Punkte.
- **Chain-of-Thought Scratchpad**: Das Pflichtfeld `correctionNotes` muss vor der numerischen Punktevergabe befüllt werden.
- **Confidence Brake**: Strukturelle Abweichungen (Namens-Mismatch etc.) müssen zuverlässig `overallConfidence: 0` auslösen.

---
*Status: Approved (V1)*
