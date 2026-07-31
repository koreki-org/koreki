---
name: koreki-design-system
description: Richtlinien für UI & Design Excellence (Enterprise Aesthetics)
---

# Skill: UI & Design Excellence (Enterprise Aesthetics)

Dieses Dokument definiert das Erscheinungsbild und die Interaktionsstandards für Koreki. Es ist als verbindlicher Leitfaden für den **UI Expert** zu verstehen.

## 1. Glassmorphism Principle
- **Geltungsbereich**: Glassmorphism (`.glass-morphism`, `backdrop-blur-*`, `bg-white/NN`) ist explizit auf **Modals, Sidebars und Overlays** beschränkt — also Elemente, die schwebend über anderem Content liegen (inkl. schwebender Bild-/Screenshot-Rahmen).
- **Marketing-Content-Cards**: Flache Content-, Feature- und Info-Karten mit Fließtext auf Marketing-Seiten nutzen **standardmäßig keine Glass-Optik**. Stattdessen: `bg-background` (nicht `bg-card` — dieser Token ist im Projekt aktuell nicht mit einer Farbe hinterlegt und resultiert in einem transparenten No-Op) + `border border-border` + `shadow-md`, ohne `backdrop-blur`.
- **Backdrop Blur**: Nutze durchgängig `backdrop-blur-glass` für Modals, Sidebars und Overlays.
- **Transparenz**: Hintergründe sollten eine subtile Deckkraft aufweisen, um räumliche Tiefe zu erzeugen.
- **Box Shadows**: Nutze den `shadow-glass` Effekt für eine schwebende Optik.

## 2. Color Mastery (HSL)
- **Dynamik**: Nutze das Tailwind-System mit HSL-Variablen (`--primary`, `--background`), um Themenwechsel (Dark/Light Mode) und Branding-Anpassungen zu ermöglichen.
- **Kontrast**: Achte auf hohe Lesbarkeit, insbesondere in Textbereichen der Korrekturansicht (`CorrectionReview`).

- **Hover-Effekte**: Jedes interaktive Element muss einen sanften Transition-Effekt besitzen (`transition-all duration-300`).
- **Loading-States**: Nutze animierte Pulse-Effekte oder Shimmer-Skeletton-Screens.
- **Global Registry**: Alle funktionalen Animationen (z.B. `animate-loading-bar`, `animate-scan`) müssen in `globals.css` zentralisiert sein.

## 4. Component Guidelines
- **Modals**: Konsistente Nutzung von Radien (`rounded-hero`) und Standard-Abständen (`p-6`).
- **Icons**: Verwende ausschließlich **Lucide Icons** mit einer Standard-Größe von `w-5 h-5` oder `w-6 h-6`.
- **Formulare**: Textareas und Inputs sollten Fokus-Ringe in der Primärfarbe besitzen.

## 5. Industrial Scale & Performance
- **Component LOC Limit**: UI-Komponenten sollten primär **< 300 Zeilen** Code umfassen. Grow-Buster: Komplexe Logik MUSS in Hooks extrahiert werden, Sub-Layouts in eigene Komponenten.
- **Next.js 15 Link Compliance**: Nutze niemals verschachtelte `<a>` Tags innerhalb von `<Link>`, es sei denn, `legacyBehavior` ist explizit gefordert. Styles gehören direkt auf die `Link`-Komponente.

## Global Stacking Context (Z-Index)
Um visuelle Überlagerungen (Clipping) zu verhindern, folgt Koreki einer strikten Hierarchie:
- **Z-0**: Footer / Hintergrund-Elemente.
- **Z-10**: Main Content Shell.
- **Z-20**: Active Layout Content (Navigation / Cards).
- **Z-9999**: Modals & Overlays (stets via Portals am Body).

## Responsive First
- **Mobile First Spacing**: Richte Abstände primär mobil-first aus (z. B. `px-6`) und füge die Desktop-Tokens mit dem standardmäßigen Tailwind-Präfix `md:` hinzu (z. B. `md:px-page-inline`).
- **Standard-Raster**: Vermeide es, responsive Layout-Sonderregeln direkt über eigene Media-Queries in den CSS-Dateien zu deklarieren. Nutze stattdessen Tailwinds integrierte Breakpoint-Präfixe (`md:`, `lg:`).

---

# Koreki – Agent Coding Rules

## Pflicht: UI-Komponenten

Alle UI-Elemente MÜSSEN aus `@/components/ui/` stammen. Niemals raw HTML-Elemente für UI verwenden.

| Zweck | Komponente | Import |
|---|---|---|
| Buttons | `Button` | `@/components/ui/Button` |
| Karten / Panels | `Card`, `CardHeader`, `CardContent`, `CardTitle` | `@/components/ui/Card` |
| Status-Labels | `Badge` | `@/components/ui/Badge` |

> **Button `shape="pill"`**: Nutzt bewusst Sentence-Case (kein `uppercase`/`tracking-widest` mehr — entfernt zugunsten eines weniger "AI-SaaS-Hype"-artigen Looks). Die `shimmer`-Prop bleibt technisch nutzbar, ist auf Marketing-CTAs aber **nicht Standard** — Hover-Feedback läuft über `hover:-translate-y-0.5` + Shadow-Intensivierung.
>
> **Badge-Konventionen**: `Badge`-Varianten (`vibrant`, `light`, `glass`, `subtle`) behalten ihr Uppercase/`tracking-widest` bewusst bei — das ist gewollte Differenzierung gegenüber CTA-Buttons, nicht inkonsistent.
| Checkboxen | `Checkbox` | `@/components/ui/Checkbox` |
| Einzeiliger Input | `Input` | `@/components/ui/Input` |
| Mehrzeiliger Input | `Textarea` | `@/components/ui/Textarea` |
| Text mit Highlighting | `HighlightableTextArea` | `@/components/ui/HighlightableTextArea` |
| Tabs / Navigation | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@/components/ui/Tabs` |
| Custom Select | `Dropdown` | `@/components/ui/Dropdown` |

### Verboten
- Raw `<button>` außerhalb von UI-Komponenten
- Raw `<input>` außerhalb von UI-Komponenten
- Inline `style={{}}` Props für Layout oder Farben (nur für Keyframe-Animationen erlaubt)
- `<style jsx>` Blöcke außer für `@keyframes`

---

## Design Tokens – IMMER verwenden

Farben und Abstände kommen aus CSS-Variablen, nicht aus hardcodierten Werten.

### Spacing (Layouts & Sektionen)
Nutze die standardisierten Spacing-Tokens für ein konsistentes Raster. Für Responsivität kombiniere sie mit Tailwind-Präfixen:
- **`px-6 md:px-page-inline`**: Horizontaler Seitenabstand (32px Desktop, 24px Mobile).
- **`pb-12 md:pb-section-vertical`**: Standardmäßiger vertikaler Sektionsabstand. Wird nur einseitig angewendet (Bottom-Padding), um eine Verdopplung des Abstands zwischen aufeinanderfolgenden Sektionen zu vermeiden.
- **`py-12 md:py-section-vertical`**: Nur nutzen, wenn eine Sektion komplett isoliert steht und beidseitig Padding benötigt.
- **`p-6 md:p-card-padding`**: Innenabstand für Standard- und große Karten/Highlightboxen (40px Desktop, 24px Mobile).
- **`p-4 md:p-card-padding-sm`**: Innenabstand für kompakte Info-Zellen/Bento-Karten (24px Desktop, 16px Mobile).
- **`pt-16 pb-12 md:pt-hero-top md:pb-hero-bottom`**: Vertikales Hero-Padding für Standard-Unterseiten.

### Farben (HSL via CSS-Variables)
Nutze die HSL-Variablen aus `globals.css` via Tailwind:
```
bg-background, text-foreground
bg-primary, text-primary, text-primary-foreground
bg-secondary, text-secondary-foreground
bg-muted, text-muted-foreground
bg-destructive, text-destructive-foreground
bg-warning, text-warning, text-warning-foreground
bg-success, text-success, text-success-foreground
border-border
```

**Accent Tokens (Marketing Pages)**
- `--accent-1` bis `--accent-4` (sowie `-foreground` Varianten)
- **Wichtig:** Diese Tokens dienen *ausschließlich* zur rein visuellen Unterscheidung gleichwertiger Karten oder Optionen (z. B. auf Marketing-Seiten). Sie haben im Gegensatz zu `--success` oder `--warning` bewusst **keine** semantische oder inhaltliche Bedeutung. Versuch niemals, sie konzeptionell zuzuordnen (z.B. "Accent-1 ist immer Cloud").

### Typografie (Branding & UI)
- **font-outfit**: Standard für Branding, Überschriften und UI-Elemente (Korrektur-Modus).
- **font-inter / font-sans**: Standard für Fließtext und Datentabellen.
- **font-mono**: Ausschließlich für Code-Blöcke oder Diff-Ansichten.

### Eckenradien (Border-Radius)
Nutze ausschließlich die standardisierten Radien-Klassen. Willkürliche Eckenrundungen (wie `rounded-[2.5rem]`, `rounded-[40px]`, `rounded-3xl` etc.) sind strengstens untersagt:
- **`rounded-hero` (16px / `1.0rem` via `--radius-hero`):** Einheitlicher Standard für alle Modals, Drawers, Popups und primäre Sektionskarten (z.B. Haupt-Card der Stapelverarbeitung).
- **`rounded-xl` (12px):** Für verschachtelte Kind-Elemente innerhalb von `rounded-hero`-Karten (z.B. Listenzeilen/Schülerzeilen in der Stapelverarbeitung), um eine harmonische Ecken-Nestung zu gewährleisten ($R_{outer} > R_{inner}$).
- **`rounded-lg` (8px / `0.5rem` via `--radius`):** Standard für normale App-Karten, Widgets und Infoboxen.
- **`rounded-md` (~6px):** Standard-Radius für interaktive Kontrollelemente (Buttons, Inputs). Wird direkt aus den UI-Kit-Komponenten (`Button`, `Input`) vererbt.

---

## Verbotene Tailwind-Klassen

Diese Klassen sind im Koreki-Projekt nicht erlaubt:

```css
/* Willkürliche Border-Radius Werte */
rounded-[2.5rem], rounded-[3rem], rounded-[40px] etc.
→ Stattdessen: rounded-xl, rounded-2xl oder rounded-[var(--radius)]

/* Mikro-Typografie */
text-[9px], text-[10px], text-[11px]
→ Stattdessen: text-xs (12px)

/* Hardcodierte Farben */
bg-slate-900, text-blue-600, bg-indigo-500 etc. als primäre UI-Farben
→ Stattdessen: bg-primary, text-primary etc.

/* Verbotene Button-Farben */
bg-slate-900, bg-black, bg-gray-900 für Buttons
→ Koreki nutzt keine rein schwarzen Buttons. Nutze bg-primary, bg-gradient oder secondary Themes.

/* Glassmorphism ohne explizite Anforderung */
backdrop-blur-md, bg-white/60, bg-slate-900/60
→ Nur wenn Glassmorphism explizit gefordert ist oder .glass-morphism genutzt wird

/* Dekorative Hintergründe */
blur-[100px], blur-[120px] Ambient-Blobs
→ Nur auf explizite Anfrage
```

---

## Layout-Regeln

Koreki nutzt zwei primäre Layout-Typen, um eine klare Trennung zwischen Marketing-Präsenz und funktionaler Applikation zu gewährleisten.

### 1. AppLayout (`@/layouts/AppLayout`)
**Einsatzbereich**: Dashboard, Admin-Panel, Login/Register-Flows.
- **Optik**: `bg-background`, nutzt denselben `BackgroundGradients`-Ambient-Shell-Layer wie `MarketingLayout` (vereinheitlicht — siehe Abschnitt 7), Fokus auf Funktionalität in der Content-Ebene selbst.
- **Komponenten**: Nutzt den `MinimalFooter`.

### 2. MarketingLayout (`@/layouts/MarketingLayout`)
**Einsatzbereich**: Landingpage (`index`), Features, Pricing, Legal Docs.
- **Optik**: Premium Aesthetics, komplexe radiale Gradients, Sticky Header.
- **Komponenten**: Nutzt `MarketingHeader` und `MarketingFooter`.

> **Hinweis:** Der `BackgroundGradients`-Ambient-Shell-Layer (Abschnitt 7) ist **kein Marketing-exklusives Element** — er läuft app-weit über `AppLayout` und `MarketingLayout` gleichermaßen, um eine kohärente Markenidentität zu erzeugen. Unterschiede zwischen beiden Layouts bestehen primär in Header/Footer-Komponenten und der Content-Dichte, nicht im Hintergrund-Layer.

### Seitenstruktur Beispiele

**Für App-Seiten (Internal):**
```tsx
import AppLayout from '@/layouts/AppLayout';

export default function MyDashboard() {
    return (
        <AppLayout>
            <div className="max-w-[1500px] mx-auto p-4 md:p-8 relative z-10">
                <Head>
                    <title>Dashboard | Koreki</title>
                </Head>
                {/* Inhalt mit Card-Komponenten */}
            </div>
        </AppLayout>
    );
}
```

**Für Marketing-Seiten (Public):**
```tsx
import MarketingLayout from '@/layouts/MarketingLayout';

export default function PricingPage() {
    return (
        <MarketingLayout>
            <div className="max-w-7xl mx-auto px-4 py-20">
                <Head>
                    <title>Preise | Koreki</title>
                </Head>
                {/* Hero & Pricing Sections */}
            </div>
        </MarketingLayout>
    );
}
```

---

## Animationen

Nur diese vordefinierten Klassen aus globals.css verwenden:
`animate-fade-up`, `animate-fade-down`, `animate-fade-in`, `animate-spin`, `animate-pulse-blue`, `animate-float-glow`, `animate-scan`, `animate-loading-bar`.

---

## 7. Ambient Shell & Backgrounds

Für das "Premium Aesthetics" Feeling nutzen wir eine überlagerte Hintergrund-Ebene aus weichen, animierten Unschärfekreisen (Ambient Blobs).

### Implementation Pattern:
```tsx
const BackgroundGradients = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply" />
    </div>
);
```

### Regeln:
1. **Low Contrast**: Die Deckkraft (`opacity`) darf niemals so hoch sein, dass sie die Lesbarkeit des Contents stört. Standard ist `/5` bis `/10`.
2. **Fixed**: Der Hintergrund muss mit `fixed` fixiert sein, um den "schwebenden" Effekt beim Scrollen zu erzeugen.
3. **Marketing-Sections**: Zusätzlich zum globalen `BackgroundGradients`-Layer max. **1 zusätzlicher lokaler Akzent-Blob** (`blur-[...]`) pro sichtbarer Section — nur bei begründetem visuellem Zweck (z.B. Tiefe hinter einem Screenshot-Rahmen), nicht als reine Flächen-Dekoration.

---

## 8. Branding Constants

Das Branding von Koreki folgt strikten typografischen Regeln:

- **Logotype**: `font-outfit font-extrabold tracking-tighter`.
- **Der Punkt**: Ein farbiger Schlusspunkt (`text-primary`) am Ende des Markennamens ist Pflicht: `Koreki<span className="text-primary">.</span>`.

## Modals

- **Implementation**: Modals existieren als eigene Komponenten in `@/components/`. 
- **Z-Index & Stacking**: Niemals Modals inline in Pages implementieren. Sie MÜSSEN über **React Portals** (`ReactDOM.createPortal`) an den `document.body` gehängt werden.
- **Rationale**: Dies verhindert "Clipping" durch CSS-Transformationen oder Animationen in Eltern-Containern (Stacking Context).
- **UX**: Den Body-Scroll beim Öffnen sperren (`overflow: hidden`).

## Tabs & Dropdown Usage

```tsx
// Tabs Beispiel (Segmented Control)
<Tabs defaultValue="users">
    <TabsList>
        <TabsTrigger value="users">Benutzer</TabsTrigger>
        <TabsTrigger value="workspaces">Institute</TabsTrigger>
    </TabsList>
    <TabsContent value="users">...</TabsContent>
</Tabs>

// Dropdown Beispiel (Premium Select)
<Dropdown 
    value={selected} 
    onValueChange={setSelected}
    options={[
        { value: '1', label: 'Option A', icon: <User size={14}/> }
    ]}
/>
```

---
## Industrial Maintenance Protocol 🏮
1. **Consistency First**: Neue Komponenten müssen das bestehende Design-Vokabular (Rundungen, Schatten, HSL) von Koreki nutzen.
2. **Refactor-Trigger**: Fällt eine Komponente durch das LOC-Limit (> 300 Zeilen), wird sie unmittelbar modularisiert.
3. **No-Bypass**: Manuelle z-index Vergaben außerhalb der globalen Strategie sind untersagt.

