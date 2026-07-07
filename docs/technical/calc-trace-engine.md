---
title: "CalcTrace Engine V7: Unit-Aware Hybrid Grading Architecture"
description: "Technische Dokumentation des KI-gestützten, deterministischen Evaluierungssystems für MINT-Fächer mit 3-Stufen-Unit-Awareness (CalcTrace V7)."
author: "@principal_architect"
date: "2026-07-04"
last_updated: "2026-07-04"
status: "Approved"
domain: "technical"
security_classification: "Internal"
---

# CalcTrace Engine V7: Unit-Aware Hybrid Grading

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Die CalcTrace Engine V7 kombiniert LLM-basierte Extraktion mit einer deterministischen, hermetisch abgeriegelten `mathjs` Sandbox. Sie bewertet MINT-Rechenwege durch Trennung in **Proof A (Interne Rechenkonsistenz)** und **Proof B (Unit-Aware Zielerreichung)** nach etablierten Industrie-Standards (vgl. STACK/Maxima, WeBWorK).
> **Zielgruppe:** Core-Entwickler, QA-Ingenieure und Product Manager.

In MINT-Fächern hängen Berechnungen oft sequenziell voneinander ab, und Schüler verwenden unterschiedliche physikalische Einheiten (z. B. 0.001846 A statt 1.846 mA). CalcTrace V7 löst dies durch eine hybride Architektur: Ein LLM extrahiert den Rechenweg des Schülers in einen AST (Abstract Syntax Tree) inklusive der notierten Einheiten. Die Engine rechnet diesen AST in einer Sandbox nach und vergleicht das Resultat deterministisch mit dem `TargetGoal` des Lehrers.

---

## 2. Architektur & Systemdesign

Die Auswertung basiert auf zwei Phasen: **Extraktion** und **Sandbox-Evaluierung**.

```mermaid
graph TD
    A["Schülerantwort (Freitext)"] -->|LLM Extraction| B["Student AST (id, formula, result, unit)"]
    C["TargetGoal (Musterlösung: Wert, Einheit, Punkte)"] --> D["CalcTrace Engine (mathjs Sandbox)"]
    B --> D
    
    D --> E["Proof A: Interne Rechenkonsistenz"]
    E -->|AST syntaktisch validieren| F["Jeden Schritt mit 'math.evaluate' prüfen"]
    F -->|Fehler| G["Sandbox-Error registrieren"]
    F -->|Korrekt| H["Kontext propagieren (Folgefehler-Basis)"]
    
    D --> I["Proof B: Unit-Aware Zielerreichung"]
    I -->|Werte & Einheiten via math.unit().toSI() normalisieren| J["Vergleich Schülerwert vs Zielwert"]
    
    J --> K{"Match Typ?"}
    K -->|"Exakter Match (Wert & Einheit)"| L["Tier A: 100% Auto-Punkte"]
    K -->|"SI-Match (Wert stimmt, Einheit anders)"| M["Tier B: unitMismatch = true (LLM entscheidet)"]
    K -->|"Kein Match"| N["Tier C: isGoalReached = false"]
    
    L --> O["CalcTraceResult für Hybrid-Grading Prompt"]
    M --> O
    N --> O
```

### 2.1 Proof A: Interne Rechenkonsistenz (Folgefehler-Garantie)
Die Engine rechnet den extrahierten AST des Schülers Schritt für Schritt nach. Jeder Schritt speichert sein Ergebnis im internen Kontext. Verwendet der Schüler in Schritt 2 das Ergebnis aus Schritt 1, wird strikt mit dem *vom Schüler berechneten* Wert weitergerechnet. So können Folgefehler (richtige Formel, falscher Input) deterministisch als "Folgerichtig" erkannt werden.

### 2.2 Proof B: Unit-Aware Ziel-Test (3-Stufen Modell)
Die Engine vergleicht die erreichten Meilensteine mit dem `TargetGoal` des Lehrers unter Nutzung der `math.unit()` API. Es gilt ein 3-Stufen-Modell (Best Practice adaptiert von STACK):

1. **Tier A (Perfekt):** Zahlenwert ist physikalisch äquivalent UND die angegebene Einheit/Präfix (z. B. `mA`) stimmt exakt überein. (Auto-Zuweisung der vollen Punkte).
2. **Tier B (Unit-Mismatch):** Zahlenwert ist physikalisch äquivalent (z. B. `0.001846 A` = `1.846 mA`), aber die Einheitsbezeichnung weicht ab. Das Flag `unitMismatch` wird gesetzt. Das LLM erhält ein detailliertes Einheiten-Protokoll und vergibt Teilpunkte nach Erwartungshorizont.
3. **Tier C (Falsch):** Der berechnete Wert weicht auch nach SI-Normalisierung ab. Ziel verfehlt.

### 2.3 Formel-Sandboxing & AST-Validierung (Security & Compliance)
Um Arbitrary Code Execution und Prompt-Injection auszuschließen, nutzt CalcTrace eine gehärtete `mathjs`-Instanz.
Jede Formel durchläuft vor der Auswertung eine strenge AST-Traversierung (`validateAST`).
*   **Erlaubte Node-Typen:** Nur absolute mathematische Repräsentationen (`SymbolNode`, `ConstantNode`, `OperatorNode`, `ParenthesisNode`, `FunctionNode`) sind gestattet.
*   **Funktions-Whitelist:** Nur eine explizite Whitelist mathematischer und trigonometrischer Standardfunktionen ist zugelassen (`sin`, `cos`, `log`, `sqrt`, etc.).

---

## 3. Implementierung & Nutzung

### 3.1 Datenstrukturen & Interfaces

```typescript
// Das vom Lehrer definierte Ziel
export interface TargetGoal {
  targetValue: number | number[] | string;
  maxPoints: number;
  unit?: string;         // z.B. "mA"
  gradingRubric?: string;
}

// Der vom LLM extrahierte Rechenweg des Schülers
export interface StudentASTStep {
  id: string;            // z.B. "step_1"
  formula: string;       // z.B. "12 / 6.5"
  result: number;        // z.B. 1.846
  unit?: string;         // Vom Schüler notierte Einheit, z.B. "mA"
}

// Resultat der Sandbox-Evaluierung
export interface CalcTraceResult {
  isGoalReached: boolean;
  sandboxErrors: string[];
  reachedTargets: number[]; // Natürliche Werte in Lehrereinheit
  missedTargets: number[];
  ast: StudentASTStep[];
  totalPoints?: number;     // Nur bei Tier A (exakter Match) gesetzt
  unitMismatch?: boolean;   // Flag für Tier B
  unitDetails?: UnitComparisonDetail[];
}
```

### 3.2 Beispiel-Evaluierung (Unit-Mismatch Szenario)

```typescript
import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';

const target: TargetGoal = {
  targetValue: 1.846,
  unit: 'mA',
  maxPoints: 3
};

// Schüler hat 0.001846 A statt 1.846 mA ausgerechnet
const ast: StudentASTStep[] = [
  { id: 'step_1', formula: '12 / 6500', result: 0.001846, unit: 'A' }
];

const result = evaluateCalcTrace(ast, target);
// result.isGoalReached = true (Da 0.001846 A physikalisch == 1.846 mA)
// result.unitMismatch = true (Da "A" != "mA")
// result.totalPoints = undefined (LLM muss Teilpunkte für Einheitenfehler abziehen)
```

---

## 4. Security & Compliance
*   **Datenminimierung:** Es werden ausschließlich physikalische/mathematische Kennwerte und Zwischenschritte im LLM verarbeitet. 
*   **Ausführungssicherheit:** Durch die mathjs-AST-Validierung läuft die mathematische Evaluierung in einer hermetisch abgeriegelten Sandbox. Injection von Schadcode ist ausgeschlossen.

---

## 5. Testing & Referenzen
*   **Unit-Tests:** Die gesamte logische Integrität, 3-Tier Unit-Awareness und Fehlerkompensation ist in [CalcTrace.test.ts](file:///c:/Users/AndreasHeid/Documents/Antigravity/koreki/tests/unit/lib/CalcTrace.test.ts) abgesichert (inklusive Folgefehler und SI-Präfix Normalisierung).
*   **Verwandte Dokumente:** [PANG-Engine Dokumentation](./pang-engine.md), [Architekturübersicht](./architecture.md).

---

## 6. Architectural Decisions (ADR)
*   **Evaluation reiner Math-AIs (z.B. Mathstral):** Am 05.07.2026 wurde durch den Principal Architect evaluiert, ob unsere deterministische Sandbox durch dedizierte Mathematik-Modelle (wie Mistrals *Mathstral*) ersetzt werden sollte. **Entscheidung:** Abgelehnt. Obwohl diese Modelle in Benchmarks exzellent abschneiden, arbeiten sie probabilistisch. Sie behandeln physikalische Einheiten primär als semantische Textbausteine, wodurch eine 100%ige deterministische Sicherheit (insbesondere bei komplexen Folgefehlern und Einheitenumrechnungen wie z.B. A zu mA) nicht garantiert werden kann. Die Architektur bleibt bei dem hybriden Best-Practice-Ansatz (LLM zur reinen AST-Extraktion, deterministische mathjs Sandbox zur Evaluierung).
*   **Keine Präfix-Skalierung im LLM oder in der Sandbox-Basis:** Am 07.07.2026 wurde beschlossen, jegliche implizite Präfix-Skalierung (wie `getPrefixScale`) aus der Sandbox sowie manuelle Präfix-Multiplikation (wie `* 10^3`) aus den LLM-Prompts zu verbannen. **Entscheidung:** Angenommen. Da LLMs inhärent probabilistisch arbeiten, führen arithmetische Transformationen im Prompt (z. B. das Umrechnen von `2 kΩ` in `2 * 10^3`) zu Inferenz-Oszillationen und Extraktionsfehlern. Solche Ansätze brechen zudem systematisch Rechnungen, bei denen Schüler konsistent mit Nicht-SI-Einheiten rechnen (z.B. cm, mm). Stattdessen wird die Skalierungs-Brücke ausschließlich über das optionale Feld `formulaUnit` geschlagen, welches das LLM rein deklarativ setzt, falls die Formel-Zahlen und das Ergebnis unterschiedliche Einheiten-Skalen aufweisen. Die Sandbox (Code) übernimmt dann die mathematische Umrechnung absolut deterministisch.


