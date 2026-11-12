# Koreki für die ganze Schule

Dieses Kapitel richtet sich an die Person, die an deiner Schule die IT betreut. Die **Community-Ausgabe** läuft auf einem Server der Schule. Lehrkräfte öffnen Koreki im Browser — eine Installation auf ihren Rechnern ist nicht nötig.

## Welche Variante? {#varianten}

| | Einzelplatz | Mehrere Lehrkräfte |
| :--- | :--- | :--- |
| Für wen | eine Lehrkraft oder ein kleines Team | das Kollegium |
| Anmeldung | keine | jede Lehrkraft mit eigenem Konto (Keycloak) |
| KI-Zugang | in Koreki selbst eingestellt | einmal zentral für alle |
| Adresse | `http://<server>:3000` | eigene Adresse, z. B. `https://koreki.deine-schule.de` |
| Bestandteile | Koreki | Koreki, Keycloak, Datenbank, Gateway |

Keycloak ist eine verbreitete Software für Anmeldung und Benutzerverwaltung. Koreki bringt sie fertig eingerichtet mit.

## Voraussetzungen {#voraussetzungen}

- Ein Server oder Rechner mit **Docker** und **Docker Compose**.
- **Node.js 18 oder neuer** — der Einrichtungsassistent ist damit geschrieben.
- **Git** — der Assistent lädt Koreki darüber herunter.
- Für eine KI im Haus: ein Rechner mit leistungsfähiger Grafikkarte und [Ollama](https://ollama.com). Er kann derselbe sein wie der Koreki-Server, muss es aber nicht.

## Installation {#installation}

Öffne ein Terminal im Ordner, in dem Koreki liegen soll, und starte den Assistenten:

::: code-group

```powershell [Windows]
iwr -useb https://get.koreki.org | iex
```

```bash [Linux / macOS]
curl -fsSL https://get.koreki.org/sh | bash
```

:::

Der Assistent prüft zuerst, ob Docker vorhanden ist, und fragt dann nach der Variante:

- **1 — Community Single-User:** Einzelplatz. Er fragt optional nach einem Mistral-Schlüssel und startet Koreki auf Port 3000.
- **2 — Community Multi-User:** mehrere Lehrkräfte. Er fragt nach der **öffentlichen Adresse**, unter der das Kollegium Koreki aufruft, und bei einer eigenen Domain nach dem Port auf dem Server (Vorgabe 8080). Die Passwörter für Keycloak und die Datenbank erzeugt er selbst.

Die Punkte 3 und 4 im Menü (SaaS, Desktop) brauchst du für eine Schule nicht.

::: tip Hinter einem Reverse Proxy
Läuft vor dem Server schon HAProxy, Traefik oder Nginx mit dem Zertifikat der Schule, leitest du die Domain dort auf den Port weiter, den du im Assistenten angegeben hast. Koreki und Keycloak teilen sich diesen einen Port: `/` ist Koreki, `/auth` ist Keycloak.
:::

## Erste Anmeldung (Mehrere Lehrkräfte) {#anmeldung}

Koreki legt bewusst **kein Konto mit Standardpasswort** an. Einmalig nach der Installation:

1. Öffne die Benutzerverwaltung unter `<deine Adresse>/auth/admin` und melde dich als `admin` an. Das Passwort steht in der Datei `.env` im Koreki-Ordner unter `KC_ADMIN_PASSWORD`.
2. Wähle oben links den Bereich **koreki**, dann **Users** → `koreki` → Reiter **Credentials**.
3. Setze ein Passwort. Mit **Temporary** an muss die Person es bei der ersten Anmeldung selbst ändern.

Das Konto `koreki` hat Administratorrechte in Koreki.

## Lehrkräfte hinzufügen {#lehrkraefte}

Weitere Lehrkräfte legst du in derselben Benutzerverwaltung an (**Users** → **Add user**) und vergibst ein vorläufiges Passwort. Sie brauchen die Rolle `koreki-user`; wer Koreki verwalten soll, zusätzlich `koreki-admin`. Nach einer Änderung der Rollen muss sich die Person einmal ab- und wieder anmelden.

## KI anbinden {#ki}

Bei mehreren Lehrkräften stellst du die KI **einmal zentral** ein: Melde dich mit Administratorrechten an und öffne oben rechts das Zahnrad (**System-Einstellungen**). Alle Lehrkräfte nutzen dann diesen Zugang.

- **Ollama auf einem eigenen KI-Rechner:** Trage dessen Adresse ein, etwa `http://192.168.1.50:11434`. Ollama muss dafür im Netz erreichbar sein, nicht nur auf dem Rechner selbst — dazu startet man Ollama mit `OLLAMA_HOST=0.0.0.0`.
- **Ollama auf demselben Server wie Koreki:** Koreki läuft in Docker und erreicht `localhost` des Servers nicht. Unter Docker Desktop (Windows, macOS) lautet die Adresse in der Regel `http://host.docker.internal:11434`; unter Linux nimmst du die IP des Servers.
- **Mittwald oder Mistral:** Schlüssel eintragen — siehe [KI verbinden](/erste-schritte/ki-verbinden).

## Updates {#updates}

Starte den Assistenten erneut im selben Ordner. Er erkennt die bestehende Installation und fragt: **(U)pdate** oder **(R)econfigure**. Mit **U** bleiben Einstellungen, Schlüssel und Passwörter erhalten; Koreki wird auf die neueste Version gebracht und neu gestartet.

## Datenschutz {#datenschutz}

- **Schülerarbeiten werden nicht auf dem Server gespeichert.** Sie liegen im Browser der Lehrkraft, solange sie korrigiert, und laufen nur auf dem Weg zur KI durch den Server. Dauerhaft liegen dort Konten und Profile (Expertise, Skills, Erfahrungsschatz, Intelligenz).
- **Keine Nutzungsdaten an uns.** Koreki fragt lediglich bei GitHub nach, ob es eine neue Version gibt.
- Was Schulleitung und Datenschutzbeauftragte vor dem Start klären müssen, mit Vorlage für das Verarbeitungsverzeichnis: [Datenschutz für Schulen](https://koreki.org/security#schulen).

## Wenn etwas hakt {#probleme}

### „502 Bad Gateway“ direkt nach dem Start

Keycloak braucht beim ersten Start ein bis zwei Minuten. Warte kurz und lade neu. Hilft das nicht, zeigt `docker compose logs keycloak` den Grund.

### Fehler bei der Anmeldung („Invalid parameter: redirect_uri“)

Die Adresse im Browser stimmt nicht mit der Adresse überein, die im Assistenten angegeben wurde — etwa `http` statt `https` oder ein anderer Port. Starte den Assistenten mit **(R)econfigure** und gib die Adresse genau so an, wie das Kollegium sie aufruft.

### Niemand hat Administratorrechte

Prüfe in der Benutzerverwaltung unter **Users** → Person → **Role mapping**, ob `koreki-admin` zugewiesen ist. Danach einmal ab- und wieder anmelden.

### Seite lädt ohne Gestaltung

Starte das Gateway neu:

```bash
docker compose -f docker-compose.community-multi-full.yml restart gateway
```

Weitere technische Einzelheiten stehen im [Repository](https://github.com/koreki-org/koreki/blob/main/docs/operations/community-multi-user-setup.md).
