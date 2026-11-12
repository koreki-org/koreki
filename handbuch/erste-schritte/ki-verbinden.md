# KI verbinden

Koreki bringt keine eigene KI mit. Du wählst, wer die Arbeiten liest und bewertet. Dafür gibt es zwei Wege.

## Weg 1: Auf deinem eigenen Rechner (Ollama)

Die KI läuft auf deinem Gerät. **Keine Schülerarbeit verlässt deinen Rechner.**

- **Du brauchst** einen Rechner mit leistungsfähiger Grafikkarte (NVIDIA oder Apple). Ohne sie ist die Korrektur sehr langsam.
- **So geht's:**
  1. [Ollama herunterladen](https://ollama.com/download) und installieren.
  2. Das empfohlene Modell laden — aktuell **Qwen 3.8**.
  3. In Koreki im KI-Setup **Ollama** wählen und das geladene Modell auswählen.

## Weg 2: Bei einem Anbieter in der EU

Die Arbeiten werden verschlüsselt an einen Anbieter mit Servern in der EU geschickt, der die KI für dich betreibt. Das geht auf jedem Rechner und braucht nur einen **Zugangsschlüssel** (API-Key) vom Anbieter.

- **Mittwald** — Hosting in Deutschland.
- **Mistral** — französischer Anbieter.

So geht's:

1. Beim Anbieter ein Konto anlegen und einen Zugangsschlüssel erstellen.
2. In Koreki im KI-Setup den Anbieter wählen und den Schlüssel eintragen.

::: tip Wo der Schlüssel liegt
Unter Windows speichert Koreki Desktop den Schlüssel verschlüsselt im Windows-Tresor, nicht als lesbare Datei.
:::

::: warning Bitte vorher klären
Bevor du echte Arbeiten an einen Anbieter schickst, kläre mit deiner Schule, ob das erlaubt ist. Oft braucht es dafür einen Vertrag zur Auftragsverarbeitung mit dem Anbieter. Lies dazu auch [Namen auf dem Blatt](/datenschutz/namen).
:::

## Welcher Weg passt?

| | Eigener Rechner | Anbieter in der EU |
| :--- | :--- | :--- |
| Daten verlassen das Gerät | nein | ja, verschlüsselt |
| Grafikkarte nötig | ja | nein |
| Einrichtung | Programm und Modell laden | Schlüssel eintragen |

Du kannst den Weg später jederzeit in den Einstellungen wechseln (Zahnrad oben rechts).
