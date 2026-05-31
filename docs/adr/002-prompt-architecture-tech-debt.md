---
title: "ADR 002: Prompt-Architektur – Tech Debt & Modell-Varianten-Strategie"
description: "Festhaltung zweier offener Architekturentscheidungen: (1) Auslagerung der PANG-Hybrid-Instruktion in .md, (2) Konsolidierung oder Beibehaltung modellspezifischer Prompt-Unterordner."
author: "@principal_architect"
date: "2026-05-29"
last_updated: "2026-05-30"
status: "Approved"
domain: "technical"
security_classification: "Internal"
---

# ADR 002: Prompt-Architektur – Tech Debt & Modell-Varianten-Strategie

## 1. Executive Summary & Kontext

> [!NOTE]
> **Zusammenfassung:** Zwei zusammenhängende Architekturentscheidungen rund um die Prompt-Verwaltung sind noch offen. Sie wurden bewusst zurückgestellt, da der operative Nutzen aktuell gering ist. Dieses ADR hält sie fest, damit sie nicht vergessen werden.
> **Zielgruppe:** @principal_architect, Entwickler

Referenz-Kontext: [`docs/technical/prompt-architecture.md`](../technical/prompt-architecture.md)

---

## 2. Offener Punkt A — PANG-Hybrid-Instruktion im Code

### Problem

Die Instruktion für die Hybrid-Bewertung (Formel-Schritt vs. Einsetz-Schritt vs. Ergebnis-Schritt) ist als Template-Literal direkt in [`prompt-builder.ts`](../../src/lib/ai/prompt-builder.ts) hardcoded (~L148). Sie ist inhaltlich statisch, wird aber nur dynamisch injiziert (wenn `gradingResult` vorliegt).

```typescript
// Heute: Statischer Text im TypeScript-Code
vorevaluierungBlock += `\nWICHTIG: Halte dich bei der Vergabe der Punkte...
* Für den Formel-Schritt: Nur vergeben wenn...
* Für den Einsetz-Schritt: Vergeben wenn...`;
```

### Gewünschter Zielzustand

```
src/prompts/core/default/correction/
├── system.md                    ← Basis-Leitplanken (existiert)
├── user.md                      ← User-Prompt (existiert)
└── pang-hybrid-instruction.md   ← NEU: Statische PANG-Instruktion
```

Der Builder liest `pang-hybrid-instruction.md` und injiziert sie nur wenn `disablePointsActive === true`. Die dynamischen Werte (`${t.gradingResult.totalPoints}`, Loop über Steps) bleiben im Builder.

### Warum noch nicht umgesetzt

- Geringer Mehrwert solange der Block stabil ist
- Erhöht die Komplexität des Import-Systems im Builder
- Requires ein zweites Placeholder-Resolution-System für den `.md`-Inhalt

> [!WARNING]
> **Trigger für Umsetzung:** Sobald die PANG-Hybrid-Instruktion ein zweites Mal grundlegend überarbeitet werden muss oder ein PM/Didaktiker ohne Entwickler-Zugang Tuning vornehmen will.

---

## 3. Offener Punkt B — Modellspezifische Prompt-Unterordner

### Aktueller Zustand

```
src/prompts/core/
├── default/          ← Basis für Mistral-Large, Claude etc.
└── specialized/
    ├── gemma4/       ← Kompaktere Struktur (Gemma braucht kürzere Prompts)
    ├── mistral-small/← Fast identisch mit default (minimale Diffs)
    └── qwen3.6/      ← Stark vereinfacht (Qwen reagiert auf Numbered Lists besser)
```

### Das Problem: Divergenz ohne Governance

Die Unterordner wurden erstellt, weil Modelle unterschiedlich auf Prompt-Struktur reagieren. **Das Kernproblem:** Inhaltliche Fixes (wie die Formel/Einsetz-Korrektur vom 2026-05-29) müssen manuell in alle Varianten propagiert werden — oder sie driften auseinander.

**Aktuelle Divergenz:**

| Feature | `default` | `mistral-small` | `qwen3.6` | `gemma4` |
|---|---|---|---|---|
| Confidence-Rubrik (90-100 Skala) | ✅ Detail | ✅ Detail | ❌ Kurz | ? |
| Formel/Einsetz-Fix (2026-05-29) | ✅ | ✅ (identisch zu default) | ➖ (kein PANG) | ? |
| correctionNotes Pflicht | ✅ | ✅ | ✅ | ? |

### Zwei Strategien zur Diskussion

**Strategie 1 — Inheritance-Modell (Empfohlen)**

Ein einziges `system.md` mit modellspezifischen `{{hints}}`-Placeholdern:

```markdown
<!-- system.md -->
{{modelHint}}
Du bist ein erfahrener Lehrer...
```

```typescript
// prompt-builder.ts
const modelHint = model.includes('qwen') 
  ? '<!-- Qwen: Numbered lists preferred -->' 
  : '';
system = system.replace('{{modelHint}}', modelHint);
```

→ **Vorteil:** Eine Quelle der Wahrheit. Fixes werden überall wirksam.  
→ **Nachteil:** Weniger Flexibilität für drastisch unterschiedliche Modelle.

**Strategie 2 — Beibehaltung + Sync-Test (Status quo)**

Unterordner bleiben, aber ein automatisierter Test prüft dass alle Varianten die kritischen Pflicht-Abschnitte enthalten (z.B. `correctionNotes`, `{{expertInstructions}}`).

```typescript
// Jest-Test (noch nicht vorhanden)
it('alle Prompt-Varianten enthalten correctionNotes', () => {
  const variants = [default, qwen, gemma4, mistralSmall];
  variants.forEach(v => expect(v).toContain('correctionNotes'));
});
```

→ **Vorteil:** Volle Flexibilität pro Modell.  
→ **Nachteil:** Manuelle Pflege bleibt.

### Entscheidung & Umsetzung (2026-05-30)

> [!NOTE]
> **Beschluss & Status:**
> 1. **Mistral-Small:** Wurde vollständig in `default` konsolidiert. Der Ordner `src/prompts/core/specialized/mistral-small` wurde gelöscht und alle Routings in `prompt-builder.ts` wurden entfernt.
> 2. **Gemma4:** Umgestellt auf das neue **Prompt-Guard-Modell (Hybrid-Vererbung)**. Gemma liest nun direkt die Default-Templates aus dem `default`-Ordner (für absolute Feature-Parität bei LaTeX, predictedPluginDomain etc.). Lediglich das modellspezifische JSON-Härtungs-Snippet wird zur Laufzeit aus der Datei `guard.md` (unter `specialized/gemma4/`) ausgelesen und an den Prompt angehängt. Alle redundanten 60-Zeilen `system.md` und `user.md` Dateien von Gemma wurden gelöscht.
> 3. **Qwen3.6:** Vollständig de-kloniert und konsolidiert! Da moderne Qwen-Modelle (Qwen 2.5/3.6) standardmäßiges Markdown exzellent beherrschen, wurde der specialized Qwen-Ordner komplett gelöscht und alle Routings in `prompt-builder.ts` entfernt. Qwens hochentwickelte Härtungen (Seitenwechsel-Toleranz, Umgang mit `---` Platzhaltern und die `(?)`-Unsicherheitsregeln für OCR-Scans) wurden direkt in die Default-Prompts überführt. Alle Modelle profitieren nun von diesen Härtungsregeln, während Qwen zu 100% wartungsfrei auf den Default-Musterpfad aufschließt.

---

## 4. Security & Compliance

- Keine sicherheitsrelevanten Implikationen — reine Prompt-Texte ohne PII.
- Änderungen an Prompt-Varianten erfordern manuelle Regression-Tests gegen reale Schülerantworten.

---

## 5. Testing & Referenzen

> [!WARNING]
> Prompt-Änderungen haben keinen automatisierten Qualitätsnachweis. Jede inhaltliche Änderung muss manuell gegen mindestens 3 Schülerantworten unterschiedlicher Qualität getestet werden (sehr gut / teilweise korrekt / falsch).

- **Verwandte Docs:** [`docs/technical/prompt-architecture.md`](../technical/prompt-architecture.md)
- **Betroffene Dateien:**
  - [`src/lib/ai/prompt-builder.ts`](../../src/lib/ai/prompt-builder.ts)
  - [`src/prompts/core/`](../../src/prompts/core/)
- **Offen seit:** 2026-05-29
- **Revisit-Trigger:** Nächste Modell-Erweiterung oder zweite PANG-Instruktions-Überarbeitung
