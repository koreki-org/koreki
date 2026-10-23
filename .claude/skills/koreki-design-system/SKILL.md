---
name: koreki-design-system
description: Gestaltung und UX der Koreki-Oberfläche — Zielbild, Grundsätze, Tokens, Komponenten und die Regeln mit Wächter
---

# Skill: Koreki Design System

Gilt für App, Marketing-Seiten und Außenkommunikation. Koreki ist **hell, es gibt keinen Dark Mode**.

Regeln mit Wächter stehen hier kurz; Begründung und Fallgeschichte stehen im Kopf der jeweiligen Testdatei.

## 0. Zielbild: ein professionelles Schulwerkzeug

Koreki soll aussehen wie ein Werkzeug, dem eine Schulleitung Schülerarbeiten anvertraut — nicht wie ein KI-Schaufenster. Vorbild sind sachliche Fachanwendungen: ruhig, lesbar, präzise.

- **Eine Akzentfarbe.** `primary` markiert Aktionen und Auswahl, sonst nichts. In der App keine Verläufe in Schrift, Flächen oder Buttons.
- **Keine Hintergrundmuster.** Kein Gitter, keine Punkte, keine Linien hinter Inhalten. Das Karogitter (bis 13.10.2026) wurde als das Tech-Gitter vieler KI-Seiten gelesen, nicht als Schulheft.
- **Marketing folgt den Social-Media-Grafiken** (`marketing/brand.css`, seit 13.10.2026 der Maßstab, weil dort bereits veröffentlicht): Seitenkopf mit dem Lavendel-Schimmer der Posts (`Abschnitt kopfband`, `.kopfband`), Überschriften in Outfit `font-extrabold`, je Überschrift höchstens eine Hervorhebung im Markenverlauf Indigo → Violett → Pink (`Markenverlauf`, `.markenverlauf`), kleine Überschriften (Kicker) in Versalien mit `tracking-[0.22em]`. Das gilt **nur** auf Marketing-Seiten; die App bleibt sachlich.
- **Gewicht statt Lautstärke (App).** Überschriften höchstens `font-bold`, meist `font-semibold`. `font-black`, Versalien (`uppercase`) und gesperrte Schrift (`tracking-wide*`) sind in der App verboten — auch in `Badge`.
- **Keine Dekoration ohne Aufgabe.** Keine Ambient-Blobs (`blur-[100px]` u. ä.), keine farbigen Leucht-Schatten (`shadow-primary/40`), keine Dauer-Animationen an statischen Elementen.
- **Echte Inhalte zeigen.** Screenshots zeigen eine Arbeit mit Vorschlag und Feedback, nie einen leeren Zustand.
- **Text vor Technik.** Wer eine Lehrkraft anspricht, beschreibt, was sie davon hat. Hardware, Modelle und Laufzeiten gehören auf die Installationsseiten, nicht auf die Startseite.

> **Altbestand.** Stand 12.10.2026: In der App abgebaut (Versalien, `font-black`, Ambient-Blobs, Verlaufsschrift — `.text-gradient` färbt nur noch in `primary`). Übrig sind die Marketing-Seiten, die mit der neuen Startseite umgebaut werden. Ein Wächter folgt danach.

## 1. UX-Grundsätze

1. **Ergebnis vor Einstellung.** Wer neu ist, sieht ein Korrekturergebnis (die Demo), bevor er etwas konfigurieren muss.
2. **Keine Dialog-Ketten.** Kein Modal öffnet als Folge eines anderen. Was mehrere Schritte braucht, ist eine Seite mit Fortschrittsanzeige.
3. **Der Standard reicht.** Jede Einstellung hat einen guten Vorgabewert. Expertise, Skills, Erfahrungsschatz und Intelligenz sind Verfeinerungen, keine Voraussetzung.
4. **Eine Hauptaktion pro Bildschirm.** Genau ein Button in `variant="default"` ist hervorgehoben; alles andere ist sekundär.
5. **Die Lehrkraft entscheidet — sichtbar.** KI-Werte heißen „Vorschlag". Übernehmen und Ändern sind die Hauptinteraktion der Prüfansicht. Nie „automatische Korrektur", nie „vollautomatisch".
6. **Kosten nur dort, wo sie entstehen.** Credits erscheinen nur im gehosteten Dienst. Desktop, Community und eigener Schlüssel zeigen keine.
7. **Leere Zustände führen weiter.** Ein leerer Bereich sagt, was als Nächstes zu tun ist, und bietet die Demo an.

## 2. Sprache in der Oberfläche

- **Anrede: du.** Überall — App, Marketing, Meldungen. Der Slogan ist „Dein KI-Korrektur Assistent“, und die veröffentlichten Posts duzen. (Am 12.10.2026 kurz auf „Sie“ umgestellt, am 14.10.2026 zurückgenommen.) Ausnahme: rechtliche Texte (AGB, Datenschutz, AVV) bleiben förmlich.
- **Deutsch.** Keine englischen UI-Wörter (Update, Review, Deep Dive, Logistics, Coming soon).
- **Satzschreibung.** Keine Versalien in der App, auch nicht in `Badge`. Ausnahme: Kicker auf Marketing-Seiten (siehe §0).
- **Ein Begriff pro Konzept:**

| Konzept | Begriff in der UI | Nicht verwenden |
|---|---|---|
| Fach-Anweisungen der Lehrkraft | Expertise | Expert Center, Experten-Modus, Fach-Prompts |
| Zuschaltbare Bewertungsbausteine | Skills | Kompetenzbereiche, Module |
| Gespeicherte Bewertungsbeispiele | Erfahrungsschatz | GradingMemory, Memory, Erfahrung, Präzedenzfälle |
| Modell- und Genauigkeitswahl | Intelligenz | KI-Parameter-Center, AI-Leistungskraft |
| Ergebnis der KI | Vorschlag | Bewertung, automatische Korrektur |
| Texterkennung | Texterkennung | OCR (höchstens einmal in Klammern) |
| Hinweis geringer Sicherheit | „Bitte prüfen" | Konfidenz, Review empfohlen |
| Selbstauskunft der KI (ab 90 %, grau) | „KI-Vertrauen 95 %" | Konfidenz, „95 % sicher" (klingt nach gemessener Trefferquote) |

- **Kein Technikjargon** in Ansichten für Lehrkräfte: Inferenz, Zero-Shot, Sandbox, Knoten, Deduction, PII, Prompt, Token. Wo die Sache nötig ist, die Eigenschaft beschreiben.

## 3. Flächen und Abgrenzung
Wächter: `tests/unit/surface-governance.test.ts`

**Die Flächen-Leiter wechselt sich ab** — zwei gleiche Töne stecken nie ineinander:

| Ebene | Token |
|---|---|
| Seite | `bg-background` |
| Karte | `bg-card` (weiß) |
| Behälter in einer Karte | `bg-muted` |
| Block im Behälter | `bg-card` |

Werte stehen in `src/styles/globals.css` — nirgends sonst abschreiben.

- **Jede `bg-*`-Klasse zeigt auf eine Farbe, die es gibt.** Tailwind ignoriert unbekannte Klassen lautlos. *(Wächter)*
- **Höchstens drei Abgrenzungsmittel pro Element** (Rand, Tönung, Schatten, Ring). Ein Mittel pro Aussage. *(Wächter)*
- **Keine hartcodierten Palettenfarben** (`bg-slate-*`, `text-blue-*` …) — immer Tokens. *(Wächter)*
- **Hover ist eine Lasur:** `hover:bg-foreground/5`; farbig `hover:bg-primary/10`. `hover:bg-muted`/`hover:bg-accent` auf dem Seitengrund ist unsichtbar. Was weiß ist (Eingabefeld, `outline`-Knopf), sagt den Zustand über den **Rand** — eine Lasur ließe den grauen Grund durchscheinen. *(Wächter)*
- **Ein Rahmen ist verdient, wenn sein Inhalt eigenständig handhabbar ist.** Sonst Leerraum und Haarlinien.
- **Zustandswechsel ändern nur Farbe, nie Geometrie** (Rahmenstärke, Radius, Abstand, Zeilenhöhe). Zeilenhöhe mit `text-sm/relaxed`, nicht `text-sm leading-relaxed`.
- **Grau heißt deaktiviert.** Ein Feld, in das man schreibt, ist heller als die Umgebung; den Bearbeitungsmodus sagen Randfarbe und Ring.
- **Fokusringe liegen innen** (`ring-inset`) — Scrollbehälter schneiden sie sonst ab.

## 4. Tokens

**Farben** (HSL-Variablen aus `globals.css`): `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `destructive`, `warning`, `success`, `border` — jeweils mit `-foreground`.
`accent-1` … `accent-4` unterscheiden nur gleichwertige Optionen und tragen keine Bedeutung.

**Typografie:** Zwei Schriften, beide selbst ausgeliefert aus `public/fonts/` (die CSP blockiert Google Fonts): **Outfit** für Logo und Überschriften (`h1`–`h4` bekommen sie über `globals.css`, sonst `font-outfit`), **Geist** für Text und Bedienung (`font-sans`). `font-outfit` nur an Überschriften, nie an Fließtext oder Labels. `font-mono` nur für Code/Diffs. Kleinste Schrift `text-xs` — `text-[9px]`…`text-[11px]` sind verboten.

**Radien** *(Wächter: nur Stufen, die es gibt und die erlaubt sind)*:

| Klasse | Einsatz |
|---|---|
| `rounded-hero` (16 px, = `rounded-2xl`) | Modals, Drawer, Hauptkarten |
| `rounded-xl` | Kinder in `rounded-hero`-Karten |
| `rounded-lg` | normale App-Karten, Infoboxen |
| `rounded-md` | Buttons, Inputs (aus dem UI-Kit) |
| `rounded-full` | Kreise, Pillen |

Verboten: `rounded-3xl` und alle Werte in eckigen Klammern.

**Abstände:** `px-6 md:px-page-inline` (Seite), `pb-12 md:pb-section-vertical` (Sektion, einseitig), `p-6 md:p-card-padding` (Karte), `p-4 md:p-card-padding-sm` (kompakt), `pt-16 pb-12 md:pt-hero-top md:pb-hero-bottom` (Hero). Mobile zuerst, Desktop über `md:`/`lg:`, keine eigenen Media-Queries.

**Icons:** nur Lucide, `w-5 h-5` oder `w-6 h-6`. Ein Icon-Button ohne sichtbaren Text hat ein `aria-label`.

## 5. Tiefe und Bewegung

- **Schatten:** Karten tragen sich über die Fläche (Abschnitt 3), Schatten höchstens `shadow-sm`. Modals `shadow-glass`, verankerte Popover `shadow-xl`.
- **Glas und Unschärfe** nur für Ebenen, die über Inhalt schweben: Modal-Hintergrund (`backdrop-blur-glass`), die schwebende Kopfleiste. Nie für Inhaltskarten. Verankerte Listen und Menüs (Vorbild `ui/Dropdown.tsx`) sind undurchsichtig: `bg-card`, Haarlinie, `shadow-xl`.
- **Animation:** nur Klassen aus `globals.css` oder Tailwind selbst. Übergänge 150–300 ms, nur Farbe und Deckkraft. `prefers-reduced-motion` respektieren. *(Wächter: `tests/unit/animation-governance.test.ts`)*
  - **Ebenen über dem Inhalt** blenden ein: Hintergrund, Menü, Tooltip mit `animate-overlay-in` (150 ms), die Dialog-Karte mit `animate-dialog-in` (180 ms, leichtes Größerwerden).
  - **Inhalt bewegt sich nicht** — Karten, Listen, Einstellungen sind einfach da.
  - **Dauer-Animationen** (`animate-pulse`, `-ping`, `-bounce`) nur an Elementen, die zeigen, dass gerade etwas läuft; sie tragen `data-laufanzeige`. Warnungen und Deko blinken nicht — Farbe und Symbol tragen die Aussage. `animate-spin` und `animate-loading-bar` sind Laufanzeigen von sich aus.
  - Keine Klassen aus `tailwindcss-animate` (`animate-in`, `fade-in`, `zoom-in-95` …) — der Zusatz ist nicht eingebunden, die Klassen tun nichts.
- **Laden:** Skeleton oder Fortschrittsbalken mit Text, was gerade passiert.

## 6. Komponenten (Pflicht)

Alle UI-Elemente kommen aus `@/components/ui/`:
`Button`, `Card` (+ `CardHeader`/`CardContent`/`CardTitle`), `Badge`, `Checkbox`, `Input`, `Textarea`, `HighlightableTextArea`, `Tabs` (+ `TabsList`/`TabsTrigger`/`TabsContent`), `Dropdown`.

Verboten: rohes `<button>`/`<input>` außerhalb des UI-Kits; `style={{}}` für Layout oder Farbe (nur Keyframe-Werte); `<style jsx>` außer `@keyframes`; verschachteltes `<a>` in `<Link>`.

`Button shape="pill"` ist in Satzschreibung, ohne `shimmer`.

## 7. Dialoge

- Eigene Komponente, per Portal an `document.body`, nie inline in einer Seite.
- Portal, Scroll-Sperre und Fokusfalle aus `useDialogA11y`; schließbare Dialoge zusätzlich `useEscapeKey`, blockierende bewusst nicht. Die Scroll-Sperre stellt den **vorher gemerkten** Wert wieder her.
- `rounded-hero`, `p-6`.
- Kein Modal für eine Erfolgsmeldung.

## 8. Meldungen und Rückfragen
Wächter: `tests/unit/confirm-dialog-governance.test.ts`, `tests/unit/components/ToastHost.test.tsx`

Nie `alert()` oder `confirm()` (auch nicht `window.`).

| Zweck | Aufruf (`@/lib/notify`, `@/lib/confirm-dialog`) |
|---|---|
| Bestätigung | `meldeErfolg(text)` — blendet sich aus |
| Offene Aufgabe | `meldeHinweis(text)` — nicht rot |
| Fehlschlag | `meldeFehler(text)` — bleibt stehen |
| Rückfrage vor folgenreicher Aktion | `askConfirmation({ title, message })` |
| Rückfrage vor dem Überschreiben | `confirmOverwrite(label, name)` |

Die Toast-Fläche ist undurchsichtig; die Tonlage trägt der Streifen links.

## 9. Ebenen (z-index)

Bänder statt Einzelwerte; eine neue Ebene wird einem Band zugeordnet, keine neue Zahl erfunden:
`z-0` Hintergrund · `z-10` Inhalt · `z-20` Navigation/Karten · `z-100–2300` verankerte Overlays · `z-6000–10000` Modals, Drawer, Lightbox · `z-10001` Toasts (oberste Ebene, Wächter im ToastHost-Test).

## 10. Layouts und Umfang

- `AppLayout` für App, Admin, Login/Registrierung; `MarketingLayout` für öffentliche Seiten.
- Größengrenzen *(Wächter: `tests/unit/file-size-governance.test.ts`)*: 300 Zeilen für `components/`, `hooks/`, `pages/`; max. 10 Hook-Aufrufe pro Komponente. Logik in Hooks bzw. `src/lib/`.

## 11. Marke

Logotype `font-outfit font-extrabold tracking-tighter`, farbiger Schlusspunkt: `Koreki<span className="text-primary">.</span>`.
