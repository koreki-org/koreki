---
name: release
description: Neue Koreki-Version über die GitHub CLI veröffentlichen — Version setzen, Build abwarten, Release Notes zur Freigabe vorlegen, als Pre-Release veröffentlichen
---

# Skill: Release

Gilt für Desktop (Tauri) und Community (Docker). SaaS wird nicht über Releases verteilt, sondern über Coolify bei jedem Push auf `main`.

Hintergrund und Checkliste: [docs/operations/release-process.md](../../../docs/operations/release-process.md).

## Zwei feste Regeln

1. **Nur Pre-Releases**, bis Andreas ausdrücklich etwas anderes sagt. Nie `--prerelease=false`, nie `--latest`. *(Wächter: `tests/unit/release-governance.test.ts` prüft die Workflows)*
2. **Release Notes gibt Andreas frei.** Claude entwirft sie, legt sie als Text vor und veröffentlicht erst nach einem klaren Ja. Eine Freigabe gilt für genau diesen Text und genau diese Version.

**Veröffentlichen ist der eigentliche Freigabe-Schritt.** In dem Moment kopiert `update-channel.yml` die `latest.json` in den Branch `update-kanal`, und alle installierten Desktop-Apps zeigen beim nächsten Start „Neue Version“. Gleichzeitig startet der Docker-Build für Community.

## Werkzeug

GitHub CLI, angemeldet als `koreki-org`. Unter Windows liegt sie unter `C:\Program Files\GitHub CLI\gh.exe`, falls `gh` im aktuellen Terminal noch nicht im Pfad ist.

## Ablauf

### 1. Vorbereiten
- `main` ist sauber und gepusht (`git status`, `git log origin/main..`).
- Letzten Tag ermitteln: `git tag --sort=-creatordate | head -1`.
- Neue Versionsnummer: rein numerisch (`0.9.99`), kein `-beta` — der Windows-Installer (MSI) bricht sonst ab.
- **Welche Stelle steigt** (Semantic Versioning, seit 12.11.2026), entschieden an dem, was Lehrkräfte merken — `git log v<alt>..HEAD`:

  | Was seit dem letzten Release dazukam | Stelle | Beispiel |
  | :--- | :--- | :--- |
  | mindestens eine neue Funktion | mittlere, letzte auf 0 | 0.10.3 → 0.11.0 |
  | nur Fehlerbehebungen und Verbesserungen | letzte | 0.11.0 → 0.11.1 |
  | etwas, das Bestehendes bricht (z. B. `.koreki`-Dateien alter Versionen öffnen nicht mehr) | vor 1.0: mittlere, und die Release Notes sagen, was zu tun ist | 0.11.1 → 0.12.0 |

  Die erste Stelle bleibt 0. Der Schritt auf 1.0 ist eine Produktentscheidung von Andreas, nichts, was aus Commits folgt. Bis einschließlich 0.9.102 stieg bei jedem Release nur die letzte Stelle.
- **Betriebsanleitung prüfen, bevor die Version gesetzt wird.** Sie wird mit der App ausgeliefert; was im Build fehlt, fehlt beim Nutzer. Für jede Änderung aus `git log v<alt>..HEAD` fragen: *Berührt sie eine Angabe der Betriebsanleitung?* Gemeint sind Zweck, Grenzen, Genauigkeit, menschliche Aufsicht (Bestätigung vor dem Export), Kennzeichnung, Datenflüsse und Anbieter, Formate und Mengengrenzen. Lautet die Antwort bei einer Änderung ja, entwirft Claude die nächste Fassung (`src/legal/betriebsanleitung_v<n+1>.md`) nach Skill `eu-ai-act` und legt sie Andreas vor. Erst nach seiner Freigabe wird sie committet, und erst dann geht es mit der Version weiter. Lautet die Antwort überall nein, steht das als eine Zeile in der Vorlage der Release Notes, damit Andreas es sieht. Dasselbe gilt für das Handbuch, aber ohne Freigabe (Skill `handbuch`).
- **Kein Release nur für Handbuch oder Doku.** Das Handbuch geht über `handbuch.yml` bei jedem Push live; Doku-Änderungen reisen mit dem nächsten Release mit.

### 2. Version setzen, Tag pushen
- `npm version <neu> --no-git-tag-version` (schreibt `package.json` und `package-lock.json`).
- Dieselbe Nummer in `src-tauri/tauri.conf.json` → `"version"`. Beide müssen identisch sein; die App vergleicht ihre Version mit der aus `latest.json`.
- Commit `chore: release v<neu>` direkt auf `main`, Tag `v<neu>`, dann **beide** pushen: `git push origin main` und `git push origin v<neu>`.

### 3. Build abwarten
- `gh run list --workflow desktop-release.yml --limit 1`, dann `gh run watch <id>` im Hintergrund. Drei Jobs: `entwurf` legt den Entwurf an, `publish` baut Windows und Linux parallel hinein, `pruefen` schlägt fehl, wenn der `latest.json` eine Plattform fehlt. Dann nur den fehlenden Build neu starten (`gh run rerun <id> --failed`), nicht veröffentlichen.
- Dauer: mit gefülltem Rust-Cache einige Minuten; der erste Lauf nach einer Änderung an `Cargo.lock` baut den Cache neu und braucht wieder rund zehn.
- Danach den Entwurf prüfen: `gh release view v<neu> --json assets --jq '.assets[].name'`. Erwartet:
  - Windows: `*_x64-setup.exe` und `*.msi`, jeweils mit `.sig`
  - Linux: `*.AppImage` mit `.sig`, dazu `.deb` und `.rpm`
  - `latest.json`

  Fehlen `.sig` oder `latest.json`, ist das Secret `TAURI_SIGNING_PRIVATE_KEY` falsch oder leer. **Nicht veröffentlichen.**

### 4. Release Notes entwerfen und vorlegen
- Grundlage: `git log v<alt>..v<neu> --oneline --no-merges`.
- Für Lehrkräfte schreiben, nicht für Entwickler: Was kann ich jetzt, was ist behoben. Anrede du, kein Technikjargon, Begriffe aus `koreki-design-system` §2 (Expertise, Skills, Erfahrungsschatz, Intelligenz, Vorschlag).
- Weglassen: interne Umbauten, Tests, Wächter, Abhängigkeiten, Compliance-Akte.
- Aufbau: eine Zeile Überblick, dann „Neu“, „Verbessert“, „Behoben“ als kurze Listen. Leere Abschnitte entfallen.
- Text in eine Datei im Scratchpad schreiben, **im Chat vollständig zeigen und auf Freigabe warten.** Änderungswünsche einarbeiten und erneut vorlegen.

### 5. Veröffentlichen (nur nach Freigabe)
```bash
gh release edit v<neu> --repo koreki-org/koreki --notes-file <datei> --title "Koreki v<neu>" --draft=false --prerelease
```

### 6. Nachprüfen
- `gh run list --workflow update-channel.yml --limit 1` → erfolgreich.
- `curl -s https://raw.githubusercontent.com/koreki-org/koreki/update-kanal/latest.json | grep '"version"'` → zeigt `<neu>` (die Adresse wird bis zu fünf Minuten zwischengespeichert).
- `gh run list --workflow community-release.yml --limit 1` → erfolgreich; das Image heißt `ghcr.io/koreki-org/koreki:<neu>` (kein `latest` bei Pre-Releases).

## Was schiefgehen kann

- **Build scheitert, ohne dass sich unser Code geändert hat** (so am 12.11.2026: Rust 1.100 brach eine Linux-Abhängigkeit): Ursache im Workflow beheben und auf `main` pushen. Der Build liest den Workflow vom getaggten Stand — ein `rerun` hilft also nicht. Mit Andreas' Ja den **unveröffentlichten** Entwurf samt Tag löschen (`gh release delete v<neu> --yes --cleanup-tag`, lokal `git tag -d v<neu>`) und den Tag auf den reparierten Commit neu setzen und pushen. Die Versionsnummer bleibt. Rust steht deshalb in beiden Desktop-Workflows auf einer festen Version.
- **Veröffentlichte Releases sind unveränderlich** (Repo-Einstellung „immutable releases“): Dateien und Tag lassen sich danach nicht mehr ändern. Was am Entwurf fehlt, muss vor dem Veröffentlichen da sein.
- **Falsch veröffentlicht:** Den Kanal auf die vorige Version zurücksetzen: `gh workflow run update-channel.yml -f tag=v<alt>`. Das Problem dann mit einer neuen Version beheben.
- **Den Branch `update-kanal` nie löschen oder umbenennen.** Seine Adresse ist in jede installierte App eingebaut. Ausnahme: v0.9.99 fragt noch den alten Kanal-Release `aktualisierung` ab und findet dort nie etwas.
- **„failed to decode base64 key: Invalid symbol 239“:** Vor dem Secret steht ein Byte-Order-Mark. Windows PowerShell 5.1 setzt es, wenn man den Schlüssel per Pipe an `gh` gibt (so geschehen am 10.11.2026). Das Secret immer aus der Datei setzen, in Git Bash: `gh secret set TAURI_SIGNING_PRIVATE_KEY --repo koreki-org/koreki < ~/.tauri/koreki-updater.key`.
- **Signaturschlüssel verloren:** Kein Update erreicht mehr eine installierte App. Die Sicherung liegt bei Andreas im Passwort-Manager.
