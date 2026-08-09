# Koreki Marketing-Grafiken

Grafiken für Instagram, LinkedIn und YouTube werden hier als HTML gebaut und
per Playwright pixelgenau nach `out/` gerendert. Farben und Schriften kommen
aus demselben Vokabular wie die App — so kann Marketing-Material optisch nicht
vom Produkt abdriften.

## Rendern

```bash
node render.js          # alle .html in diesem Ordner
node render.js demo     # nur Dateien, deren Name "demo" enthält
```

Ergebnis liegt in `out/<name>.png`. Playwright kommt aus den devDependencies
des Projekts, es ist keine zusätzliche Installation nötig.

## Formate

Das Format steht im `<body data-format="...">`. `render.js` und `brand.css`
lesen denselben Wert — beide Stellen müssen zusammenpassen.

| Wert | Größe | Verwendung |
| :--- | :--- | :--- |
| `feed` | 1080 × 1350 | Instagram Feed & Karussell (4:5) |
| `square` | 1080 × 1080 | Instagram quadratisch |
| `story` | 1080 × 1920 | Instagram Story / Reels-Cover |
| `linkedin` | 1200 × 1500 | LinkedIn Hochformat |
| `youtube` | 1280 × 720 | YouTube Thumbnail |

Beim Story-Format hält `brand.css` oben ~270 px und unten ~350 px frei. Dort
liegen Instagrams eigene Bedienelemente — nichts Wichtiges dort platzieren.

## Bausteine in `brand.css`

| Klasse | Zweck |
| :--- | :--- |
| `.slide` | Grundfläche mit Markenverlauf und Rastertextur |
| `.brandbar` / `.lockup` / `.wordmark` | Kopfzeile mit Logo und Wortmarke |
| `.eyebrow`, `h1` (`.m` `.s` `.xs`), `.lead` | Typo-Hierarchie |
| `.grad` | Farbverlauf-Text für das Schlüsselwort einer Headline |
| `.steps` / `.step` / `.num` | nummerierte Schrittliste |
| `.shot` / `.crop` | Screenshot im Browser-Rahmen, mit Ausschnitt |
| `.stats` / `.stat` | Kennzahlen-Kacheln |
| `.notes` / `.note` | Detailaussagen ohne Nummer |
| `.chips`, `.cta`, `.footline`, `.swipe` | Badges, Button, Fußzeile, Wischhinweis |

## Screenshot-Ausschnitte berechnen

`.crop` beschneidet einen Screenshot, ohne die Quelldatei anzufassen. Gesteuert
wird über drei Custom Properties. Für einen gewünschten Quell-Ausschnitt ab
`sx`/`sy` mit der Breite `sw`, bei einer Bildbreite `iw` und einer Rahmenbreite
von 936 px (Feed-Format):

```
zoom = iw / sw
s    = 936 / sw
x    = -sx * s
y    = -sy * s
```

```html
<div class="crop" style="--h:457px; --zoom:1.987; --x:-924px; --y:-439px">
    <img src="../../public/screenshots/....png" alt="">
</div>
```

Zwei Regeln aus der Praxis: Bildkanten sauber treffen (`sx + sw = iw`), sonst
entsteht ein Spalt am Rand. Und unter etwa `sw = 1000` wird UI-Text auf dem
Handy unleserlich — lieber enger croppen als kleiner skalieren.

## Neuen Post anlegen

1. Text zuerst schreiben, erst dann gestalten.
2. Bestehende `.html` als Vorlage kopieren, `data-format` setzen.
3. `node render.js <name>` und das PNG prüfen.
4. Wenn Abstände gestaucht wirken, ist der Inhalt zu hoch für die Fläche —
   Text kürzen oder Schriftgrad reduzieren. Die `.h*`-Abstandshalter
   schrumpfen bewusst nicht, damit so ein Überlauf sichtbar wird.

## Was hier versioniert wird — und was nicht

Versioniert sind die **Quellen**: `brand.css`, `render.js` und die Vorlagen.
Daraus baut jeder die Grafiken mit einem Befehl neu.

Nicht versioniert ist `out/`. Die PNGs sind Build-Output, rund 400 KB pro Datei
und als Binärdaten ohne Diff — jede Neu-Renderung würde einen kompletten neuen
Blob dauerhaft in der History ablegen. Das `out`-Muster in `.gitignore` greift
auf jeder Ebene und deckt diesen Ordner bereits ab.

Ebenfalls nicht hier: **Bildtexte und Claim-Leitplanken**. Die liegen unter
`internal/marketing/captions.md` und damit außerhalb des öffentlichen Repos —
sie enthalten interne Abwägungen darüber, welche Werbeaussagen belegbar sind
und welche nicht.

## Marken und Logos

Die Polyform-Non-Commercial-Lizenz dieses Repos deckt den **Code**. Der Name
„Koreki", die Wortmarke und das Federsymbol sind davon **nicht** erfasst und
dürfen nicht für eigene Produkte oder Angebote verwendet werden.

Die Vorlagen hier stehen zur Verfügung, um über Koreki zu berichten, das
Projekt weiterzuempfehlen oder eigene Materialien für den Unterricht zu bauen.
Für alles Weitergehende: info@koreki.org.
