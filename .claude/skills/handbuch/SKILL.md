---
name: handbuch
description: Das Handbuch für Lehrkräfte und Schul-IT unter hilfe.koreki.org — wann es mitgeändert wird, wie man schreibt, was hinein gehört und was nach docs/
---

# Skill: Handbuch (hilfe.koreki.org)

Gilt für alles unter [handbuch/](../../../handbuch/) und für jede Änderung an der App, die man auf dem Bildschirm sieht.

## 1. Drei Orte, drei Leserschaften

| Ort | Für wen | Frage |
| :--- | :--- | :--- |
| `handbuch/` → hilfe.koreki.org | Lehrkräfte, Schul-IT | *Wie benutze ich es?* |
| `docs/` | Entwickler | *Wie ist es gebaut, und warum?* |
| `compliance/` (privat) | Behörden, Betreiber | bleibt eigenständig, verweist nicht auf die beiden anderen |

Jeder Inhalt hat **genau einen** Ort. Berühren sich zwei, verweist einer auf den anderen — nie kopieren. Das Handbuch erklärt nie, warum etwas technisch so gebaut ist; `docs/` erklärt nie, wo man klickt. `docs/user-guides/` wird nicht weiter befüllt.

## 2. Wann das Handbuch mitgeändert wird

Wer einen **sichtbaren Ablauf oder eine Beschriftung** ändert, prüft das passende Kapitel im selben Commit:

| Bereich der App | Kapitel |
| :--- | :--- |
| Musterlösung, Upload, Stapelverarbeitung, Bilderkennung, Schwärzen | `korrigieren/ablauf.md`, `datenschutz/namen.md` |
| Prüfansicht, „Bitte prüfen“, KI-Vertrauen | `korrigieren/vorschlaege-pruefen.md` |
| Export-Leiste, Slips, `.koreki` | `korrigieren/exportieren.md` |
| Expertise, Skills, Erfahrungsschatz, Intelligenz (alle vier Familien) | `bewertung/index.md` |
| KI-Setup, Ollama, Mittwald, Mistral | `erste-schritte/ki-verbinden.md`, `probleme/index.md` |
| Fehlermeldungen an Lehrkräfte | `probleme/index.md` |
| Installer (`scripts/cli`), Docker, Keycloak | `schule/index.md`, `erste-schritte/installieren.md` |
| Kurzanleitung (`QuickStartModal.tsx`) | folgt wörtlich den Schritten in `korrigieren/ablauf.md` |

## 3. Wie man schreibt

- **du**, Deutsch, kurze Sätze. Begriffe aus der Tabelle in `koreki-design-system` §2 (Expertise, Vorschlag, Bilderkennung …) — kein „OCR“, „Prompt“, „Inferenz“.
- **Bezeichnungen wörtlich aus dem Code**, fett: **Korrigieren**, **Bilderkennung**. Jede Aussage über Verhalten ist am Code geprüft, bevor sie dasteht. Was nicht geprüft ist, sagt das („in der Regel“).
- **Keine Zahl ohne Beleg** (`marketing-communication` §3). Keine Vollautomatik andeuten — Koreki macht Vorschläge, die Lehrkraft entscheidet.
- **Ehrlich über Grenzen.** Wo eine Funktion weniger schützt oder kann, als ihr Name vermuten lässt, steht das im Text (Beispiel: der PIN der Slips, die lineare Einschätzung).
- **Bilder** nur aktuelle App-Aufnahmen mit echtem Inhalt, gerahmt mit `{.app-bild}`.
- Hell, kein Dark Mode — `appearance: false` in `.vitepress/config.mts` bleibt.

## 4. Links aus der App

Die App verlinkt nur über [src/lib/handbuch.ts](../../../src/lib/handbuch.ts) (`oeffneHandbuch`, Tooltip-Prop `handbuch`), immer im Browser des Systems, nie im Koreki-Fenster. Jede Stelle zeigt auf eine **feste Sprungmarke** `## Überschrift {#marke}`.

*(Wächter: `tests/unit/handbuch-links.test.ts` — Seite und Marke müssen existieren. Tote Links innerhalb des Handbuchs lassen den VitePress-Build scheitern.)*

## 5. Bauen und veröffentlichen

- Lokal: `npm --prefix handbuch run dev` (Port 5173, in `.claude/launch.json` als `handbuch`).
- Jeder Push auf `main`, der `handbuch/**` berührt, baut und veröffentlicht über `.github/workflows/handbuch.yml`.
- Neues Kapitel: Datei anlegen, in die `sidebar` in `.vitepress/config.mts` eintragen, bauen.
