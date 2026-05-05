---
title: "Coolify Deployment Guide für Koreki"
description: "Koreki Dokumentation: Coolify Deployment Guide für Koreki"
author: "@qa_engineer"
date: "2026-04-05"
last_updated: "2026-04-05"
status: "Approved"
domain: "operations"
security_classification: "Public"
---

# Coolify Deployment Guide für Koreki

## 1. Executive Summary & Kontext

Dieses Projekt ist dank des integrierten `Dockerfile`s sofort bereit für **Coolify**. Coolify erkennt die Konfiguration automatisch und baut dein Projekt.

---

## 1. Coolify Server Setup
Logge dich auf deinem leeren IONOS-Server (Ubuntu 22.04+) ein und installiere Coolify:
```bash
ssh root@DEINE_SERVER_IP
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```
*Nach der Installation erreichst du das Dashboard unter `http://DEINE_SERVER_IP:8000`.*

---

## 2. Datenbank (PostgreSQL) anlegen
Damit die App funktioniert, brauchen wir zuerst eine Datenbank in Coolify.

1. Gehe in Coolify auf dein Projekt.
2. Klicke auf **+ New** -> **Database** -> **PostgreSQL**.
3. Bestätige die Vorgaben und klicke auf **Start**.
4. Wichtig: Gehe in die Einstellungen der neuen Datenbank. Dort findest du den **Internen Connection String** (URL). Dieser sieht ungefähr so aus: `postgresql://postgres:passwort@postgresql-XYZ:5432/postgres`.
5. Kopiere diesen String!

---

## 3. Web-App hinzufügen
Jetzt fügen wir den eigentlichen Code von GitHub hinzu.

1. Klicke in Coolify wieder auf **+ New** -> **Private Repository (with GitHub App)**.
2. Wenn du das zum ersten Mal machst, fordert Coolify dich auf, eine "GitHub App" zu erstellen. Folge einfach dem Assistenten (das erlaubt Coolify den sicheren Lesezugriff auf deinen privaten Code).
3. Wähle danach deinen GitHub-Account und das Repository `koreki` aus.
4. **Branch**: `main`
5. Setze den Haken bei "is it a Docker Compose file?" **NICHT**, wir nutzen das normale `Dockerfile`.
6. Coolify erkennt das Dockerfile automatisch.

### Umgebungsvariablen (Secrets) einstellen
Bevor du deployst, gehe bei der neuen Web-App auf **Environment Variables**. Füge dort folgende Variablen hinzu:

- `DATABASE_URL`: *(Füge hier den kopierten PostgreSQL-String aus Schritt 2 ein!)*
- `MISTRAL_API_KEY`: *(Dein Mistral Key)*
- `MITTWALD_API_KEY`: *(API-Key für Qwen 3.6 / Mittwald Inferenz)*
- `NEXTAUTH_SECRET`: *(Ein langer, zufälliger String für die Sicherheit)*
- `STRIPE_TEST_MODE`: `true`

Klicke auf **Save**.

---

## 5. Lessons Learned & Troubleshooting (WICHTIG!)
Beim ersten Einrichten auf einem leeren Server können diese 4 klassischen Fehler auftreten. So löst du sie:

### 1. "No available server" im Coolify Dashboard
- **Fehler:** Coolify weiß nicht, wo es deployen soll.
- **Lösung:** In den App-Einstellungen unter *Configuration -> Build Pack* prüfen, ob **Dockerfile** ausgewählt ist. Falls ja, Server unter "Servers" prüfen (muss "Healthy" sein) oder App löschen und neu anheften.

### 2. Coolify Dashboard stürzt beim Deployen ab (OOM)
- **Fehler:** Der Server hat zu wenig RAM (Arbeitsspeicher), um die App zu bauen.
- **Lösung:** Swap-Speicher (festplattenbasierten RAM) einrichten. Per SSH auf dem Server:
  ```bash
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  docker restart coolify
  ```

### 3. "Nicht sichere Verbindung" oder SSL klappt nicht
- **Fehler:** Let's Encrypt kann das Zertifikat nicht generieren.
- **Lösung 1 (DNS checken):** Der DNS A-Record muss auf die genaue IP des Servers zeigen.
- **Lösung 2 (Nginx Konflikt):** Falls ein alter Nginx/Apache auf dem Server läuft, blockiert dieser die Ports 80/443 für Coolify. Logge dich ein und stoppe ihn (`systemctl stop nginx && systemctl disable nginx`).
- **Lösung 3 (Browser Cache):** Wenn es im Inkognito-Fenster (oder Edge) geht, aber im normalen Chrome nicht: Chrome-Cache leeren (Website-Daten löschen).

### 4. Docker Build bricht bei `/app/public` ab
- **Fehler:** Next.js erwartet den `public`-Ordner, aber Git ignoriert leere Ordner.
- **Lösung:** Wurde im Code behoben, indem wir eine `.gitkeep` Datei in den `public` Ordner gelegt haben.

### 6. "No space left on device" (Speicherplatz voll)
- **Fehler:** Der Build bricht ab, weil kein Speicherplatz mehr vorhanden ist (z.B. Fehler beim Entpacken von Layern oder beim Schreiben der `docker-compose.yaml`).
- **Ursache:** Alte Docker-Images, abgestürzte Container oder nicht genutzte Volumes belegen den gesamten Speicher.
- **Lösung:** Per SSH auf den Server einloggen und "Großputz" machen:
  ```bash
  # 1. Alle ungenutzten Docker-Daten löschen (Images, Netzwerke, Cache)
  docker system prune -af

  # 2. ALLE ungenutzten Volumes löschen (Vorsicht: Löscht keine aktiven DB-Volumes)
  docker volume prune -f

  # 3. Den Boot-Speicher prüfen (oft sind alte Kernel-Updates das Problem)
  sudo apt-get autoremove && sudo apt-get autoclean
  ```
  *Falls der Fehler `tee: ... No space left on device` auftritt, ist oft der Ordner `/var/lib/docker` oder `/data/coolify` physisch voll.*

### 7. Prisma "EACCES: permission denied, mkdir '/nonexistent'"
- **Fehler:** Prisma-Befehle via `npx` schlagen fehl, weil `npx` versucht, einen Cache im (nicht existierenden) Home-Verzeichnis des Docker-Users anzulegen.
- **Lösung:** Nutze den direkten Pfad zum Prisma-Binary statt `npx`:
  ```bash
  ./node_modules/.bin/prisma db push
  ./node_modules/.bin/prisma db seed
  ```
  *Oder setze temporär ein beschreibbares Cache-Verzeichnis:*
  ```bash
  export npm_config_cache=/tmp/.npm && npx prisma db push
  ```
