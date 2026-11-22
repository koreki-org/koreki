# Klassenarbeit vorab prüfen

Bevor du eine Klassenarbeit schreiben lässt, kannst du sie mit deinem KI-Chat darauf prüfen, ob Koreki sie gut korrigieren kann. Dafür gibt es den **Koreki-Check**, einen sogenannten Skill. Du lädst ihn einmal in Claude, Gemini oder ChatGPT, danach schickst du deine Arbeit samt Musterlösung hin und bekommst eine Liste mit Verbesserungen.

Der Check läuft in deinem eigenen Konto bei diesem Anbieter. Koreki ist daran nicht beteiligt.

## Was der Check prüft {#was}

- **Aufbau und Punkte:** Hat jede Teilaufgabe eine eigene, feste Punktzahl? Stimmt die Summe?
- **Rahmen und Stamm:** Steht, was mehrere Teilaufgaben brauchen, vor der ersten Teilaufgabe? Zeigt jeder Verweis wie „siehe Tabelle“ auf etwas, das da ist?
- **Erwartungshorizont:** Steht bei jeder Teilaufgabe, wofür es jeden Punkt gibt? Legen Textaufgaben mit mehreren Punkten fest, was eine teilweise richtige Antwort bekommt? Passt der Operator zum Erwartungshorizont? Sind Rechenaufgaben so aufgeteilt, dass Folgefehler fair gewertet werden (siehe [Eine gute Musterlösung](/korrigieren/ablauf#musterloesung))?
- **Rechenaufgaben:** Steht der vollständige Rechenweg da? Ist geregelt, wie gerundet wird und was ein Einheitenfehler kostet?
- **Aufgabenformate:** Lassen sich die Antworten gut lesen? Der Check schlägt zum Beispiel vor, Beschriftungen in Abbildungen zu nummerieren und auf dem Antwortblatt beantworten zu lassen, statt direkt in die Zeichnung zu schreiben.
- **Antwortblatt:** Antworten auf eigenen Blättern statt auf dem Aufgabenblatt, Aufgabennummer vor jeder Antwort, dunkler Stift, Name nur oben.

Am Ende zeigt die KI, wie Koreki deine Aufgaben lesen würde, und sortiert die Vorschläge nach **Muss**, **Sollte** und **Kann**. Wo du entscheiden musst, etwa ob ein Operator oder der Erwartungshorizont angepasst wird, fragt sie nach.

Danach kann die KI die Änderungen einarbeiten:

- **Mit deiner Word-Datei:** Die Änderungen kommen als Überarbeitungen in deine Datei. Du siehst jede Änderung in Word und nimmst sie einzeln an oder lehnst sie ab. Logo, Bilder und Layout bleiben erhalten. Auf Wunsch gibt es zusätzlich eine PDF. Kann ein Dienst keine Überarbeitungen schreiben, bekommst du eine Fassung mit markierten Änderungen.
- **Nur mit einer PDF:** Die Arbeit wird als neue Word-Datei nachgebaut, die Änderungen sind markiert. Logo, Bilder und Layout fügst du dann selbst wieder ein.
- **Für Koreki:** die überarbeitete Musterlösung als Markdown-Datei (`.md`), die du in Koreki unter **Musterlösung** lädst. Überschriften, Punkte, Formeln und Tabellen bleiben darin erhalten.

## Den Skill einrichten {#einrichten}

Lade zuerst den Skill herunter: [koreki-klassenarbeit-check.zip](/downloads/koreki-klassenarbeit-check.zip){target="_self" download}. Das ZIP nicht entpacken. Was darin steht, kannst du vorher lesen: [SKILL.md ansehen](/downloads/koreki-klassenarbeit-check/SKILL.md){target="_blank"}.

Der Skill nutzt ein offenes Format, das Claude, Gemini und ChatGPT lesen. Die Menüs heißen bei jedem Anbieter anders, und sie ändern sich gelegentlich. Die Schritte unten folgen den Hilfeseiten der Anbieter (Stand November 2026).

### Claude {#claude}

1. Öffne in Claude **Customize** → **Skills**.
2. Klicke auf **+**, dann **Create skill** und **Upload a skill**, und wähle das ZIP.
3. Schalte den Skill in der Liste ein.

Claude braucht dafür die Einstellung **Code execution and file creation** (je nach Ansicht **Create and edit files**) unter **Settings** → **Capabilities**. Skills gibt es laut Anthropic in allen Tarifen, auch im kostenlosen. In Schul- und Firmenkonten kann die Verwaltung eigene Skills abgeschaltet haben.

### Gemini {#gemini}

1. Klicke in der Gemini-App links in der Seitenleiste auf **Customize**, dann oben auf **Skills**.
2. Klicke auf **Create** und wähle **Upload**.
3. Wähle das ZIP.

Skills gibt es laut Google in der Gemini-App im Browser, auf dem Mac und in den Mobil-Apps, ab 18 Jahren. In Schul- und Firmenkonten hängt es von der Ausgabe ab, die deine Schule gebucht hat. Skills ersetzen in Gemini seit Herbst 2026 die bisherigen Gems.

### ChatGPT {#chatgpt}

ChatGPT kennt Skills im selben Format, in der Desktop-App findest du sie in der Seitenleiste unter **Skills**. Wie du einen eigenen Skill hochlädst und in welchen Tarifen das geht, beschreibt OpenAI bisher nicht eindeutig. Probiere es in deinem Konto aus. Klappt es nicht, nutze Claude oder Gemini.

## Den Check benutzen {#benutzen}

Öffne einen neuen Chat, hänge Aufgabenblatt und Musterlösung an (PDF oder Word) und schreib zum Beispiel:

> Prüfe meine Klassenarbeit mit dem Koreki-Check.

::: warning Nur Aufgaben und Musterlösung
Schick keine Schülerarbeiten und keine Namen an die KI. Der Check braucht sie nicht, und für Schülerdaten gelten die Regeln deiner Schule. Der Skill weist die KI an, bei Schülerantworten abzubrechen und dich zu bitten, sie zu entfernen. Verlass dich nicht darauf, sondern schick sie gar nicht erst mit.
:::

## Grenzen {#grenzen}

- Der Check ist eine Hilfe beim Vorbereiten, keine Garantie. Auch eine KI kann sich irren — lies die Vorschläge kritisch.
- Wie gründlich der Check arbeitet und welche Dateien die KI erzeugen kann, hängt vom Anbieter und deinem Tarif ab.
- Er sagt nichts darüber, wie gut die Aufgaben fachlich sind oder wie die Arbeit ausfallen wird.
- Ob Koreki eine Arbeit gut korrigiert, zeigt sich erst bei der Korrektur. Prüfe die Aufgabenstruktur nach dem Laden der Musterlösung trotzdem, wie unter [Musterlösung laden](/korrigieren/ablauf#musterloesung) beschrieben.
