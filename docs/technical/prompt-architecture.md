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
> **Zusammenfassung:** Koreki trennt KI-Prompts in zwei Schichten: statische Markdown-Templates (`system.md`) f√ºr unver√§nderliche Leitplanken und einen dynamischen Prompt-Builder (`prompt-builder.ts`) f√ºr kontextabh√§ngige Runtime-Injektionen (PANG-Ergebnisse, Skills, Aufgabenstruktur, GradingMemory).
> **Zielgruppe:** Entwickler, die Prompts tunen oder neue Features in den Korrektur-Flow integrieren.

Diese Trennung ist eine bewusste Architekturentscheidung, keine technische Schuld. Sie folgt dem Prinzip: **Was sich zur Compile-Zeit nicht kennt, geh√∂rt nicht in eine statische Datei.**

---

## 2. Architektur & Systemdesign

```mermaid
graph TD
    A["system.md\n(Statische Leitplanken)"] --> C[buildCorrectionPrompt]
    B["prompt-builder.ts\n(Runtime-Injektionen)"] --> C
    C --> D["Finaler System-Prompt\nan das LLM"]

    subgraph "system.md enth√§lt"
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
        B5["Skills-Snippets\n(VLSM, RAID, Custom)"]
    end
```

### Warum diese Trennung?

| Kriterium | `system.md` | `prompt-builder.ts` |
|---|---|---|
| **Inhalt** | Leitplanken, die f√ºr **jede** Korrektur gelten | Kontext, der zur **Laufzeit** entsteht |
| **Beispiele** | Kulanz-Regeln, Namensformat, JSON-Schema | PANG-Ergebnisse, Aufgabenliste, Skills |
| **Editierbar ohne Build** | ‚o. Ja (Markdown-Datei) | ‚ùO Nein (TypeScript) |
| **Modell-spezifisch** | ‚o. Ja (Gemma) | ‚z- Indirekt (via Guards) |

---

## 3. Implementierung & Nutzung

### Was geh√∂rt in `system.md`?

Alles, was **immer** gilt, unabh√§ngig vom Aufgaben-Kontext:

- P√§dagogische Grundregeln (Kulanz, Fidelity, keine mentale Reparatur)
- JSON-Format-Vorgabe und Namenskonventionen
- Leitplanken zu Mengenbeschr√§nkungen und Unsicherheiten
- Placeholder `{{expertInstructions}}` und `{{activeSkills}}`

**Modellvarianten & Hybrid-Guards:** 
- **Qwen3.6:** Vollst√§ndig de-kloniert! Da moderne Qwen-Modelle (Qwen 2.5/3.6) standardm√§√Yiges Markdown perfekt beherrschen, nutzt Qwen nun zu 100% die hochoptimierten Standard-Default-Prompts. Qwens spezielle H√§rtungen (z. B. f√ºr Seitenwechsel oder [GESTRICHEN]-Marker) wurden fest in die Default-Dateien gemergt, wovon nun alle Modelle profitieren.
- **Gemma4:** Nutzt zu 100% die Default-System-Prompts (f√ºr perfekte Feature-Parit√§t), erweitert diese aber zur Laufzeit dynamisch um modellspezifische Formatierungs-Hacks (`guard.md` aus dem specialized Ordner).
- **Mistral-Small:** Wurde vollst√§ndig in `default` konsolidiert, um Divergenzen zu vermeiden.

### Was geh√∂rt in `prompt-builder.ts`?

Alles, was **zur Laufzeit** entschieden wird:

```typescript
// 1. Aufgabenliste ‚?" kommt aus tasksLayout, nicht vorhersehbar
system += `\n\nStruktur:\n${layoutText}`;

// 2. PANG-Block ‚?" NUR wenn t.gradingResult existiert
if (t.gradingResult) {
    vorevaluierungBlock += `### MATHEMATISCH-DETERMINISTISCHE VOREVALUIERUNG...`;
}

// 3. CalcTrace-Block ‚?" NUR wenn t.calcTraceResult existiert.
// Zwei Pfade: mit strukturierten Kriterien (targetGoal.criteria) oder legacy.
// Die Engine-Anweisung (hybrid-instruction.md) geh√∂rt in BEIDE ‚?" sonst erreichen
// Kriterien mit "von dir zu beurteilen" das Modell ohne jede Definition.

// 3. Skills ‚?" NUR wenn activeSkillIds gesetzt sind
if (activeSkillIds && activeSkillIds.length > 0) {
    skillsSection = `### AKTIVIERTE BEWERTUNGS-SKILLS...`;
}

// 4. GradingMemory ‚?" NUR wenn Calibration-Daten vorhanden
if (gradingMemory && gradingMemory.length > 0) {
    examplesText = `### WICHTIGER P√"DAGOGISCHER ERFAHRUNGSSCHATZ...`;
}
```

### Die PANG Hybrid-Instruktion (kritischer Pfad)

> [!IMPORTANT]
> Dieser Block erscheint im Prompt **nur wenn** `task.gradingResult` gesetzt ist UND `disablePointsActive === true` (Hybrid-Modus). Er steuert, wie das LLM mit PANG-Ergebnissen umgeht.

**`disablePointsActive` Entscheidungslogik (`shouldDisablePoints`):**

```typescript
// Rigide PANG-Kontrolle (LLM darf nicht abweichen):
taskType === 'vlsm' || 'skill-calc-vlsm' || 'skill-calc-raid' ‚?' false

// Hybrid (LLM entscheidet, PANG ist Empfehlung):
alle custom PANG-Graphs ‚?' true
```

**Wichtige Pr√§zisierung (seit 2026-05-29):** Die Hybrid-Instruktion f√ºr den Formel-Schritt unterscheidet explizit zwischen:

- ‚o. **Formel-Punkt berechtigt:** Abstrakte Variablennotation, z.B. `(n-1) √- k`
- ‚ùO **Nur Einsetz-Schritt:** Eingesetzte Zahlenwerte, z.B. `(4-1) √- 4 TB`

Grund: Das LLM neigte dazu, "semantische Toleranz" zu weit zu interpretieren und Formel-Punkte auch f√ºr rein numerische Ausdr√ºcke zu vergeben.

### Engine-Semantik vs. p√§dagogische Auslegung (seit 2026-08-05)

`hybrid-instruction.md` enthielt bis dahin ein festes Bewertungsschema (Formel / Einsetzen / Ergebnis) samt Folgefehler-Zwang, Formelstrenge und Einheiten-Kulanz ‚?" und regelte damit dieselben vier Themen ein zweites Mal, die auch die MINT-Skills regeln. An zwei Stellen widersprachen sich beide Ebenen.

Schwerer wog das Schema selbst: Jeder Erwartungshorizont wurde hineingepresst. Ein ‚?z1P f√ºr korrekten Rechenweg" landete im Formel-Kriterium, und weil eine Umrechnungsaufgabe keine abstrakte Formel kennt, verweigerte das Modell den Punkt bei vollst√§ndig richtiger L√∂sung.

Die Anweisung beschreibt jetzt nur noch:

- was die Sandbox feststellt (Proof A / Proof B) und dass diese Feststellungen bindend sind
- dass **der Erwartungshorizont die Punkteverteilung allein bestimmt**, mit genau den Teilschritten, die er benennt
- was einen ‚?zRechenweg" erf√ºllt: eine nachvollziehbare numerische Rechenkette. Das ist eine Definition, keine Kulanz ‚?" sie gilt deshalb auch ohne aktive Skills
- dass `pointsObtained` das Aufgabenmaximum nie √ºberschreiten darf

> [!WARNING]
> Jede p√§dagogische Auslegung ‚?" Folgefehler, Formelstrenge, Einheitentoleranz, Selbstkorrektur ‚?" ist damit **Overlay** und steckt ausschlie√Ylich in den MINT-Skills. Profile ohne diese Skills bewerten Rechenaufgaben strikt nach Erwartungshorizont, insbesondere **ohne Folgefehler-Kulanz**. Die vier Skills sind in `ModelSolutionCard.tsx` als Basis-Set f√ºr neue Profile hinterlegt, aber nicht √ºberall aktiv.

### Kriterien-Punkte: strukturiert, nicht geparst

Bei CalcTrace-Aufgaben mit `targetGoal.criteria` entscheidet die Sandbox √ºber Ziel- und Werte-Kriterien; qualitative Kriterien (Rechenweg, Formel, Begr√ºndung) beurteilt das LLM.

Dessen Punktzahl kommt √ºber das Feld **`criteriaScores`** (`[{ id, points }]`) zur√ºck. Vorher wurde sie per Regex aus den `correctionNotes` gelesen ‚?" einem Freitextfeld, dem aktive Skills ein eigenes Format vorschreiben. Der Parser fand die Kriterium-ID dann nicht und setzte das Kriterium **stillschweigend auf 0**.

Reihenfolge der Auswertung in `parseCorrectionResult`:

1. `criteriaScores` ‚?" der vorgesehene Kanal
2. Notizen-Parsing ‚?" falls das Modell das Feld ignoriert
3. Gesamtpunktzahl des Modells ‚?" falls beides scheitert

Dazu zwei harte Grenzen: sandbox-best√§tigte Kriterien sind **Untergrenze**, das Aufgabenmaximum ist **Obergrenze**.

> [!NOTE]
> Merksatz aus der Fehlersuche: Ein Feld darf entweder Notizzettel **oder** Datenkanal sein, niemals beides. Sobald zwei Instanzen dasselbe Feld beschreiben, verliert der Parser ‚?" und zwar lautlos.

---

## 4. Security & Compliance

- **Datenverarbeitung:** Der Prompt-Builder verarbeitet `studentText` und `tasksLayout` ‚?" beides kann Sch√ºler-PII enthalten. Er wird ausschlie√Ylich server-seitig ausgef√ºhrt (kein direktes Browser-Rendering).
- **GradingMemory-Bleed-Protection:** Die Injection enth√§lt explizite Anti-Halluzinations-Guards (keine √obertragung von spezifischen Werten aus Fallbeispielen auf neue Sch√ºler).
- **Audit:** Keine eigene Protokollierung im Builder; das √ºbergeordnete `ai-correct.ts` loggt via `logger`.

---

## 5. Testing & Referenzen

> [!WARNING]
> √"nderungen an der Hybrid-Instruktion in `prompt-builder.ts` m√ºssen manuell gegen reale Sch√ºlerantworten getestet werden ‚?" automatisierte Tests pr√ºfen nur die Prompt-Struktur, nicht die LLM-Reaktion.

- **Prim√§re Datei:** [`src/lib/ai/prompt-builder.ts`](../src/lib/ai/prompt-builder.ts)
- **Basis-Templates:** [`src/prompts/core/default/correction/system.md`](../src/prompts/core/default/correction/system.md)
- **Modell-Varianten:** `src/prompts/core/specialized/` (Gemma) (Mistral-Small und Qwen3.6 wurden vollst√§ndig konsolidiert)
- **Verwandte Docs:** [`docs/technical/`](./README.md)
- **Bekannte Edge Cases:**
  - Formel- vs. Einsetz-Schritt-Ambiguit√§t (behoben 2026-05-29)
  - GradingMemory-Bleed bei identischen Aufgaben-Strukturen
