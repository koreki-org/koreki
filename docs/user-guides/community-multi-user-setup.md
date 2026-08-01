# Koreki Community Multi-User Setup Guide 🏮🛡️🏛️

Diese Anleitung beschreibt, wie man die **Koreki Community Multi-User Edition** (Full-Stack) mit Keycloak und Nginx-Gateway in Betrieb nimmt.

## 1. Voraussetzungen
- Docker & Docker Compose installiert
- Git installiert
- Node.js 18+ installiert (für den Setup-Wizard)

## 2. Das Environment-Konzept
Die Konfiguration unterscheidet sich zwischen lokaler Entwicklung und echtem Server-Betrieb nur durch die URL-Angaben in der `.env`. Es gibt **eine** Realm-Datei (`keycloak/koreki-realm.json`) für alle Umgebungen.

### Entwicklung (Lokal / Localhost)
Ideal für Tests auf dem eigenen Rechner.
```bash
APP_URL=http://localhost:8080
APP_HOSTNAME=localhost
PUBLIC_PORT=8080
KC_HOSTNAME_PORT=8080
```
- Erreichbar unter: `http://localhost:8080`

### Produktion (Server / Domain hinter Reverse Proxy)
Für den Einsatz in der Schule mit eigener Domain hinter HAProxy, Traefik oder Nginx.
```bash
APP_URL=https://koreki.deine-schule.de
APP_HOSTNAME=koreki.deine-schule.de
PUBLIC_PORT=8080
KC_HOSTNAME_PORT=-1
```
- Erreichbar unter: `https://koreki.deine-schule.de`
- `PUBLIC_PORT=8080`: Der Port, auf dem Docker den Nginx-Gateway auf dem Server bindet (HAProxy leitet Port 443 hierhin weiter)
- `KC_HOSTNAME_PORT=-1`: Standardport (443/80) — Keycloak hängt keinen Port an URLs an

> [!NOTE]
> Die `redirectUris` in der Keycloak Realm-Datei werden vom Setup-Wizard **automatisch** auf Basis der `APP_URL` konfiguriert. Ein manuelles Editieren der JSON-Dateien ist nicht mehr nötig.

---

## 3. Installation Schritt-für-Schritt

### Option A: Automatisierter 1-Befehl-Setup (Empfohlen)
Der interaktive Setup-Wizard richtet das gesamte Multi-User-Environment inkl. Keycloak automatisch ein:

* **Windows (PowerShell):**
  ```powershell
  iwr -useb https://get.koreki.org | iex
  ```
* **Linux / macOS:**
  ```bash
  curl -fsSL https://get.koreki.org/sh | bash
  ```

Der Wizard fragt:
1. **Public URL** — z.B. `http://localhost:8080` oder `https://koreki.deine-schule.de`
2. **Port auf diesem Server** — nur bei externen Domains (Default: `8080`)
3. **Mistral API Key** — optional, für Cloud-AI-Modelle

> [!TIP]
> Bei wiederholter Ausführung aktualisiert der Installer automatisch auf die neueste Version (`git fetch + reset`). Ein manuelles Löschen des Ordners ist nicht nötig.

---

### Option B: Manuelle Installation
1.  **Repository klonen:**
    ```bash
    git clone https://github.com/koreki-org/koreki.git
    cd koreki
    ```

2.  **`.env` konfigurieren:**
    Erstelle eine `.env` im Hauptverzeichnis und setze die Variablen gemäß deinem Ziel (Dev oder Prod).

3.  **System starten:**
    ```bash
    docker compose -f docker-compose.community-multi-full.yml up -d --build
    ```

4.  **Keycloak Initialisierung:**
    Beim ersten Start importiert Keycloak automatisch den gewählten Realm. Dies kann ca. 60-90 Sekunden dauern.

---

## 4. Architektur

```
                          ┌──────────────────────────────────────────────┐
Internet → HAProxy (:443) → Nginx Gateway (:80/PUBLIC_PORT) → Koreki (:3000)
           (SSL Term.)    │                                  → Keycloak (:8080)
                          └──────────────────────────────────────────────┘
```

- **Nginx Gateway** bündelt alle Requests auf einem Port (`PUBLIC_PORT`)
- `/` → Next.js App (Koreki)
- `/auth` → Keycloak Identity Provider

---

## 5. Administration & Logins

- **Koreki UI:** `http://localhost:8080` (bzw. deine Domain)
- **Keycloak Admin UI:** `http://localhost:8080/auth/admin`
- **Standard-Admin (Keycloak):** `admin` / Passwort wird vom Wizard generiert (siehe `.env` → `KC_ADMIN_PASSWORD`)

### Ersten Koreki-Nutzer freischalten

Der Realm legt den Benutzer `koreki` mit Admin-Rolle an — **bewusst ohne Passwort**, damit keine Installation mit einem allgemein bekannten Standard-Zugang ans Netz geht.

Einmalig nach der Installation:
1. Keycloak Admin UI öffnen (`/auth/admin`), Login als `admin`
2. Realm `koreki` → *Users* → `koreki` → Reiter *Credentials*
3. Passwort setzen (empfohlen: *Temporary* = An, dann muss die Lehrkraft es beim ersten Login selbst ändern)

Weitere Lehrkräfte werden im selben Menü angelegt und erhalten die Realm-Rolle `koreki-user`; für Administratoren zusätzlich `koreki-admin`.

---

## 6. Fehlerbehebung (Troubleshooting)

### 502 Bad Gateway
- Keycloak ist noch beim Hochfahren/Importieren. Warte 60 Sekunden.
- Prüfe die Logs: `docker compose logs keycloak -f`

### Redirect-Fehler (Invalid Parameter)
- Prüfe, ob `APP_URL` in der `.env` exakt mit der URL übereinstimmt, die du im Browser aufrufst.
- Führe den Installer erneut aus — er aktualisiert die Redirect-URIs automatisch.

### Login klappt, aber die App meldet durchgehend „Nicht angemeldet" (401)
Der Server verifiziert jedes Token gegen die Signaturschlüssel von Keycloak (JWKS). Schlägt der Abruf fehl, werden alle Anfragen abgelehnt.
- Logs prüfen: `docker compose logs koreki | Select-String JWKS` (bzw. `grep JWKS`)
- Erreichbarkeit aus dem App-Container testen (erwartet: `sig-Keys: [ 'RS256' ]`):
  ```bash
  docker compose -f docker-compose.community-multi-full.yml exec -T koreki node -e "fetch('http://gateway/auth/realms/koreki/protocol/openid-connect/certs').then(r=>r.json()).then(j=>console.log('sig-Keys:',j.keys.filter(k=>k.use==='sig').map(k=>k.alg)))"
  ```
- Prüfen, ob der Issuer exakt `NEXT_PUBLIC_OIDC_ISSUER` entspricht:
  ```bash
  curl -s <APP_URL>/auth/realms/koreki/.well-known/openid-configuration | grep -o '"issuer":"[^"]*"'
  ```
- Liefert das nichts, `OIDC_ISSUER_INTERNAL` in der Compose-Datei auf einen aus dem Container erreichbaren Pfad anpassen.

### Niemand hat Admin-Rechte
Admin-Rechte hängen an der Realm-Rolle `koreki-admin`. Im Keycloak Admin UI unter *Users* → *Role mapping* prüfen, ob die Rolle zugewiesen ist. Nach einer Änderung muss sich die Lehrkraft neu anmelden, damit ein Token mit der neuen Rolle ausgestellt wird.

### CSS/JS lädt nicht (MIME type Fehler)
- Container neu starten: `docker compose -f docker-compose.community-multi-full.yml restart gateway`

### `exec: ./start.sh: not found`
- Tritt auf, wenn alte Docker-Images mit Windows-Zeilenumbrüchen gecacht sind.
- Lösung: `docker compose -f docker-compose.community-multi-full.yml build --no-cache`

---

> [!IMPORTANT]
> **Sicherheit:** Ändere vor dem Produktivgang unbedingt alle Passwörter (`KC_DB_PASSWORD`, `KC_ADMIN_PASSWORD`) in der `.env`!
