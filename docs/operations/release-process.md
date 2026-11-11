---
title: "📦 Koreki Release-Prozess (Community & Desktop)"
description: "Leitfaden zur Erstellung von Versionen für die Open-Source Community und die Desktop-Applikation."
author: "@principal_architect"
date: "2026-04-23"
last_updated: "2026-11-10"
status: "Active"
domain: "operations"
security_classification: "Public"
---

# 📦 Koreki Release-Prozess (Community & Desktop)

## 1. Executive Summary
Koreki wird in drei Editionen verteilt: SaaS (Continuous Deployment), Community (Docker) und Desktop (Native Binaries). Während SaaS automatisch über Coolify bereitgestellt wird, erfordern Community und Desktop eine explizite Versionierung über Git-Tags.

## 🏗️ Release-Workflow (GitHub Actions)

```mermaid
graph TD
    A[👨‍💻 Entwickler] -->|npm version| B(Lokaler Tag v*.*.*)
    B -->|git push --tags| C{GitHub Actions}
    
    subgraph "Desktop Release"
        C --> F[🏗️ Tauri Build Win/Linux, signiert]
        F --> G[🎁 Entwurf, Pre-Release]
    end

    G -->|Release Notes freigegeben, veröffentlicht| H{release: published}
    H --> I[📡 latest.json in den Branch update-kanal]
    H --> D[🐳 Build Docker Image]
    D --> E[📤 ghcr.io, nur Versionstag]
```

## 📋 Schritt-für-Schritt Anleitung

### 1. Versionierung vorbereiten
Bevor ein Release erstellt wird, müssen die Versionsnummern in den Konfigurationsdateien synchronisiert werden.

1.  **`package.json`**: Update des `"version"` Feldes.
2.  **`src-tauri/tauri.conf.json`**: Update des `"version"` Feldes (muss mit package.json übereinstimmen).

> Seit 10.11.2026 läuft der ganze Ablauf über die GitHub CLI; Schritt für Schritt im Skill [`release`](../../.claude/skills/release/SKILL.md). Releases sind bis auf Widerruf **nur Pre-Releases**, und veröffentlicht wird erst, wenn Andreas die Release Notes freigegeben hat.

### 2. Git-Tag erstellen und pushen
Der Release-Prozess wird ausschließlich durch das Pushen eines Tags ausgelöst, der dem Muster `v*` (z.B. `v0.9.10`) entspricht. 

> [!IMPORTANT]
> **Windows/MSI Kompatibilität:** Tags und Versionsnummern in `package.json`/`tauri.conf.json` müssen **rein numerisch** sein (z.B. `0.9.10`). Buchstaben wie `-beta` führen zu Fehlern beim Erstellen der Windows-Installer (MSI).

```powershell
# Änderungen committen
git add .
git commit -m "chore: release v0.9.10"

# Tag erstellen
git tag v0.9.10

# Push an den Server (löst Actions aus)
git push origin main
git push origin v0.9.10
```


### 3. Community Edition aktualisieren
Seit 10.11.2026 aktualisiert sich eine Community-Instanz auf die **freigegebene** Version, nicht auf `main`. Den Installer auf dem Server im Koreki-Ordner erneut ausführen und dieselbe Variante wählen, dann „Update“:

```bash
curl -fsSL https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install/install.sh | bash
```

Der Installer liest die Version aus dem Update-Kanal (`update-kanal/latest.json`), wechselt das Repo auf deren Tag (`git checkout -f v…`) und baut neu. Die `.env` bleibt erhalten — bei Single wie bei Multi. Lokale Änderungen an versionierten Dateien (z. B. `nginx.conf`) gehen dabei verloren.

**Neu einrichten (R)** heißt bei Multi: bei null anfangen. Der Installer verlangt dafür die Eingabe „löschen“ und entfernt erst dann Container und Volumes — alle Keycloak-Benutzer und App-Daten. Scheitert ein Start, löscht er nie von selbst (bis 11.11.2026 tat er das per `down -v` im Fehlerzweig, ausgelöst schon durch ein neues Datenbank-Passwort).

**Hinweis in der App:** Admins einer Community-Instanz sehen rechts oben „Neue Version“, sobald der Kanal eine neuere Version meldet als die laufende. Der Server fragt den Kanal höchstens alle sechs Stunden (`/api/neue-version`, `src/lib/version-kanal.ts`); die Browser der Lehrkräfte sprechen nicht mit GitHub. In Multi sehen nur Admins den Hinweis.


## 🚀 Automatisierte Artefakte

### Community Edition (Docker)
Das Docker-Image wird gebaut, sobald ein Release **veröffentlicht** ist (nicht schon beim Tag), und unter `ghcr.io/koreki-org/koreki` abgelegt. *   **Tags:** Immer der Versionstag; `latest` nur bei echten Releases, nicht bei Pre-Releases.
*   **Modus:** Das Image ist vorkonfiguriert für `NEXT_PUBLIC_KOREKI_MODE=community` und `NEXT_PUBLIC_SINGLE_USER_MODE=true`.

### Desktop App (Tauri)
GitHub Actions baut native Installer für Windows (`.exe`, `.msi`) und Linux (`.AppImage`, `.deb`, `.rpm`). macOS wird derzeit nicht gebaut.
*   **Ablage:** Die Dateien werden an einen **Entwurf** angehängt, der als Pre-Release markiert ist.
*   **Aktion erforderlich:** Release Notes entwerfen, freigeben lassen, dann per `gh release edit` veröffentlichen (Skill `release`).

### Selbst-Aktualisierung der Desktop-App (seit 10.11.2026)
Installierte Desktop-Apps fragen beim Start einmal `https://raw.githubusercontent.com/koreki-org/koreki/update-kanal/latest.json` ab — den **Update-Kanal**, nicht `releases/latest`, weil GitHub Pre-Releases dort nicht mitzählt. `update-channel.yml` schreibt die `latest.json` beim Veröffentlichen eines Releases in den Branch `update-kanal`. Ein Branch und kein Release, weil im Repo unveränderliche Releases gelten und ein Kanal-Release keine neue Datei annimmt (so gescheitert bei v0.9.99, die deshalb noch auf den toten Release `aktualisierung` zeigt). Den Branch nie löschen: seine Adresse steckt in jeder installierten App. Gibt es eine neuere Version, erscheint rechts oben die Pille „Neue Version“; installiert wird nur auf Klick in den Einstellungen, weil der Neustart die geladenen Arbeiten löscht (Code: `src/lib/neue-version.ts`).

*   **Freigabe = Veröffentlichen.** Ein Entwurf erreicht keine App. Erst das Veröffentlichen füllt den Kanal und verteilt die Version an alle Apps — vorher prüfen.
*   **Signatur:** Der Workflow baut mit `--config src-tauri/tauri.release.conf.json` die Update-Pakete (`.sig`) und `latest.json`. Dafür braucht er die Secrets `TAURI_SIGNING_PRIVATE_KEY` (Inhalt der Schlüsseldatei) und `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (leer, solange der Schlüssel kein Passwort hat). Der öffentliche Schlüssel steht in `src-tauri/tauri.conf.json` unter `plugins.updater.pubkey`.
*   **Schlüssel nie verlieren.** Ohne den privaten Schlüssel kann keine installierte App mehr aktualisiert werden; alle müssten von Hand neu installieren. Eine Sicherungskopie liegt außerhalb von Rechner und Repository (Passwort-Manager).
*   **Lokale Builds** (`npm run build:desktop`) erzeugen keine Update-Pakete und brauchen keinen Schlüssel.
*   **Linux:** Die `latest.json` enthält AppImage, `.deb` und `.rpm`. Ob die Selbst-Aktualisierung bei `.deb`/`.rpm` klappt, ist ungetestet.
*   **Altbestand:** Versionen bis 0.9.98 haben keinen Updater, 0.9.99 fragt den falschen Kanal. Beide müssen einmal von Hand auf 0.9.100 oder neuer aktualisiert werden.

## 🛡️ Permanent Release-Audit Guardrails (Checkliste vor jedem Release)

Um ein unaufgeräumtes Repository zu vermeiden, wird für einzelne Releases **keine separate Audit-Datei** mehr erstellt. Stattdessen führt der **Principal Architect** vor jedem `git push --tags` diese standardisierte Checkliste durch und dokumentiert die Freigabe direkt in der **GitHub Pull Request Beschreibung** oder im **Release-Changelog**.

### 1. 🔐 Geheimnis- & Security-Check
- [ ] **Secret Search:** Keine produktiven API-Keys, SMTP-Passwörter, Stripe-Keys oder NextAuth-Secrets im aktuellen Code oder der Git-Historie.
- [ ] **Umgebungsvariablen:** Die Datei `.env` ist ignoriert. `.env.example` ist auf dem neuesten Stand für die neue Version und enthält ausschließlich sichere Dummy-Werte.
- [ ] **Vulnerability Audit:** Ein lokaler Lauf von `npm run security-check` verläuft fehlerfrei.

### 2. 🏗️ Technische Integrität
- [ ] **Versions-Synchronität:** Die Versionsnummer in `package.json` und `src-tauri/tauri.conf.json` ist absolut identisch.
- [ ] **Update-Pakete:** Der Draft Release enthält `latest.json` und zu jedem Installer eine `.sig`-Datei. Fehlen sie, findet keine installierte App die Version.
- [ ] **Tag-Format:** Die Versionsnummer ist rein numerisch (z.B. `0.9.57`). Suffixe wie `-beta` sind ausgeschlossen (Tauri-Windows-Kompatibilität).
- [ ] **Relative Pfade:** Alle Verlinkungen im `README.md` und der Hauptdokumentation zeigen auf existierende, korrekte Pfade im Repository.

### 3. ⚖️ Lizenz- & Markenkonformität
- [ ] **Dual-Licensing:** Das `README.md` verweist korrekt auf die freie pädagogische Nutzung (Polyform Non-Commercial) und den kommerziellen White-Label-Hostingkontakt für Dienstleister.
- [ ] **Mitwirkende (CLA):** Die `CONTRIBUTING.md` enthält den rechtlichen Rahmen für Beiträge.

---
*Status: Release Process Active*