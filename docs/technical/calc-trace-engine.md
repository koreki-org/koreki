---
title: "CalcTrace Engine V9: Natively Unit-Aware Hybrid Grading Sandbox"
description: "Technische Dokumentation des KI-gestützten, deterministischen Evaluierungssystems für MINT-Fächer mit nativer physikalischer und monetärer Unit-Awareness in der mathjs Sandbox (CalcTrace V9)."
author: "@principal_architect"
date: "2026-07-15"
last_updated: "2026-09-03"
status: "Approved"
domain: "technical"
security_classification: "Internal"
---

# CalcTrace Engine V9: Natively Unit-Aware Hybrid Grading

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Die CalcTrace Engine V9 kombiniert LLM-basierte Extraktion mit einer physikalisch und monetär einheitenbewussten, hermetisch abgeriegelten `mathjs` Sandbox. Sie bewertet MINT-Rechenwege durch Trennung in **Proof A (Interne Rechenkonsistenz)** und **Proof B (Unit-Aware Zielerreichung)** und liefert strukturierte Kriterien-Ergebnisse (`perTargetResult`). Diese beiden Beweise sind der **vollständige** Umfang dessen, was die Engine verbindlich entscheidet — alles Übrige, einschließlich der Frage, ob die gegebenen Werte richtig eingesetzt wurden, beurteilt das Modell (Abschnitt 3.5).
> **Zielgruppe:** Core-Entwickler, QA-Ingenieure und Product Manager.


In MINT-Fächern hängen Berechnungen oft sequenziell voneinander ab, und Schüler verwenden unterschiedliche physikalische Einheiten (z. B. `0.001846 A` statt `1.846 mA`) sowie Währungen (z. B. `0.30 €/kWh`). CalcTrace V8 löst dies durch eine native, einheitenbewusste Sandbox-Evaluierung: Ein LLM extrahiert den Rechenweg des Schülers inklusive seiner notierten Einheiten direkt in die Formel-Strings (z.B. `4 kΩ * 1.846 mA`). Die Engine rechnet diese Formeln nativ als physikalische Größen in einer Sandbox nach und vergleicht das Resultat deterministisch mit dem `TargetGoal` des Lehrers.

---

> [!NOTE]
> **Wann aktiviert sich CalcTrace statt PANG?** Diese Weiche ist zentral in [pang-engine.md §2.1](./pang-engine.md) dokumentiert (Engine-Routing). Kurzfassung: Aufgaben, die der Upload-Klassifikator als `predictedPluginDomain: "math"` einstuft, werden deterministisch auf CalcTrace geroutet — ohne Rückfrage an die Lehrkraft, da eine einzelne Formel zu einem Zielwert mit Einheit strukturell keine PANG-Alternative braucht.

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

### 2.1 Proof A: Interne Rechenkonsistenz & Physikalische Sandbox
Die Engine wertet den extrahierten AST in einer physikalisch und monetär sensibilisierten Sandbox aus.

#### 2.1.1 Native Einheiten-Evaluierung
Enthält die extrahierte Schülerformel Einheiten (z.B. `12 V / 6500 ohm` oder `0.1916 kWh * 0.30 EUR/kWh`), wertet `math.js` diese direkt als physikalische oder monetäre Größe (Klasse `Unit`) aus. 
* **Registrierte Währungen:** Um Währungsrechnungen nativ zu stützen, sind `EUR` (inklusive Alias `€`), `USD` (inklusive `$`)- und `CHF`-Einheiten direkt in der Sandbox registriert.
* **Symbol-Ersetzung:** Eine globale Mehrfach-Ersetzung in `normalizeExpressionFormula()` bereinigt vorab griechische Buchstaben (z. B. `Ω` -> `ohm`) und Groß-/Kleinschreibung.

#### 2.1.2 Reiner Zahlen-Kontext (Context Propagation)
Um Folgefehler robust durchzurechnen, speichert der interne `context` das Ergebnis jedes Schrittes ausschließlich als **nackte Zahl** (`context[step.id] = step.result`), nicht als `math.Unit`-Objekt.
* **Begründung:** Dies verhindert systematische Brüche bei rein numerischen Einheitenkonversionen der Schüler (z.B. wenn Schritt 1 `0.8 m` ergibt und Schritt 2 durch `step_1 * 1000 = 800 mm` die Einheit ändert. Als Unit-Objekt würde `0.8 m * 1000` zu `800 m` führen, was bei der Endprüfung fälschlicherweise fehlschlägt).
* **Auswertungs-Ablauf:** Die Sandbox berechnet die Formel. Ergibt die Auswertung ein Unit-Objekt, wird dieses bei Vorliegen einer Schüler-Einheit in die Schüler-Zielskala konvertiert (z. B. `0.001846 A` in `mA` -> `1.846 mA`) und erst danach mit dem Schülerergebnis abgeglichen. Fehlt die Schüler-Einheit, wird der native Zahlenwert (`computed.toNumber()`) verglichen.


### 2.2 Proof B: Unit-Aware Ziel-Test (3-Stufen Modell)
Die Engine vergleicht die erreichten Meilensteine mit dem `TargetGoal` des Lehrers unter Nutzung der `math.unit()` API. Es gilt ein 3-Stufen-Modell (Best Practice adaptiert von STACK):

1. **Tier A (Treffer):** Zahlenwert ist physikalisch äquivalent UND die Einheit trägt (exakte Bezeichnung oder physikalisch gleichwertige Umrechnung, z. B. `0.001846 A` = `1.846 mA`). Nur hier gilt der Zielwert als erreicht.
2. **Tier B (Einheitenfehler):** Der Zahlenwert stimmt, die Einheit aber nicht — sie ist falsch (`isPrefixError`, `isUnitMismatch`) **oder fehlt ganz** (`isMissingUnit`). Der Zielwert gilt als **nicht erreicht**. `isValueMatch` bleibt gesetzt, damit die Tatsache „richtig gerechnet" nicht verloren geht und im Beweistext benannt werden kann.
3. **Tier C (Falsch):** Der berechnete Wert weicht auch nach SI-Normalisierung ab. Ziel verfehlt.

> [!IMPORTANT]
> Eine **fehlende** Einheit wird exakt wie eine **falsche** behandelt. Zuvor galt eine fehlende
> Einheit als exakter Treffer — wer gar nichts notierte, stand dadurch besser da als wer sich
> in der Einheit vertat. Die Zielerreichung stützt sich deshalb ausschließlich auf `isExactMatch`,
> nicht mehr auf `isValueMatch`.
>
> Aufgaben **ohne erwartete Einheit** sind davon unberührt: Dort wird nur der Zahlenwert verglichen.

#### Welcher Schritt über den Zielwert entscheidet

Die Fundstelle wird in dieser Reihenfolge bestimmt:

1. **Ein Schritt in der erwarteten Einheit**, der den Zielwert trifft — unabhängig von seiner Position im Rechenweg.
2. **Die Endantwort** (letzter Schritt), sofern sie den Zielwert zahlenmäßig trifft. Auch dann, wenn ihre Einheit fehlt oder falsch ist.
3. Sonst: der beste Treffer unter den übrigen Zwischenschritten (physikalisch gleichwertige Einheit vor bloßem Zahlenwert-Treffer).

Stufe 2 ist notwendig, damit ein gleichwertiger Zwischenschritt keine unvollständige Endantwort
rettet: Bei `… = 750000 KiB / 1024 = 732,42` (ohne Einheit) ist `750000 KiB` physikalisch exakt
`732,422 MiB`. Ohne den Vorrang der Endantwort würde dieser Zwischenschritt als Treffer gemeldet
und der fehlende Einheiten-Zusatz am Endergebnis nie auffallen.

Stufe 1 steht bewusst davor: Ein isolierter, unverbundener Schritt am Ende des Rechenwegs darf einen
echten Volltreffer weiter oben nicht verdrängen.

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
  perTargetResult?: PerTargetResult[];
}

// Befund je Zielwert. Bis 03.09.2026 stand diese Form zusaetzlich als
// Inline-Literal in CalcTrace.ts — beide Fassungen mussten von Hand
// gleichgehalten werden. Es gibt jetzt nur noch diesen Typ.
export interface PerTargetResult {
  targetIndex: number;
  reached: boolean;
  hasCalculationError: boolean;
  associatedStepIds: string[];
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

### 3.3 Anschauliches Zahlenbeispiel: `reached` vs. `hasCalculationError`

> [!TIP]
> **Verständnis-Tipp:** Diese beiden Parameter steuern die gerechte Punktevergabe:
> * **`reached`** prüft ausschließlich das aufgeschriebene Endergebnis (Zahl hinter dem `=`) gegen den Zielwert.
> * **`hasCalculationError`** vergleicht Formel und Endergebnis auf arithmetische Konsistenz — ohne die Musterlösung.

| Schülerantwort | `reached` | `hasCalculationError` | Didaktische Bewertung & Punktevergabe |
| :--- | :---: | :---: | :--- |
| **Fall 1:** Richtig eingesetzt, aber falsch ausgerechnet<br>`I = 12 V / 6500 Ω = 5 mA` *(erwartet: 1.846 mA)* | **`false`** | **`true`** | **0 Pkt für Ergebnis** (`proofB`), da 5 mA falsch ist.<br>Der Einsetz-Punkt ist eine Ermessensfrage und geht ans Modell. |
| **Fall 2:** Falsch eingesetzt, aber richtiges Ergebnis abgeschrieben<br>`I = 12 V / 4000 Ω = 1.846 mA` *(erwartet: 1.846 mA)* | **`true`** | **`true`** | **1 Pkt für Ergebnis** (`proofB`), da 1.846 mA am Ende dasteht.<br>Dass 4000 statt 6500 eingesetzt wurde, erkennt das Modell — `hasCalculationError` meldet zusätzlich, dass Formel und Ergebnis nicht zusammenpassen. |
| **Fall 3:** Alles perfekt eingesetzt und gerechnet<br>`I = 12 V / 6500 Ω = 1.846 mA` | **`true`** | **`false`** | **Volle Punkte.** |

> [!WARNING]
> **Hier stand bis zum 03.09.2026 ein dritter Parameter `hasCorrectValues`**, beschrieben als Beweis,
> „ob die Zahlen in der Formel (vor dem `=`) richtig eingesetzt wurden". Diese Tabelle führte für Fall 2
> `hasCorrectValues: false`. **Der Code lieferte dort `true`**: Das Feld war `!!targetStepId`, und
> `targetStepId` entstand ausschließlich dort, wo ein Schritt den ZIELWERT traf — in Fall 2 also gerade
> wegen der abgeschriebenen 1.846 mA. Gemessen wurde damit dasselbe wie bei `proofB`, nur schwächer.
>
> Die Dokumentation beschrieb eine Absicht, die nie umgesetzt war, und beschrieb sie überzeugend genug,
> dass niemand die Implementierung nachprüfte. Weil Engine-Urteile bindend sind, hing daran eine
> unumstößliche Null auf einer Messung, die etwas anderes maß als ihr Name sagte. Der Parameter und die
> zugehörige `source: 'proofValues'` sind entfallen; siehe die Entscheidung vom 03.09.2026 in Abschnitt 5.

#### JSON-Repräsentation im Sandbox-Ergebnis (für Fall 1):
```json
{
  "targetIndex": 1,
  "reached": false,
  "hasCalculationError": true,
  "associatedStepIds": ["step_2"]
}
```

### 3.4 Ausfall der Extraktion vs. leerer Rechenweg

Die Extraktion unterscheidet strikt zwei Fälle, die nach außen identisch aussehen könnten:

| Fall | Rückgabe | Konsequenz |
| :--- | :--- | :--- |
| Schüler hat keinen Rechenweg notiert | `[]` (leeres `steps`-Array) | Zielwerte gelten als verfehlt, Sandbox-Kriterien 0 Punkte — fachlich korrekt. |
| Technischer Ausfall (API-Fehler, unlesbare Antwort, fehlender Key) | wirft `CalcTraceExtractionError` | Es wird **kein** `calcTraceResult` gesetzt. Die Aufgabe fällt in den Hinweis „ohne mathematische Sandbox-Prüfung — bitte manuell gegenprüfen". |

> [!IMPORTANT]
> `extractStudentAST` darf Fehler **nicht** in ein leeres Array übersetzen. Ein leerer AST ist eine
> fachliche Aussage über die Schülerantwort; ein Ausfall ist es nicht. Werden beide gleich behandelt,
> erscheint ein Infrastrukturausfall in der Korrektur als Schülerversagen (0 Punkte plus die Notiz,
> es sei kein Rechenweg gefunden worden).

Der Selbstkorrektur-Retry ist davon ausgenommen: Scheitert ein **Nachbesserungsversuch**, bleibt das
bereits vorliegende gültige Ergebnis des ersten Durchlaufs bestehen, statt verworfen zu werden.

### 3.5 Zuständigkeit von Bewertungskriterien

Jedes Kriterium hat **genau einen Besitzer**, und der steht im Feld `source`. Weder der Prompt-Aufbau
noch die Punktevergabe leiten die Zuständigkeit aus `id` oder `label` ab.

| `source` | Entscheidet | Grundlage |
| :--- | :--- | :--- |
| `proofB` | Engine | Ergebnis **gegen die Musterlösung**: `reached && !hasCalculationError` |
| `proofA` | Engine | Rechenweg **gegen sich selbst**: der Schüler hat seine eigene Rechnung fehlerfrei ausgeführt — unabhängig davon, ob das Ziel getroffen wurde |
| `llm` | Modell | Alles Übrige — Ermessensfragen (Formelstrenge, Ansatz, Begründung) **und die Werteeinsetzung**: ob die GEGEBENEN Werte korrekt übernommen wurden, lässt sich aus dem Ergebnis nicht erschließen. Dafür bräuchte die Sandbox den Rechenweg der Musterlösung, den ein `TargetGoal` nicht enthält. |

Bei `proofA` gilt: Ist dem Zielwert kein Schritt zugeordnet — was genau dann passiert, wenn der Schüler
ihn verfehlt hat —, weicht die Prüfung auf die übrigen Schritte des Rechenwegs aus. Schritte, die einem
**anderen** Zielwert zugeordnet sind, bleiben dabei außen vor (Zielgrößen-Isolation). Ein nacktes
Ergebnis ohne Rechenausdruck trägt keinen Rechenweg-Punkt.

Die Übersetzung von Sandbox-Tatsachen in ein Erfüllt/Nicht-erfüllt passiert ausschließlich in
`resolveEngineVerdict()` ([criterion-source.ts](../../src/lib/grading/criterion-source.ts)). Prompt-Aufbau
und Punktevergabe rufen dieselbe Funktion auf — damit kann das, was der Prompt als bindend ankündigt,
nicht mehr von dem abweichen, was am Ende gezählt wird.

> [!IMPORTANT]
> Für Kriterien mit `source: 'llm'` wird die Punktzahl des Modells übernommen. Für Engine-Kriterien
> wird das Modell gar nicht erst um eine Punktzahl gebeten — der Prompt teilt sie als bereits
> entschieden mit. Es darf keinen Pfad geben, auf dem das Modell zu etwas befragt wird, dessen
> Antwort anschließend verworfen wird.

`normalizeCriterionSource()` repariert fehlende oder unbekannte `source`-Werte **einmalig beim Einlesen**
der Musterlösung (in `parseGeneratedCalcTrace`) und schreibt das Ergebnis ins Feld. Ein ausdrücklich
gesetzter gültiger Wert wird dabei immer respektiert.

---

### 3.6 Folgefehler — wer sie beurteilt

`evaluateCalcTrace` sieht den Rechenweg **einer** Aufgabe und **ihr** Ziel. Teilaufgabe a) und b) sind
getrennte Aufgaben mit je eigenem `targetGoal`. Die Sandbox kann deshalb zwei Fälle nicht
unterscheiden — beide sehen als „Ziel verfehlt, Arithmetik sauber" identisch aus:

1. Der Schüler übernimmt seinen **eigenen** falschen Wert aus a) und rechnet in b) fehlerfrei weiter.
   Ein Fehler, einmal zu bestrafen.
2. Der Schüler schreibt einen in der **Aufgabe gegebenen** Wert falsch ab. Ein zweiter, eigener Fehler.

Diese Unterscheidung ist **fachlich, nicht rechnerisch**. Sie gehört dem Modell und wird über den
mitgelieferten Skill `skill-consecutive-errors` geregelt. Die Engine trägt dazu bei, was sie belegen
kann: `proofA` bestätigt, dass der Schüler seinen eigenen Weg fehlerfrei gerechnet hat — unabhängig
davon, ob das Ziel getroffen wurde. Genau das ist die Tatsache, auf die sich eine Folgefehler-Kulanz
stützt.

`proofB` bleibt davon unberührt: Es sagt aus, ob der Musterwert dasteht, und nichts darüber hinaus.
Ein Ergebnis-Kriterium fällt bei einem Folgefehler also weiterhin — die Kulanz muss über die
Kriterien wirken, die dem Modell gehören.

> [!NOTE]
> Am 03.09.2026 stand hier ein **Gedächtnis über Aufgabengrenzen**: Die falschen Zwischenwerte einer
> verfehlten Aufgabe wurden der nächsten mitgegeben, und wenn eine dieser Zahlen in deren Rechnung
> auftauchte, galt der Ergebnispunkt als erreicht. Es ist am selben Tag wieder entfernt worden —
> siehe die Entscheidung in Abschnitt 5. Kurzfassung: Der Vergleich lief über bloße **Zahlengleichheit**
> und hätte den Rechenweg der Musterlösung gebraucht, um trennscharf zu sein.

### 3.7 Engine-Zustand gilt je Arbeit

`runLocalGradingEngines` ändert die Aufgabenliste **an Ort und Stelle**. Beide Engine-Zweige schrieben ihr
Urteil erst am Ende in die Aufgabe; scheiterte der Lauf davor, wurde der Fehler protokolliert, das Feld
behielt aber seinen alten Inhalt. Da die Oberfläche für jede Arbeit eines Stapels **dieselbe** Liste
durchreicht, konnte eine Schülerin mit dem Engine-Urteil des vorherigen Schülers bewertet werden — nicht
als sichtbare Warnung, sondern als plausible Punktzahl. Betroffen war nur der Client-Weg; serverseitig ist
der Layout-Baum je Anfrage frisch.

Seit dem 03.09.2026 werden `calcTraceResult` und `gradingResult` zu Beginn **jeder** Aufgabe gelöscht.
Bleibt ein Lauf ohne Ergebnis, greift wie vorgesehen der Hinweis „ohne Sandbox-Prüfung, bitte manuell
gegenprüfen". Abgesichert durch
[engine-zustand-je-arbeit.test.ts](../../tests/unit/ai/engine-zustand-je-arbeit.test.ts).

## 4. Security & Compliance
*   **Datenminimierung:** Es werden ausschließlich physikalische/mathematische Kennwerte und Zwischenschritte im LLM verarbeitet. 
*   **Ausführungssicherheit:** Durch die mathjs-AST-Validierung läuft die mathematische Evaluierung in einer hermetisch abgeriegelten Sandbox. Injection von Schadcode ist ausgeschlossen.

---

## 5. Testing & Referenzen
*   **Unit-Tests:** Die gesamte logische Integrität, 3-Tier Unit-Awareness und Fehlerkompensation ist in [CalcTrace.test.ts](../../tests/unit/lib/CalcTrace.test.ts) abgesichert (inklusive Folgefehler und SI-Präfix Normalisierung).
*   **Zuständigkeit der Kriterien:** [criterion-source.test.ts](../../tests/unit/lib/grading/criterion-source.test.ts) und [criterion-verdict.test.ts](../../tests/unit/grading/criterion-verdict.test.ts). Geprüft wird unter anderem, dass das entfallene `proofValues` aus gespeicherten Skills auf `llm` abgebildet wird und dass kein Kriterium mehr wegen seiner **Bezeichnung** bei der Engine landet.
*   **Einheiten, die wie eine mathjs-Funktion heißen:** [einheit-funktionsname.test.ts](../../tests/unit/grading/einheit-funktionsname.test.ts). `min` und `sec` wurden von den Funktionen Minimum und Sekans verdeckt; `30 min` war ein Typfehler statt eines Zeitraums.
*   **Zehnerpotenzen im Zielwert:** [units.test.ts](../../tests/unit/grading/units.test.ts). Ein Zielwert wie „1,2044 * 10^24" wurde bis zum 02.09.2026 in **drei** Zielwerte zerlegt (1,2044 / 10 / 24); auch eine vollkommen richtige Schülerantwort erhielt dadurch 0 Punkte.
*   **Verwandte Dokumente:** [PANG-Engine Dokumentation](./pang-engine.md), [Architekturübersicht](./architecture.md).

---

## 6. Architectural Decisions (ADR)
*   **Evaluation reiner Math-AIs (z.B. Mathstral):** Am 05.07.2026 wurde durch den Principal Architect evaluiert, ob unsere deterministische Sandbox durch dedizierte Mathematik-Modelle (wie Mistrals *Mathstral*) ersetzt werden sollte. **Entscheidung:** Abgelehnt. Obwohl diese Modelle in Benchmarks exzellent abschneiden, arbeiten sie probabilistisch. Sie behandeln physikalische Einheiten primär als semantische Textbausteine, wodurch eine 100%ige deterministische Sicherheit (insbesondere bei komplexen Folgefehlern und Einheitenumrechnungen wie z.B. A zu mA) nicht garantiert werden kann. Die Architektur bleibt bei dem hybriden Best-Practice-Ansatz (LLM zur reinen AST-Extraktion, deterministische mathjs Sandbox zur Evaluierung).
*   **Keine Präfix-Skalierung im LLM oder in der Sandbox-Basis:** Am 07.07.2026 wurde beschlossen, jegliche implizite Präfix-Skalierung (wie `getPrefixScale`) aus der Sandbox sowie manuelle Präfix-Multiplikation (wie `* 10^3`) aus den LLM-Prompts zu verbannen. **Entscheidung:** Angenommen. Da LLMs inhärent probabilistisch arbeiten, führen arithmetische Transformationen im Prompt (z. B. das Umrechnen von `2 kΩ` in `2 * 10^3`) zu Inferenz-Oszillationen und Extraktionsfehlern. Solche Ansätze brechen zudem systematisch Rechnungen, bei denen Schüler konsistent mit Nicht-SI-Einheiten rechnen (z.B. cm, mm). Stattdessen wird die Skalierungs-Brücke ausschließlich über das optionale Feld `formulaUnit` geschlagen, welches das LLM rein deklarativ setzt, falls die Formel-Zahlen und das Ergebnis unterschiedliche Einheiten-Skalen aufweisen. Die Sandbox (Code) übernimmt dann die mathematische Umrechnung absolut deterministisch.
*   **Fehlende Einheit = falsche Einheit:** Am 05.08.2026 wurde entschieden, eine fehlende Einheit genauso zu behandeln wie eine falsche. **Entscheidung:** Angenommen. Bisher galt ein Zahlenwert ohne Einheit als exakter Treffer, während derselbe Wert mit falschem Präfix den Zielwert verfehlte — nichts zu notieren brachte volle Punkte, etwas Falsches zu notieren null. Zusätzlich waren die differenzierten Meldungen im Beweistext („PRÄFIX-FEHLER", „keine Einheit angegeben") durch ihre Vorbedingungen unerreichbar, sodass das Modell bei Einheitenfehlern nur „Zielwert NICHT erreicht" erfuhr und die richtige Rechnung nicht würdigen konnte. Die Zielerreichung stützt sich nun auf `isExactMatch`; `isValueMatch` behält die Tatsache „Zahlenwert stimmt" und wird auch bei verfehlten Zielen gemeldet. **Bewusste Folge:** Die Regel „Ergebnis-Punkt setzt die korrekte Einheit voraus" liegt damit in der Engine, nicht im Erwartungshorizont. Weist eine Musterlösung Ergebnis und Einheit als getrennte Punkte aus, urteilt die Engine strenger als beabsichtigt; für diesen Fall wäre ein eigenes Einheiten-Kriterium (`proofUnit`) der nächste Schritt. Er wurde bewusst zurückgestellt, bis der Fall in echten Musterlösungen auftritt. Siehe Abschnitt 2.2.
*   **Die Punktzahl der Aufgabe wird der Generierung vorgegeben, nicht geraten:** Am 05.08.2026 wurde beschlossen, `maxPoints` der Aufgabe an die TargetGoal-Generierung zu übergeben. **Entscheidung:** Angenommen. Bisher erhielt das Modell nur den Aufgabentext und musste die Gesamtpunktzahl aus der Prosa erschließen. In Verbindung mit der strikten Regel „Summe der Kriterien = maxPoints" (bei gleichzeitigem Verbot, `maxPoints` anzupassen) verzerrte eine falsch geratene Gesamtzahl anschließend jeden einzelnen Punktwert. Beobachteter Fall: Eine 2-Punkte-Aufgabe mit dem Erwartungshorizont „jeweils 1 P Rechenweg, 1 P Ergebnis" führte zu `maxPoints: 4`, weil das Modell aus „jeweils" zwei Teilaufgaben las und das Ergebnis-Kriterium von 1 auf 3 Punkte aufblähte, um auf die Summe zu kommen. Die verzerrten Werte landeten zusätzlich im `gradingRubric` und wirkten so bis in die Korrektur. Die Punktzahl wird jetzt als verbindliche Vorgabe übergeben; weicht die Kriterien-Summe davon ab, wirft `parseGeneratedCalcTrace` und die bestehende Selbstkorrektur-Schleife der API-Route generiert mit einem gezielten Hinweis neu. Der Prompt untersagt jetzt symmetrisch beides: weder `maxPoints` noch einzelne Kriterien-Punktwerte dürfen zum Ausgleich verfälscht werden. Zusätzlich hat die in der Oberfläche gesetzte Punktzahl der Aufgabe beim Korrigieren Vorrang vor der des TargetGoals.
*   **`proofA` prüft den Rechenweg gegen sich selbst, nicht gegen die Musterlösung:** Am 05.08.2026 wurde die Bedingung für `proofA` korrigiert. **Entscheidung:** Angenommen. Bisher setzte `proofA` — wie `proofB` — voraus, dass der Zielwert der Musterlösung erreicht wurde; beide Quellen prüften damit exakt dieselbe Bedingung, und der Rechenweg-Punkt war faktisch ein zweiter Ergebnis-Punkt. Das widerspricht der Trennung von Proof A (interne Rechenkonsistenz) und Proof B (Zielerreichung), auf der die Engine aufbaut. Ein Schüler, der `12 / 4000 = 0.003` rechnet, hat die falsche Ausgangsgröße gewählt (Ergebnis- und Einsetzungs-Punkt zu Recht verloren), sich aber nicht verrechnet — der Rechenweg-Punkt steht ihm zu. Da die Engine ihre Befunde je Zielwert ablegt und einem verfehlten Zielwert keine Schritte zugeordnet werden, greift `proofA` in diesem Fall auf die übrigen Schritte des Rechenwegs zurück. **Bewusste Folge:** Rechenweg-Punkte können jetzt deterministisch vergeben werden, statt dem Modell überlassen zu werden. Siehe Abschnitt 3.5.
*   **Die Engine beweist nur noch, was sie beweisen kann (Proof A und Proof B):** Am 03.09.2026 wurden am selben Tag zwei Mechanismen wieder entfernt, die über diese beiden Beweise hinausgingen. **Entscheidung:** Angenommen, auf Weisung des Anbieters nach Architektur-Review.
    *   **`source: 'proofValues'` entfällt.** Es versprach eine deterministische Prüfung der Werteeinsetzung, stützte sich dafür aber auf `hasCorrectValues = !!targetStepId` — und `targetStepId` entstand ausschließlich dort, wo ein Schritt den ZIELWERT traf. Gemessen wurde damit dasselbe wie bei `proofB`, nur schwächer: Verfehlte der Schüler das Ziel, fiel `proofValues` zwangsläufig mit; ein Einsetzfehler bei getroffenem Ziel blieb unsichtbar. Weil Engine-Urteile bindend sind, war das schlechter als gar kein Beweis. Die Dokumentation in Abschnitt 3.3 beschrieb dabei seit jeher das beabsichtigte, nie implementierte Verhalten — die Fehlmessung überlebte vier Wochen Betrieb (05.08. bis 03.09.2026), weil die Beschreibung überzeugender war als der Code.
    *   **Das Gedächtnis über Aufgabengrenzen entfällt** (eingeführt am Vormittag desselben Tages, `consecutive-values.ts`). Es verglich bloße **Zahlenwerte**: Jedes Zwischenergebnis einer verfehlten Aufgabe wurde gegen jeden Operanden der nächsten geprüft, ein einziger Treffer kippte das Ergebnis-Kriterium bindend auf „erfüllt". Trennscharf wäre das nur mit dem Rechenweg der Musterlösung, den ein `TargetGoal` nicht enthält. Der zum Ausgleich eingebaute Trivialfilter (0, 1, 2, 10, 100, 1000) verfehlte prompt den Anlassfall (übernommener Wert: 2) und verdeckte zugleich, dass die Zahlensuche auch Ziffern aus Schritt-Bezeichnern (`step_24`) und Zehnerpotenzen las.
    **Erwogen und verworfen** wurde eine „Ersetzungsprobe" (den falschen Wert durch den richtigen ersetzen und nachrechnen) sowie eine Liste der in der Aufgabe gegebenen Werte — beides hätte funktioniert, aber der Anlass trug es nicht: Die als geprüft dokumentierte Konfiguration `qwen3.6:35b` löst den Fall ohne jede dieser Mechaniken fehlerfrei (Abweichung 0,0 Punkte); nur `mistral-medium-2604` scheiterte daran, und diese Konfiguration verfehlt ohnehin beide Genauigkeitsschwellen. **Bewusste Folge:** Die Folgefehler-Kulanz liegt wieder vollständig beim Modell und beim Skill `skill-consecutive-errors`; ein `proofB`-Kriterium fällt bei einem Folgefehler. Die Engine behält drei Zuständigkeiten (`proofA`, `proofB`, `llm`) statt vier. Gespeicherte Skills mit `proofValues` bleiben lesbar und fallen beim Einlesen auf `llm` (`VERALTETE_QUELLEN`).
*   **Engine-Ergebnisse werden je Aufgabe zurückgesetzt:** Ebenfalls am 03.09.2026, gefunden beim Architektur-Review zur Maßnahme oben. **Entscheidung:** Angenommen. Ein gescheiterter Engine-Lauf ließ das Urteil der vorigen Arbeit stehen, weil die Oberfläche dieselbe Aufgabenliste für den ganzen Stapel durchreicht. **Bewusste Folge:** Der Warnhinweis „ohne Sandbox-Prüfung“ greift jetzt tatsächlich in allen Fällen, in denen er greifen sollte. Siehe Abschnitt 3.7.
*   **`source` ist die alleinige Zuordnungsquelle für Bewertungskriterien:** Am 05.08.2026 wurde beschlossen, die Wortsuche über `id`/`label` aus Prompt-Aufbau und Punktevergabe zu entfernen. **Entscheidung:** Angenommen. Beide Stellen suchten nach *unterschiedlichen* Begriffen, wodurch das Modell zu einem Kriterium befragt werden konnte, dessen Antwort die Punktevergabe anschließend verwarf — Prompt und Ergebnis konnten auseinanderlaufen. Als Ersatz für den einzigen Fall, den das Vokabular nicht abbilden konnte, wurde `source: 'proofValues'` eingeführt (deterministische Prüfung der Werteeinsetzung über `hasCorrectValues`). Der Generator-Prompt vergibt diesen Wert jetzt direkt; die Heuristik bleibt nur als einmalige Reparatur beim Einlesen erhalten. **Bewusste Folge:** Kriterien, die ausdrücklich `source: 'llm'` tragen, aber nach Werteeinsetzung klingen, werden nun tatsächlich vom Modell bewertet statt stillschweigend von der Sandbox. Siehe Abschnitt 3.5. **Nachtrag 03.09.2026:** Der Kern dieser Entscheidung — `source` als alleinige Zuordnungsquelle — gilt unverändert und ist die Grundlage dafür, dass die Rücknahme unten überhaupt gefahrlos möglich war. Entfallen ist nur der damals eingeführte Wert `proofValues` selbst; die betroffenen Kriterien tragen jetzt `llm`, die Zuständigkeit hängt weiterhin ausschließlich am Feld.
*   **Extraktionsfehler werden nicht in ein leeres Ergebnis übersetzt:** Am 05.08.2026 wurde beschlossen, dass `extractStudentAST` technische Ausfälle als `CalcTraceExtractionError` weiterreicht, statt sie wie bisher abzufangen und `[]` zurückzugeben. **Entscheidung:** Angenommen. Ein leerer AST und ein Ausfall sind bewertungsrelevant verschiedene Aussagen: Ersteres bedeutet „der Schüler hat nicht gerechnet" und rechtfertigt 0 Punkte, Letzteres bedeutet „nicht prüfbar" und muss in die manuelle Nachkontrolle laufen. Die Gleichbehandlung führte dazu, dass ein API-Timeout in der fertigen Korrektur als Schülerversagen erschien. Der bereits vorhandene Warnpfad (`isSandboxBypassed`) übernimmt diese Fälle nun automatisch, da ohne Ergebnis kein `calcTraceResult` gesetzt wird. Siehe Abschnitt 3.4.
*   **Was die Sandbox nicht nachrechnen kann, belastet niemanden:** Am 06.08.2026 wurde entschieden, Parse-Fehler von Rechenfehlern zu trennen. **Entscheidung:** Angenommen. `sandboxErrors` mischte zwei grundverschiedene Aussagen: „die Rechnung ist widerlegt" und „wir konnten den Schritt nicht lesen". `bewerteRechenweg` wertete beides als Rechenfehler, und der Beweistext meldete beides als „Verrechner im Weg des Schülers" — das Modell übernahm diese Zuschreibung folgerichtig. Beobachteter Fall: Ein Schüler notierte die Formelzeile `E = A · η · H` und darunter die korrekte Einsetzung; die Formelzeile enthält keine Zahlen und ist deshalb naturgemäß nicht auswertbar, kostete ihn aber den Rechenweg-Punkt trotz fehlerfreier Rechnung. Punktevergabe und Beweistext filtern jetzt beide auf das Präfix `Rechenfehler`; nicht auswertbare Schritte werden ausdrücklich als „KEIN Schülerfehler" ausgewiesen und dem Modell zur fachlichen Würdigung überlassen. **Bewusste Folge:** Die Engine urteilt nur noch dort, wo sie tatsächlich gerechnet hat — im Zweifel zugunsten des Schülers, analog zur Entscheidung „Extraktionsfehler werden nicht in ein leeres Ergebnis übersetzt". Abgesichert in [calctrace-unparsable-steps.test.ts](../../tests/unit/lib/grading/calctrace-unparsable-steps.test.ts).
*   **Hochgestellte Ziffern werden vor dem Parsen umgeschrieben:** Am 06.08.2026 wurde die Normalisierung um `²`/`³` erweitert. **Entscheidung:** Angenommen. `mathjs` kennt ausschließlich `m^2`; die Schreibweise `m²` ist in Physik und Geometrie aber der Normalfall — sowohl im Schülertext als auch in der Musterlösung. Ohne Umschrift scheiterte bereits das Parsen (`Syntax error in part "² * ..."`), und über den bis dahin fehlenden Filter oben wurde daraus ein Schülerfehler. Die Umschrift liegt in `normalizeSuperscripts` und wird auf Formeln **und** Einheiten angewendet: Beide münden in denselben Parser, und wird nur eine Seite umgeschrieben, scheitert stattdessen die Einheiten-Umrechnung mit identischer Folge. **Bewusste Folge:** Zeichenketten wie `2²` werden ebenfalls als Potenz gelesen — was der mathematischen Absicht entspricht.
*   **Strikte Temperatur-Minimierung (0.0) bei der Extraktion zur Vermeidung von "Fehlerheilung":** Am 15.07.2026 wurde durch den Principal Architect beschlossen, die Temperatur für die Rechenwegs-Extraktion (`calc-trace-extraction`) zwingend auf `0.0` (Greedy Decoding) festzuschreiben und eventuelle Mindesttemperatur-Clamps für Qwen/Ollama im strukturierten JSON-Modus zu umgehen. **Entscheidung:** Angenommen. Da Schülerfehler (Rechenfehler, falsche Einheiten-Zuweisungen) für die nachgelagerte Sandbox-Prüfung zwingend *unverfälscht* abgetippt werden müssen, führt jede Temperatur > 0.0 stochastisch dazu, dass die KI Schülerfehler eigenmächtig korrigiert ("gesundheilt"). Dies verfälscht das Grading. Reine Strukturierungs-Aufgaben wie `clean-and-map` und `clean-and-analyze` (ohne Benotung) verbleiben bei `0.2`–`0.5` für elastische Layoutrekonstruktionen.



