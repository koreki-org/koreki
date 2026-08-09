---
name: marketing-communication
description: Leitplanken für die Koreki-Aussendarstellung — Social-Media-Grafiken, Bildtexte und Werbeaussagen auf Landingpage und Kanälen
---

# Skill: Marketing & Aussendarstellung

Operatives Werkzeug für den **Product Manager** (Botschaft) und den **UI Expert** (Gestaltung). Gilt für Instagram, LinkedIn und YouTube ebenso wie für Werbetexte auf der Landingpage.

## 1. Wo die Artefakte liegen

| Ort | Inhalt |
| :--- | :--- |
| [marketing/](../../../marketing/) | Vorlagen als HTML, `brand.css`, `render.js` — versioniert |
| `marketing/out/` | Renderergebnisse als PNG — gitignored, jederzeit reproduzierbar |
| `internal/marketing/captions.md` | Bildtexte und die Bewertung konkreter Werbeaussagen — gitignored |

**Nie eine Grafik von Null bauen.** `marketing/README.md` erklärt Formate, Story-Safe-Zones und die Rechnung für Screenshot-Ausschnitte. Ein neuer Post entsteht durch Kopieren einer bestehenden Vorlage, nicht durch Neuerfindung.

## 2. Marketing folgt dem Design System

Koreki hat **keinen Dark Mode**. `globals.css` definiert mit `--background: 220 33% 98%` genau eine Flächenfarbe, und der Style Guide verbietet schwarze Flächen als primäre UI-Farbe. Das gilt für Außenkommunikation genauso wie für die App — Referenzoptik ist die Landingpage.

Details im Skill `koreki-design-system`. Farbwerte in `brand.css` sind Kopien der App-Tokens und müssen bei Änderungen dort nachgezogen werden.

## 3. Keine Zahl ohne Beleg

Koreki ist als **Hochrisiko-KI-System** eingestuft (Anhang III Nr. 3 b, EU-Verordnung 2024/1689). Art. 13 verpflichtet zur Transparenz über Fähigkeiten, Grenzen und systemimmanente Verzerrungen. Werbung, die dem widerspricht, erzeugt einen Konflikt zwischen Marketing und Betriebsanleitung.

Praktisch heißt das: keine Zeitersparnis, kein Prozentsatz, keine Geschwindigkeitsangabe ohne Messung, auf die man zeigen kann.

**Die Regel, die trägt:** Belegbare Aussagen beschreiben, was das System *tut* oder *weiß* — nicht, wie gut sein Ergebnis ist.

- *„unvoreingenommen"* ist belegbar: Namen werden vor der KI-Übergabe pseudonymisiert, das steht im Code.
- *„objektiv"* ist es nicht: Das behauptet Verzerrungsfreiheit im Ergebnis und ist messbar widerlegbar.

## 4. Ton gegenüber Lehrkräften

Nicht am Klischee der faulen Lehrkraft entlangschreiben. Kein Einstieg über eingesparte Mühe oder verlorene Wochenenden — die Zielgruppe ist dort empfindlich, zu Recht, und auf Social Media entscheidet der erste Satz über den Ton der Kommentare. Der Nutzen wird über die **Qualität für die Schüler** begründet: gleicher Maßstab für die erste und die achtundzwanzigste Arbeit.

Kein Fachvokabular. Begriffe wie „Telemetrie", „Open Source" oder „deterministisch" beschreiben echte Stärken, erreichen die Zielgruppe aber nicht. Eigenschaft statt Fachbegriff formulieren.

## 5. Was nie behauptet wird

Die Notengebung liegt bei der Lehrkraft. Kein Post, kein Screenshot und keine Überschrift darf Vollautomatik suggerieren — das widerspricht der menschlichen Aufsicht (Art. 14) und der Betriebsanleitung.

Konkrete Bewertungsergebnisse gehören nicht auf Grafiken, soweit sie aus KI-Ermessen stammen: Ein abgedrucktes „9/15, Note 3,0" ist ein Versprechen, das ein realer Durchlauf nicht halten muss. Deterministisch geprüfte Werte (CalcTrace-Sandbox) sind die Ausnahme.

## 6. Checkliste vor Veröffentlichung

- [ ] Grafik im hellen Marken-Look, Tokens aus `brand.css`?
- [ ] Jede Zahl belegbar — Quelle im Code oder in der Doku benennbar?
- [ ] Keine KI-Ergebnisse abgedruckt, die ein realer Durchlauf verfehlen kann?
- [ ] Bei Verweis auf die Cloud: Hinweis, dass in der Trial keine echten Schülerdaten hochgeladen werden dürfen?
- [ ] Fachvokabular durch Eigenschaften ersetzt?
- [ ] Menschliche Letztentscheidung erkennbar?
