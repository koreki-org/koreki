---
title: "AI Pedagogy Framework (V13/VRE)"
description: "Framework für faire, präzise und pädagogisch sinnvolle KI-Korrekturen via VRE Parameter-Steuerung"
author: "@principal_architect"
date: "2026-04-06"
last_updated: "2026-10-24"
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

### Layer 2: Pädagogischer Core (Strict-by-Default / Precision)
Die Kern-Engine bewertet standardmäßig mathematisch präzise und streng nach Vorgabe der Musterlösung.
*   **Keine implizite Kulanz**: Semantische Weichzeichner sind auf Systemebene deaktiviert, um Benotungs-Inkonsistenzen und "mentale Reparaturen" der KI bei inhaltlichen Fehlern zu verhindern.
*   **Objektivität**: Die Bewertung ist starr an Fakten gekoppelt.

### Layer 3: Fach-Spezialisierung (Expert Overlays)
Individuelle Lehrer-Instruktionen ergänzen das System und steuern das Niveau der Pedanterie.
*   **Persona**: Setzt die Rolle (z.B. "Als Fachlehrer für Informatik...").
*   **Kulanz-Steuerung**: Gewünschte Kulanzniveaus (z.B. Akzeptanz von Alltagssprache statt Fachbegriffen) werden flexibel über den Experten-Prompt (`expertInstructions`) oder aktivierte Skills gesteuert, anstatt global erzwungen zu werden.
*   **Status**: Diese Anweisungen sind **Ergänzungen**, keine Overrides für System-Leitplanken.

---

## 3. Implementierung: High-Fidelity Correctness
Um "mentale Reparaturen" der KI zu verhindern, nutzen wir folgende Guards:

*   **Fidelity Guard**: Die KI darf Schülerfehler (z.B. Rechenfehler) nicht gedanklich korrigieren, sondern muss den Text bewerten, wie er da steht.
*   **Evidence-Only**: Halluzinationen von fehlenden Antworten sind verboten; bei Platzhaltern (z.B. "/") werden konsequent 0 Punkte vergeben.

```markdown
// Beispiel für den hierarchischen Aufbau im Prompt:
1. System-Leitplanken (Mandatory)
2. Pädagogischer Core (Strict-by-Default / Precision)
3. Fach-Spezialisierung (Custom Supplement / Leniency Control)
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
*   **Der Notizzettel kommt an — seit dem 24.08.2026.**

> [!WARNING]
> **Frühere Fassungen dieses Abschnitts beschrieben das Verwerfen des Feldes als Entwurfsziel** („der Parser verwirft die zusätzliche `correctionNotes`-Eigenschaft beim Mapping, dadurch bleibt das System zu 100 % abwärtskompatibel"). Das war kein Entwurfsziel, sondern ein Fehler: `mapModelTask` in `correction-mapping.ts` baute das Ergebnis neu auf und ließ das Feld weg — bei **jeder** Textaufgabe.
>
> Die Folge widersprach genau dem Zweck, den dieser Abschnitt beschreibt: Der Denkschritt fand statt (gemessen 899 bis 4221 Zeichen, auch ohne besondere Aufforderung), aber niemand konnte ihn sehen. Die Lehrkraft bekam eine Punktzahl ohne Herleitung.
>
> Behoben, mit einem Wächter dagegen ([correction-notes-governance.test.ts](../../tests/unit/correction-notes-governance.test.ts)). Die Notizen erscheinen bei Textaufgaben im Aufklapper der Korrekturkarte — Einzelheiten in [correction-workflow.md](./correction-workflow.md#31-der-notizzettel-des-modells-correctionnotes).
>
> **Nicht überdehnen:** Der Verlust erklärt *nicht* die bekannte Nachsicht bei dünnen Antworten. Er passierte, nachdem die Punkte feststanden.

---

## 6. Variable Thermal Sizing (VRE Philosophy)

Ein Kernpfeiler der Koreki-Pädagogik ist die Trennung der Sampling-Strategien basierend auf dem Task-Kontext.

### Phase 1: Die "Eiszeit" (Extraction-Fidelity)
Bei der Texterkennung (Vision) und Layout-Analyse (Mapping) wird eine **Temperature von 0.0** verwendet.
*   **Rational:** In dieser Phase darf kein pädagogischer Interpretationsspielraum existieren. Die KI fungiert als rein physischer Sensor. Jede Form von Kreativität wird hier als Halluzination gewertet.

> [!NOTE]
> **Ausnahme für Lokale Ollama-Modelle (Inferenz-Stabilität):** 
> Bei der lokalen Ausführung über Ollama ( z. B. mit `gemma4` oder `qwen`) wird bei `clean-and-map` und `clean-and-analyze` eine höhere Mindesttemperatur verwendet (Gemma/MoE: `0.5`, Qwen: `0.3`, Sonstige: `0.2`), da extrem niedrige Temperaturen bei lokalen Modellen im JSON-Modus zu Endlosschleifen oder Inferenz-Abstürzen führen können.

### Phase 2: Die Bewertung (Grading)
Bei der inhaltlichen Bewertung (Correction) wird seit dem 25.08.2026 eine **Temperature von 0.1** verwendet (`TEMPERATURE_MINIMUM`).

*   **Rational:** Dieselbe Arbeit soll bei zweimaligem Durchlauf dieselbe Note bekommen. Die Richtigkeit steuert die Lehrkraft über Expertise-Profil, Skills und Erfahrungsschatz — die Maschine hat reproduzierbar zu sein, damit diese Steuerung überhaupt greift.

> [!IMPORTANT]
> **Die frühere Begründung für 0.7 hat die Messung nicht gestützt.** Sie lautete: Ohne „pädagogische Wärme" degradiere die KI zu einer pedantischen Wort-Suchmaschine und erkenne semantische Ähnlichkeiten nicht mehr.
>
> Geprüft am 24.08.2026 mit einer vollständigen Antwort, die bewusst in eigenen Worten und in anderer Reihenfolge als die Musterlösung formuliert war: Sie behielt bei Temperatur 0.0 **zehnmal von zehn** die volle Punktzahl — genauso wie bei 0.3. Die befürchtete Wörtlichkeit trat nicht ein.
>
> Die niedrige Temperatur räumte dagegen Ausreißer weg, die selbst sandbox-gestützte Rechenaufgaben trafen. Gemessen gegen `qwen3.6:35b`; gegen Mistral steht die Gegenprobe aus.

**Ausnahme Freitext:** Die KI-Zweitmeinung behält eine Untergrenze von 0.2 (`FREETEXT_TEMPERATURE_MINIMUM`). Sie ist die einzige Aktion, die in Prosa antwortet — ohne Schema, das die Ausgabe zum Ende zwingt. Dort können lokale Modelle bei zu kalter Einstellung an Wiederholungen hängen bleiben.


---

## 7. Der Erwartungshorizont: Leistung nennen, nicht Themengebiet

Der wirksamste Hebel auf die Bewertungsschärfe liegt **nicht** im Prompt, sondern in der
Musterlösung. Gemessen am 25.08.2026: Eine einzige umformulierte Zeile senkte die Rate
unverdient voller Punktzahlen von 7 von 10 auf 3 von 10 — stärker als sechs durchgemessene
Prompt-Varianten zusammen, deren Unterschiede am Ende im Rauschen lagen.

### Die Regel

Ein Punkteblock nennt, **was der Schüler leisten muss** — nicht, **worum es geht**.

| | |
| :--- | :--- |
| ❌ unscharf | „Pädagogischer Nutzen (2P): Vorbild- und Bildungsfunktion im Bereich **Klimaschutz**." |
| ✅ scharf | „Pädagogischer Nutzen (2P): Die Schule wirkt als Vorbild, und die Schülerinnen und Schüler lernen im Unterricht an der eigenen Anlage." |

### Warum das so stark wirkt

Das Themenwort baut eine Brücke. Ein Schüler, der nur „man muss etwas gegen den
**Klimawandel** tun" schreibt, hat von Vorbild- oder Bildungsfunktion nichts gesagt — aber
die beiden Wörter liegen nebeneinander, und das Modell verbindet sie. In seinen eigenen
Notizen liest sich das dann so:

> „Der zweite Aspekt wird **implizit** durch 'wichtig für die Umwelt' abgedeckt"

Es erfindet nichts. Es rechnet thematische Nähe als Erfüllung an. Je konkreter der Block
die geforderte Aussage benennt, desto weniger Raum bleibt für dieses „implizit".

### Für die Praxis

*   Formuliere jeden Block als **Aussage, die im Schülertext stehen muss** — nicht als
    Überschrift eines Themenfelds.
*   Vermeide das Fachgebiet als Stichwort im Block, wenn die geforderte Leistung enger
    ist als das Gebiet.
*   Das Demo-Szenario in `src/lib/demo/demoScenario.ts` ist die Vorlage, an der neue
    Nutzer das ablesen. Seine sechs Blöcke sind bewusst in dieser Form geschrieben.

> [!NOTE]
> **Daraus folgt auch, was ein Demo-Szenario nicht enthalten darf.** Bis zum 25.08.2026
> endete eine der Beispielantworten mit „Außerdem ist es gut fürs Klima" — ein Satz, der
> den Block weder klar erfüllte noch klar verfehlte. Gegen Mistral schwankte die Bewertung
> dort zwischen 0, 1 und 2 Punkten. Ein Demo-Szenario zeigt den **Ablauf**, nicht die
> Grenzen des Ermessens; Grenzfälle gehören in die Messreihe, nicht in die Vorführung.
> Der Satz ist ersetzt durch einen, der den Punkteblock eindeutig erfüllt.

---

## 8. Vier-Phasen-MINT-Korrekturmodell (Lehrer-Workflow)

Um die mathematische Bewertung für Lehrkräfte intuitiv und nachvollziehbar zu gestalten, folgt das System beim Grading von mathematisch-naturwissenschaftlichen Aufgaben (MINT) einem Vier-Phasen-Korrekturmodell. Dieses Modell spiegelt den echten Korrektur-Workflow einer Lehrkraft wider und ist modular in vier zuschaltbare Layer-3-Skills ausgelagert:

```text
+-----------------------+      +-------------------------------+
| 1. ANSATZ (Formel)     | ===> | 2. EINSETZEN & RECHNUNG       |
| (Mathematische        |      | (Einheiten, Werte & Isolation |
|  Äquivalenz-Prüfung)  |      |  vom Endergebnis)             |
+-----------------------+      +-------------------------------+
                                               ||
                                               \/
+-----------------------+      +-------------------------------+
| 4. BEPUNKTUNG         | <=== | 3. RESULTAT & FOLGEFEHLER     |
| (Punkte-Notizzettel & |      | (Logische Fehlerfortpflanzung |
|  exakte Addition)     |      |  und Selbstkorrektur-Kulanz)  |
+-----------------------+      +-------------------------------+
```

### Phase 1: Der Ansatz (Formel & Konzepte)
*   **Dokumentiert in:** `math-equivalence.md` (`skill-math-equivalence`)
*   **Fokus:** Überprüfung des konzeptionellen Verständnisses. Akzeptiert alternative Variablenbezeichnungen, weggelassene linke Seiten der Gleichung (LHS-Auslassung) sowie synonyme Darstellungsformen als vollkommen korrekt. Keine Kulanzpunkte für konzeptionell falsche Formelstrukturen.

### Phase 2: Das Einsetzen & Die Rechnung
*   **Dokumentiert in:** `math-isolated-grading.md` (`skill-math-isolated-grading`)
*   **Fokus:** Trennung von Ansatz, Rechenweg und Ergebnis. Stellt sicher, dass ein Rechenfehler beim Rechnen nicht rückwirkend die korrekte Einsetzung oder Formel abwertet (Fehler-Isolation). Regelt den korrekten Umgang mit physikalischen Einheiten und den Präfix-Ausgleich (z. B. Zusammenwirken von $mA$ und $k\Omega$ zu Volt).

### Phase 3: Das Endergebnis & Der Folgefehler
*   **Dokumentiert in:** `consecutive-errors.md` (`skill-consecutive-errors`)
*   **Fokus:** Logische Folgerichtigkeit bei Rechenfehlern. Führt ein folgerichtiges Nachrechnen mit den fehlerhaften Zwischenwerten des Schülers durch. Führt der Schüler den Rechenweg basierend auf einem fehlerhaften Wert logisch korrekt weiter, erhält er volle Punkte für diese Folgeschritte (Folgefehler-Kompensation). Erkennt Selbstkorrekturen bei Rückkehr zu korrekten Werten der Musterlösung an.

### Phase 4: Der Punkte-Notizzettel (Bepunktung)
*   **Dokumentiert in:** `math-scratchpad.md` (`skill-math-scratchpad`)
*   **Fokus:** Arithmetische Korrektheit der Punktevergabe. Zwingt die KI zur Nutzung von `correctionNotes` als Notizzettel. Hier werden alle Kriterien-Ergebnisse und die bindenden Sandbox-Ergebnisse strukturiert aufgelistet und schrittweise addiert. Dies verhindert mathematische Additionsfehler der KI bei der Zuweisung von `pointsObtained`.

---

## 9. Gleichmäßige Bewertung: Was sie trägt und was nicht

Gleichwertige Antworten sollen gleich viele Punkte bekommen — über die ganze Klasse. Was
dabei für eine Lehrkraft gilt, gilt für das Modell nicht unbedingt. Grundlage dieses
Abschnitts sind Messungen vom Oktober 2026 an Testantworten und an zwei echten,
pseudonymisierten Klassenarbeiten mit den Punkten der Lehrkraft als Maßstab.

### 9.1 Koreki bewertet jede Arbeit einzeln — nicht aufgabenweise

Lehrkräfte korrigieren aufgabenweise, weil ihre Ungleichheit **über die Zeit** entsteht:
Ermüdung, ein wandernder Maßstab, Heft 3 nicht mehr im Kopf, wenn Heft 25 dran ist. Das
Modell hat dieses Problem nicht. Jede Arbeit läuft in einem frischen Aufruf mit
identischer Anweisung, und mit festem Startwert bekommt dieselbe Arbeit immer dieselben
Punkte. Seine Ungleichheit entsteht am **Wortlaut** gleichwertiger Antworten.

Eine ganze Klasse in einem Aufruf je Aufgabe zu bewerten, bringt deshalb nicht den
Vorteil, den es beim Menschen bringt — wohl aber dessen Nachteile:

*   **Weniger Prüfung je Antwort.** Das Modell denkt bei 35 Antworten nicht länger als bei
    10. Bei kurzen, sauberen Antworten reicht das; bei echten, langen Antworten urteilt es
    pauschal und wird nachsichtig.
*   **Die Reihenfolge färbt ab.** Dieselbe Klasse anders sortiert ergab bei rund einem
    Viertel der Bewertungen andere Punkte. Eine Lehrkraft blättert zurück; das Modell
    entscheidet im Lesefluss.
*   **Ähnliche Texte verschwimmen.** Formulierungen wurden dem falschen Schüler
    zugeschrieben, und gleichwertige Antworten bekamen fast wortgleiches Feedback.

Mit Testantworten sah der Klassenaufruf trotzdem überlegen aus (92 % statt 58 % gleich
bewertet). An echten Arbeiten lag er weiter vom Urteil der Lehrkraft entfernt als der
heutige Weg. Kurz: Die Lehrkraft vergleicht gut und hält schlecht durch; das Modell hält
perfekt durch und vergleicht schlecht, sobald es viele Texte zugleich im Blick hat.

> [!IMPORTANT]
> Wer aufgabenweise Bewertung wieder vorschlägt, misst an echten Arbeiten mit dem Soll einer
> Lehrkraft — und an mehreren Reihenfolgen derselben Klasse. Ein Vergleich über das
> *Gesamtbild* der Klasse (etwa als Prüfhilfe, die Auffälligkeiten nur markiert) ist davon
> unberührt.

### 9.2 Der Erfahrungsschatz überträgt den Maßstab seiner Beispiele

Der Erfahrungsschatz wirkt stark — er änderte die Punkte bei der Mehrheit einer Klasse.
Er wirkt aber in Richtung **seiner Beispiele**, nicht automatisch in Richtung der
Lehrkraft:

*   Stammen alle Beispiele einer Aufgabe aus schwachen Arbeiten, wird die ganze Klasse
    strenger bewertet (gemessen: im Mittel fast einen Punkt).
*   Eine Auswahl über das Punktespektrum — eine starke, eine mittlere, eine schwache
    Antwort je Aufgabe — verschiebt den Maßstab nicht. Sie hilft dort, wo die Bewertung
    ohne Beispiele danebenliegt, und kann stören, wo sie schon trifft.

Für die Praxis: Beispiele so wählen, dass sie die Spannweite der Klasse abdecken, nicht
die auffälligsten Fälle.

### 9.3 Vollständiger Kontext je Arbeit

Die Bewertung einer Teilaufgabe braucht deren Ausgangslage. Steht sie im Stamm der
Hauptaufgabe (Text zwischen „Aufgabe 3“ und „a)“), muss er in der Musterlösung der
Korrektur ankommen. Bis Oktober 2026 ging er bei der Analyse verloren; wie er heute
transportiert wird, steht im [Korrektur-Workflow §3.2](./correction-workflow.md).

Zusammen mit [§7](#7-der-erwartungshorizont-leistung-nennen-nicht-themengebiet) ergibt
sich die Rangfolge der Hebel, die gemessen gewirkt haben: **scharfer Erwartungshorizont →
vollständiger Kontext → ausgewogener Erfahrungsschatz.** Umbauten am Ablauf der Korrektur
selbst haben in keiner Messung mehr gebracht.

---

## 7. Testing & Referenzen
*   **Verwandte Dokumente:** [Architecture Document](./architecture.md), [OCR Integrity Standards](./ocr-integrity-standards.md)
*   **Test-Case RAID 0**: Dieser Case dient als Benchmark für die inhaltliche Kulanz. "Höhere Geschwindigkeit" muss ohne Abzug als korrekt akzeptiert werden.
*   **ADR Link**: [VRE Architecture Patch (2026-04-16)]

