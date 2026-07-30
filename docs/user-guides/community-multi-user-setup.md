# Koreki Community Multi-User Setup Guide 🏮🛡️🏛️

Diese Anleitung beschreibt, wie man die **Koreki Community Multi-User Edition** (Full-Stack) mit Keycloak und Nginx-Gateway in Betrieb nimmt.

## 1. Voraussetzungen
- Docker & Docker Compose installiert
- Git installiert
- Eine `.env` Datei (Vorlage siehe unten)

## 2. Das Environment-Konzept
Wir nutzen ein **Multi-Environment-System**, um zwischen lokaler Entwicklung und echtem Server-Betrieb zu unterscheiden. Gesteuert wird dies über die `.env`.

### Entwicklung (Lokal / Localhost)
Ideal für Tests auf dem eigenen Rechner.
```bash
ENVIRONMENT=dev
APP_HOSTNAME=localhost
PUBLIC_PORT=8080
APP_URL=http://localhost:8080
```
- Nutzt automatisch: `keycloak/koreki-realm.dev.json`
- Erreichbar unter: `http://localhost:8080`

### Produktion (Server / Domain)
Für den Einsatz in der Schule mit eigener Domain.
```bash
ENVIRONMENT=prod
APP_HOSTNAME=koreki.deine-schule.de
PUBLIC_PORT=443
APP_URL=https://koreki.deine-schule.de
```
- Nutzt automatisch: `keycloak/koreki-realm.prod.json`
- Erreichbar unter: `https://koreki.deine-schule.de`
- **Wichtig:** In der `koreki-realm.prod.json` müssen die Redirect-URLs einmalig auf die echte Domain angepasst werden.

---

## 3. Installation Schritt-für-Schritt

### Option A: Automatisierter 1-Befehl-Setup (Empfohlen)
Der interaktive Setup-Wizard richtet das gesamte Multi-User-Environment inkl. Keycloak automatisch ein:

* **Windows (PowerShell):**
  ```powershell
  iwr -useb https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install/install.ps1 | iex
  ```
* **Linux / macOS:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install/install.sh | bash
  ```

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

## 4. Administration & Logins

- **Koreki UI:** `http://localhost:8080` (bzw. deine Domain)
- **Keycloak Admin UI:** `http://localhost:8080/auth/admin`
- **Standard-Admin (Keycloak):** `admin` / `admin` (Passwort in der `.env` unter `KC_ADMIN_PASSWORD` ändern!)
- **Standard-Nutzer (Koreki App):** `koreki` / `koreki` (bereits mit Admin-Rechten vorkonfiguriert)

---

## 5. Fehlerbehebung (Troubleshooting)

### 502 Bad Gateway
- Keycloak ist noch beim Hochfahren/Importieren. Warte 60 Sekunden.
- Prüfe die Logs: `docker compose logs keycloak -f`

### Redirect-Fehler (Invalid Parameter)
- Prüfe, ob `APP_HOSTNAME` und `PUBLIC_PORT` in der `.env` exakt mit den `redirectUris` in der jeweiligen `koreki-realm.*.json` übereinstimmen.

---

> [!IMPORTANT]
> **Sicherheit:** Ändere vor dem Produktivgang unbedingt alle Passwörter (`KC_DB_PASSWORD`, `KC_ADMIN_PASSWORD`) in der `.env`!
