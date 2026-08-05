---
title: "Prompt-Architektur: Template + Runtime-Injection"
description: "Warum Koreki-Prompts auf zwei Ebenen (system.md + prompt-builder.ts) verteilt sind und welche Regeln dabei gelten."
author: "@principal_architect"
date: "2026-05-29"
last_updated: "2026-08-05"
status: "Approved"
domain: "technical"
security_classification: "Internal"
---

# Prompt-Architektur: Template + Runtime-Injection

## 1. Executive Summary & Kontext

> [!NOTE]
> **Zusammenfassung:** Koreki trennt KI-Prompts in zwei Schichten: statische Markdown-Templates (`system.md`) für unveränderliche Leitplanken und einen dynamischen Prompt-Builder (`prompt-builder.ts`) für kontextabhängige Runtime-Injektionen (PANG-Ergebnisse, Skills, Aufgabenstruktur, GradingMemory).
> **Zielgruppe:** Entwickler, die Prompts tunen oder neue Features in den Korrektur-Flow integrieren.

Diese Trennung ist eine bewusste Architekturentscheidung, keine technische Schuld. Sie folgt dem Prinzip: **Was sich zur Compile-Zeit nicht kennt, gehört nicht in eine statische Datei.**

---

## 2. Architektur & Systemdesign

```mermaid
graph TD
    A["system.md\n(Statische Leitplanken)"] --> C[buildCorrectionPrompt]
    B["prompt-builder.ts\n(Runtime-Injektionen)"] --> C
    C --> D["Finaler System-Prompt\nan das LLM"]

    subgraph "system.md enthält"
        A1["Basis-Korrekturregeln"]
        A2["JSON-Format-Vorgabe"]
        A3["Fidelity & Kulanz-Regeln"]
        A4["{{expertInstructions}}\n(Placeholder)"]
        A5["{{activeSkills}}\n(Placeholder)"]
    end

    subgraph "prompt-builder.ts injiziert"
        B1["Aufgabenliste\n(tasksLayout)"]
        B2["PANG Vorevaluierung\n(nur wenn gradingResult vorhanden)"]
        B3["Engine-Anweisung\n(beide CalcTrace-Pfade)"]
        B4["GradingMemory-Beispiele\n(aus DB)"]
        B5["Skills-Snippets\n(VLSM, Custom)"]
    end
```

### Warum diese Trennung?

| Kriterium | `system.md` | `prompt-builder.ts` |
|---|---|---|
| **Inhalt** | Leitplanken, die für **jede** Korrektur gelten | Kontext, der zur **Laufzeit** entsteht |
| **Beispiele** | Kulanz-Regeln, Namensformat, JSON-Schema | PANG-Ergebnisse, Aufgabenliste, Skills |
| **Editierbar ohne Build** | �o. Ja (Markdown-Datei) | �O Nein (TypeScript) |
| **Modell-spezifisch** | �o. Ja (Gemma) | �z- Indirekt (via Guards) |

---

## 3. Implementierung & Nutzung

### Was gehört in `system.md`?

Alles, was **immer** gilt, unabhängig vom Aufgaben-Kontext:

- Pädagogische Grundregeln (Kulanz, Fidelity, keine mentale Reparatur)
- JSON-Format-Vorgabe und Namenskonventionen
- Leitplanken zu Mengenbeschränkungen und Unsicherheiten
- Placeholder `{{expertInstructions}}` und `{{activeSkills}}`

**Modellvarianten & Hybrid-Guards:** 
- **Qwen3.6:** Vollständig de-kloniert! Da moderne Qwen-Modelle (Qwen 2.5/3.6) standardmä�Yiges Markdown perfekt beherrschen, nutzt Qwen nun zu 100% die hochoptimierten Standard-Default-Prompts. Qwens spezielle Härtungen (z. B. für Seitenwechsel oder [GESTRICHEN]-Marker) wurden fest in die Default-Dateien gemergt, wovon nun alle Modelle profitieren.
- **Gemma4:** Nutzt zu 100% die Default-System-Prompts (für perfekte Feature-Parität), erweitert diese aber zur Laufzeit dynamisch um modellspezifische Formatierungs-Hacks (`guard.md` aus dem specialized Ordner).
- **Mistral-Small:** Wurde vollständig in `default` konsolidiert, um Divergenzen zu vermeiden.

### Was gehört in `prompt-builder.ts`?

Alles, was **zur Laufzeit** entschieden wird:

```typescript
// 1. Aufgabenliste �?" kommt aus tasksLayout, nicht vorhersehbar
system += `\n\nStruktur:\n${layoutText}`;

// 2. PANG-Block �?" NUR wenn t.gradingResult existiert
if (t.gradingResult) {
    vorevaluierungBlock += `### MATHEMATISCH-DETERMINISTISCHE VOREVALUIERUNG...`;
}

// 3. CalcTrace-Block �?" NUR wenn t.calcTraceResult existiert.
// Zwei Pfade: mit strukturierten Kriterien (targetGoal.criteria) oder legacy.
// Die Engine-Anweisung (hybrid-instruction.md) gehört in BEIDE �?" sonst erreichen
// Kriterien mit "von dir zu beurteilen" das Modell ohne jede Definition.

// 3. Skills �?" NUR wenn activeSkillIds gesetzt sind
if (activeSkillIds && activeSkillIds.length > 0) {
    skillsSection = `### AKTIVIERTE BEWERTUNGS-SKILLS...`;
}

// 4. GradingMemory �?" NUR wenn Calibration-Daten vorhanden
if (gradingMemory && gradingMemory.length > 0) {
    examplesText = `### WICHTIGER P�"DAGOGISCHER ERFAHRUNGSSCHATZ...`;
}
```

### Die PANG Hybrid-Instruktion (kritischer Pfad)

> [!IMPORTANT]
> Dieser Block erscheint im Prompt **nur wenn** `task.gradingResult` gesetzt ist UND `disablePointsActive === true` (Hybrid-Modus). Er steuert, wie das LLM mit PANG-Ergebnissen umgeht.

**`disablePointsActive` Entscheidungslogik (`shouldDisablePoints`):**

```typescript
// Rigide PANG-Kontrolle (LLM darf nicht abweichen):
taskType === 'vlsm' || 'skill-calc-vlsm' -> false

// Hybrid (LLM entscheidet, PANG ist Empfehlung):
alle custom PANG-Graphs �?' true
```

**Wichtige Präzisierung (seit 2026-05-29):** Die Hybrid-Instruktion für den Formel-Schritt unterscheidet explizit zwischen:

- �o. **Formel-Punkt berechtigt:** Abstrakte Variablennotation, z.B. `(n-1) �- k`
- �O **Nur Einsetz-Schritt:** Eingesetzte Zahlenwerte, z.B. `(4-1) �- 4 TB`

Grund: Das LLM neigte dazu, "semantische Toleranz" zu weit zu interpretieren und Formel-Punkte auch für rein numerische Ausdrücke zu vergeben.

### Engine-Semantik vs. pädagogische Auslegung (seit 2026-08-05)

`hybrid-instruction.md` enthielt bis dahin ein festes Bewertungsschema (Formel / Einsetzen / Ergebnis) samt Folgefehler-Zwang, Formelstrenge und Einheiten-Kulanz �?" und regelte damit dieselben vier Themen ein zweites Mal, die auch die MINT-Skills regeln. An zwei Stellen widersprachen sich beide Ebenen.

Schwerer wog das Schema selbst: Jeder Erwartungshorizont wurde hineingepresst. Ein �?z1P für korrekten Rechenweg" landete im Formel-Kriterium, und weil eine Umrechnungsaufgabe keine abstrakte Formel kennt, verweigerte das Modell den Punkt bei vollständig richtiger Lösung.

Die Anweisung beschreibt jetzt nur noch:

- was die Sandbox feststellt (Proof A / Proof B) und dass diese Feststellungen bindend sind
- dass **der Erwartungshorizont die Punkteverteilung allein bestimmt**, mit genau den Teilschritten, die er benennt
- was einen �?zRechenweg" erfüllt: eine nachvollziehbare numerische Rechenkette. Das ist eine Definition, keine Kulanz �?" sie gilt deshalb auch ohne aktive Skills
- dass `pointsObtained` das Aufgabenmaximum nie überschreiten darf

> [!WARNING]
> Jede pädagogische Auslegung �?" Folgefehler, Formelstrenge, Einheitentoleranz, Selbstkorrektur �?" ist damit **Overlay** und steckt ausschlie�Ylich in den MINT-Skills. Profile ohne diese Skills bewerten Rechenaufgaben strikt nach Erwartungshorizont, insbesondere **ohne Folgefehler-Kulanz**. Die vier Skills sind in `ModelSolutionCard.tsx` als Basis-Set für neue Profile hinterlegt, aber nicht überall aktiv.

### Kriterien-Punkte: strukturiert, nicht geparst

Bei CalcTrace-Aufgaben mit `targetGoal.criteria` entscheidet die Sandbox über Ziel- und Werte-Kriterien; qualitative Kriterien (Rechenweg, Formel, Begründung) beurteilt das LLM.

Dessen Punktzahl kommt über das Feld **`criteriaScores`** (`[{ id, points }]`) zurück. Vorher wurde sie per Regex aus den `correctionNotes` gelesen �?" einem Freitextfeld, dem aktive Skills ein eigenes Format vorschreiben. Der Parser fand die Kriterium-ID dann nicht und setzte das Kriterium **stillschweigend auf 0**.

Reihenfolge der Auswertung in `parseCorrectionResult`:

1. `criteriaScores` �?" der vorgesehene Kanal
2. Notizen-Parsing �?" falls das Modell das Feld ignoriert
3. Gesamtpunktzahl des Modells �?" falls beides scheitert

Dazu zwei harte Grenzen: sandbox-bestätigte Kriterien sind **Untergrenze**, das Aufgabenmaximum ist **Obergrenze**.

> [!NOTE]
> Merksatz aus der Fehlersuche: Ein Feld darf entweder Notizzettel **oder** Datenkanal sein, niemals beides. Sobald zwei Instanzen dasselbe Feld beschreiben, verliert der Parser �?" und zwar lautlos.

---

## 4. Security & Compliance

- **Datenverarbeitung:** Der Prompt-Builder verarbeitet `studentText` und `tasksLayout` �?" beides kann Schüler-PII enthalten. Er wird ausschlie�Ylich server-seitig ausgeführt (kein direktes Browser-Rendering).
- **GradingMemory-Bleed-Protection:** Die Injection enthält explizite Anti-Halluzinations-Guards (keine �obertragung von spezifischen Werten aus Fallbeispielen auf neue Schüler).
- **Audit:** Keine eigene Protokollierung im Builder; das übergeordnete `ai-correct.ts` loggt via `logger`.

---

## 5. Testing & Referenzen

> [!WARNING]
> �"nderungen an der Hybrid-Instruktion in `prompt-builder.ts` müssen manuell gegen reale Schülerantworten getestet werden �?" automatisierte Tests prüfen nur die Prompt-Struktur, nicht die LLM-Reaktion.

- **Primäre Datei:** [`src/lib/ai/prompt-builder.ts`](../src/lib/ai/prompt-builder.ts)
- **Basis-Templates:** [`src/prompts/core/default/correction/system.md`](../src/prompts/core/default/correction/system.md)
- **Modell-Varianten:** `src/prompts/core/specialized/` (Gemma) (Mistral-Small und Qwen3.6 wurden vollständig konsolidiert)
- **Verwandte Docs:** [`docs/technical/`](./README.md)
- **Bekannte Edge Cases:**
  - Formel- vs. Einsetz-Schritt-Ambiguität (behoben 2026-05-29)
  - GradingMemory-Bleed bei identischen Aufgaben-Strukturen
