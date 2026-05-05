---
title: "UI-Analyse: Konsistenz der Status-Progression"
description: "Vergleich der UI-Zustände vor und nach der Korrektur zur Schaffung eines einheitlichen Flow-Erlebnisses."
author: "@ui_expert & @principal_architect"
date: "2026-04-27"
last_updated: "2026-04-27"
status: "Draft"
domain: "technical"
security_classification: "Internal"
---

# UI-Analyse: Konsistenz der Status-Progression

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Diese zweite Analyse fokussiert sich auf die Konsistenz zwischen dem Zustand *vor* der KI-Analyse (Import/Bereitstellung) und dem Zustand *nach* der Korrektur. Ziel ist es, die visuelle Sprache der "Erfolgsbestätigung" zu vereinheitlichen.
> **Zielgruppe:** @product_manager, @ui_expert.

Der Anwender stellt fest, dass das Erlebnis nach der Korrektur (Done-State) deutlich konsistenter und informativer ist als in der Phase davor.

---

## 2. Vergleich der UI-Zustände (Status Quo)

| Phase | Hintergrund | Icon (Links) | Primäres Badge | UX-Signal |
|---|---|---|---|---|
| **Importiert (Ready)** | `bg-background` | Checkbox (Grau) | *Keines* (verschwindet) | "Wartend / Unklar" |
| **KI läuft (Processing)** | `bg-primary/5` | `Loader2` (Lila) | *Keines* | "Aktivität" |
| **Analysiert (Done)** | `bg-emerald-50` | `CheckCircle` (Grün) | Note (Emerald) | "Erfolg / Abgeschlossen" |

### Das Konsistenz-Loch:
Der Zustand "Importiert" (Text ist da, KI noch nicht gestartet) ist aktuell der visuell schwächste, obwohl technisch bereits ein Erfolg (Phase 1) vorliegt. Dass das Kosten-Badge (`Digital Credits`) bei Erfolg einfach verschwindet, ohne durch einen positiven Indikator ersetzt zu werden, bricht die Erwartungshaltung des Nutzers.

---

## 3. Ziel-Design: Der "Industrial Flow"

Um die gewünschte Konsistenz zu erreichen, sollte der Zustand "Importiert" die visuelle Sprache des "Done"-States antizipieren.

### Vorschlag zur Vereinheitlichung (@ui_expert):

1.  **Status-Icon (Next to Name):**
    *   Einführung eines `Check`-Icons (ohne Kreis, Farbe: Sky/Blue) direkt neben dem Namen, sobald `ocrDone === true`.
    *   Dies spiegelt den `CheckCircle`, der später bei `status === 'done'` erscheint.

2.  **Badge-Progression:**
    *   Anstatt das Badge zu löschen, transformieren wir es:
    *   *Alt:* `[Digital (2 Credits)]` -> *Wird gelöscht*
    *   *Neu:* `[Digital (2 Credits)]` -> **`[Text bereit]`** (Blau/Emerald-Outline)
    *   Dies bereitet den Nutzer auf das spätere **`[Note: X]`** Badge vor.

3.  **Background-Atmosphäre:**
    *   Nutzung von `bg-blue-50/5` für "Ready"-Elemente.
    *   Dies schafft eine logische Steigerung: Weiß (Wartend) -> Hellblau (Bereit) -> Blau-Glow (Aktiv) -> Hellgrün (Abgeschlossen).

---

## 4. Technische Umsetzung
Die Logik in `BatchFileListItem.tsx` muss lediglich um einen Zwischenzustand erweitert werden:

```tsx
// Pseudocode für Konsistenz
const isReady = item.ocrDone && item.status === 'pending';

return (
  <div className={cn(
    isReady && "bg-blue-50/10 border-blue-100",
    isDone && "bg-emerald-50/10 border-emerald-100",
    // ...
  )}>
    {/* ... */}
    {isReady && <Check size={18} className="text-blue-500" />}
    {isDone && <CheckCircle size={18} className="text-emerald-500" />}
    {/* ... */}
  </div>
)
```

---

## 5. Fazit
Durch die Angleichung der "Ready"-Visualisierung an die "Done"-Visualisierung wird der gesamte Workflow intuitiver. Der Nutzer sieht sofort: "Phase 1 (Import/Moodle) ist erfolgreich, das System ist bereit für Phase 2 (KI)".

---
*Erstellt durch den @ui_expert im Rahmen der Koreki Design Excellence Initiative.*
