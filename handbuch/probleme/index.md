# Probleme lösen

Hier stehen die Stolpersteine, die am häufigsten vorkommen — jeweils mit der Meldung, die du siehst, und was du tun kannst.

## Installation {#installation}

### Windows warnt beim Start des Installers

Windows zeigt bei neuen Programmen oft „Der Computer wurde durch Windows geschützt“. Das liegt daran, dass Koreki noch selten heruntergeladen wird, nicht an einem Fehler in der Datei.

**Was tun:** Klicke auf **Weitere Informationen** und dann auf **Trotzdem ausführen**. Lade den Installer nur von der [offiziellen Download-Seite](https://github.com/koreki-org/koreki/releases).

## KI-Verbindung {#ki-verbindung}

### „Ollama konnte nicht erreicht werden. Läuft die App?“

Koreki findet Ollama nicht auf deinem Rechner.

1. Prüfe, ob Ollama läuft. Unter Windows siehst du das Lama-Symbol unten rechts in der Taskleiste. Fehlt es, starte Ollama aus dem Startmenü.
2. Prüfe in den Einstellungen von Koreki die **Ollama Adresse**. Läuft Ollama auf demselben Rechner, lautet sie `http://127.0.0.1:11434`.
3. Läuft Ollama auf einem anderen Rechner, etwa dem Schulserver, muss dieser im Netz erreichbar sein. Das richtet die Person ein, die den Server betreut.

### „Das gewählte Modell ist nicht installiert“

Koreki erreicht Ollama, aber das Modell fehlt dort. Lade es nach — in Ollama oder in einem Terminal:

```bash
ollama pull qwen3.8:27b-mtp-q4_K_M
```

Das Modell ist mehrere Gigabyte groß; der Download dauert eine Weile.

### „Der KI-Anbieter hat den Zugang abgelehnt“

Bei Mittwald oder Mistral: Der Schlüssel ist ungültig, abgelaufen oder das Guthaben beim Anbieter ist aufgebraucht. Erstelle beim Anbieter einen neuen Schlüssel und trage ihn in den Einstellungen ein.

### „Der KI-Anbieter ist derzeit nicht erreichbar“

Der Anbieter ist kurz überlastet oder deine Internetverbindung ist weg. Warte einen Moment und versuche es erneut.

### Hinweis: „Diese Kombination ist nicht gegen den Referenzsatz gemessen“

Koreki ist mit **Qwen 3.6** und **Qwen 3.8** über Ollama ausführlich geprüft. Nutzt du ein anderes Modell oder einen anderen Weg, funktioniert die Korrektur trotzdem — der Hinweis sagt nur, dass für diese Kombination keine Messung vorliegt. Prüfe die Vorschläge dann besonders sorgfältig.

### Die Korrektur ist sehr langsam

Mit einer KI auf dem eigenen Rechner hängt das Tempo fast nur an der Grafikkarte. Ohne leistungsfähige Grafikkarte rechnet der Prozessor, und eine Arbeit kann sehr lange dauern. Abhilfe: ein Rechner mit passender Grafikkarte, ein Schulserver — oder ein Anbieter in der EU, siehe [KI verbinden](/erste-schritte/ki-verbinden).

## Korrektur {#korrektur}

### „Korrigieren“ lässt sich nicht anklicken

Meist liegt einer dieser Fälle vor:

- **Scans sind noch nicht gelesen.** Klicke zuerst auf **Bilderkennung**, siehe [Scans lesen lassen](/korrigieren/ablauf#bilderkennung).
- **Bei einer Arbeit steht „Typ wählen“.** Koreki weiß nicht, ob es ein Scan oder digitaler Text ist. Klicke auf das Abzeichen und wähle.
- **Keine Arbeit ist angehakt** oder alle sind schon korrigiert — dann steht auf dem Knopf „Alle korrigiert“.

### Koreki hat etwas falsch gelesen

Verbessere den Text direkt in der Arbeit: In der Prüfansicht steht links die **Erkannte Schülerlösung** mit einem Stift zum Bearbeiten. Lass die Arbeit danach neu korrigieren. Fehlt viel, lohnt ein neuer Scan: gerade, hell, mindestens 300 dpi.

### Eine Aufgabe fehlt im Vorschlag

1. Sieh in der **Musterlösung** nach, ob die Aufgabe in der Aufgabenstruktur steht. Fehlt sie dort, ergänze sie — Koreki bewertet nur, was dort steht.
2. Hast du die Musterlösung nachträglich geändert, gleiche die Arbeiten mit **Aufgaben-Sync** an.
3. Korrigiere die betroffene Arbeit einzeln neu — mit dem Symbol rechts an der Arbeit.

### „Die KI hat eine leere Antwort zurückgegeben“ oder „… hat die Antwort abgebrochen“

Das Modell hat unterwegs aufgehört — oft, weil der Rechner an seiner Grenze ist oder der KI-Server neu gestartet wurde. Korrigiere die Arbeit einzeln erneut. Passiert es immer wieder, schließe andere Programme oder starte Ollama neu.

### Die Punkte passen grundsätzlich nicht

Ist Koreki durchweg zu streng, zu großzügig oder gewichtet falsch, liegt das selten an einer einzelnen Arbeit. Das stellst du unter [Bewertung anpassen](/bewertung/) ein — und gleichst einzelne Ausreißer in der Prüfansicht von Hand aus.

## Problem melden {#melden}

Hilft nichts davon, melde das Problem: in Koreki über das **?** oben rechts und **Problem melden**. Es öffnet sich eine Seite auf GitHub.

Hilfreich sind:

- die **Version** — sie steht im selben Menü ganz unten,
- welche KI du nutzt (Ollama mit welchem Modell, Mittwald oder Mistral),
- was du getan hast und welche Meldung erschien, gern mit Bildschirmfoto.

::: danger Keine Schülerarbeiten anhängen
Eine Meldung auf GitHub ist öffentlich. Hänge nie eine echte Schülerarbeit, einen Namen oder ein Bildschirmfoto mit Schülerdaten an. Nutze zur Not die **Demo**, um den Fehler zu zeigen.
:::
