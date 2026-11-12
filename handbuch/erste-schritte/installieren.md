# Koreki installieren

Koreki Desktop ist ein Programm für deinen eigenen Rechner. Deine Daten bleiben auf deinem Gerät; was an eine KI geht, entscheidest du mit der Wahl des Anbieters im nächsten Schritt.

## Desktop: Windows und Linux

1. Öffne die [Download-Seite auf GitHub](https://github.com/koreki-org/koreki/releases).
2. Lade unter **Assets** der neuesten Version die Datei für dein System:

   | System | Datei |
   | :--- | :--- |
   | Windows | `koreki_…_x64-setup.exe` |
   | Linux (Ubuntu, Debian) | `koreki_…_amd64.deb` |
   | Linux (Fedora, openSUSE) | `koreki-…x86_64.rpm` |
   | Linux (alle anderen) | `koreki_…_amd64.AppImage` |

3. Starte die Datei und folge dem Installationsassistenten.
4. Öffne Koreki. Beim ersten Start fragt dich Koreki, welche KI es verwenden soll — das erklärt [KI verbinden](/erste-schritte/ki-verbinden).

::: info Updates
Koreki sucht selbst nach neuen Versionen und bietet dir das Update an. Du musst die Download-Seite also nur einmal besuchen.
:::

## Community: für eine ganze Schule

Die Community-Ausgabe läuft auf einem Server der Schule, mehrere Lehrkräfte melden sich dort an. Sie richtet sich an die Person, die an deiner Schule die IT betreut. Voraussetzung ist [Docker](https://www.docker.com/).

Ein Befehl startet den Einrichtungsassistenten:

::: code-group

```powershell [Windows]
iwr -useb https://get.koreki.org | iex
```

```bash [Linux / macOS]
curl -fsSL https://get.koreki.org/sh | bash
```

:::

Der Assistent fragt, ob Koreki für eine Person oder für mehrere mit Anmeldung eingerichtet werden soll, und erledigt den Rest. Wer ihn später noch einmal startet, bekommt die neueste Version.
