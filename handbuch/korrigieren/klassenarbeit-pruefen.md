# Klassenarbeit vorab prüfen

Bevor du eine Klassenarbeit schreiben lässt, kannst du sie mit Claude darauf prüfen, ob Koreki sie gut korrigieren kann. Dafür gibt es den **Koreki-Check**, einen Skill für Claude. Du lädst ihn einmal in Claude, danach schickst du deine Arbeit samt Musterlösung hin und bekommst eine Liste mit Verbesserungen.

Der Check läuft in deinem eigenen Claude-Konto. Koreki ist daran nicht beteiligt.

## Was der Check prüft {#was}

- **Aufbau und Punkte:** Hat jede Teilaufgabe eine eigene, feste Punktzahl? Stimmt die Summe?
- **Rahmen und Stamm:** Steht, was mehrere Teilaufgaben brauchen, vor der ersten Teilaufgabe? Zeigt jeder Verweis wie „siehe Tabelle“ auf etwas, das da ist?
- **Erwartungshorizont:** Steht bei jeder Teilaufgabe, wofür es jeden Punkt gibt? Legen Textaufgaben mit mehreren Punkten fest, was eine teilweise richtige Antwort bekommt? Sind Rechenaufgaben so aufgeteilt, dass Folgefehler fair gewertet werden (siehe [Eine gute Musterlösung](/korrigieren/ablauf#musterloesung))?
- **Rechenaufgaben:** Steht der vollständige Rechenweg da? Ist geregelt, wie gerundet wird und was ein Einheitenfehler kostet?
- **Aufgabenformate:** Lassen sich die Antworten gut lesen? Der Check schlägt zum Beispiel vor, Beschriftungen in Abbildungen zu nummerieren und auf dem Antwortblatt beantworten zu lassen, statt direkt in die Zeichnung zu schreiben.
- **Antwortblatt:** Antworten auf eigenen Blättern statt auf dem Aufgabenblatt, Aufgabennummer vor jeder Antwort, dunkler Stift, Name nur oben.

Am Ende zeigt Claude, wie Koreki deine Aufgaben lesen würde, und sortiert die Vorschläge nach **Muss**, **Sollte** und **Kann**. Wo du entscheiden musst, etwa ob ein Operator oder der Erwartungshorizont angepasst wird, fragt Claude nach.

Danach kann Claude die Änderungen einarbeiten:

- **Mit deiner Word-Datei:** Claude trägt die Änderungen als Überarbeitungen ein. Du siehst jede Änderung in Word und nimmst sie einzeln an oder lehnst sie ab. Logo, Bilder und Layout bleiben erhalten. Auf Wunsch gibt es zusätzlich eine PDF.
- **Nur mit einer PDF:** Claude baut die Arbeit als neue Word-Datei nach und markiert die Änderungen. Logo, Bilder und Layout fügst du dann selbst wieder ein.
- **Für Koreki:** die überarbeitete Musterlösung als Markdown-Datei (`.md`), die du in Koreki unter **Musterlösung** lädst. Überschriften, Punkte, Formeln und Tabellen bleiben darin erhalten.

## Den Skill in Claude einrichten {#claude}

1. Lade den Skill herunter: [koreki-klassenarbeit-check.zip](/downloads/koreki-klassenarbeit-check.zip){target="_self" download}. Das ZIP nicht entpacken.
2. Öffne in Claude **Customize** → **Skills**.
3. Klicke auf **+**, dann **Create skill** und **Upload a skill**, und wähle das ZIP.
4. Schalte den Skill in der Liste ein.

Claude braucht dafür die Einstellung **Code execution and file creation** (je nach Ansicht **Create and edit files**) unter **Settings** → **Capabilities**. Skills gibt es laut Anthropic in allen Tarifen, auch im kostenlosen. In Schul- und Firmenkonten kann die Verwaltung eigene Skills abgeschaltet haben.

Was im Skill steht, kannst du vorher lesen: [SKILL.md ansehen](/downloads/koreki-klassenarbeit-check/SKILL.md){target="_blank"}.

## Den Check benutzen {#benutzen}

Öffne einen neuen Chat, hänge Aufgabenblatt und Musterlösung an (PDF oder Word) und schreib zum Beispiel:

> Prüfe meine Klassenarbeit mit dem Koreki-Check.

::: warning Nur Aufgaben und Musterlösung
Schick keine Schülerarbeiten und keine Namen an Claude. Der Check braucht sie nicht, und für Schülerdaten gelten die Regeln deiner Schule. Der Skill weist Claude an, bei Schülerantworten abzubrechen und dich zu bitten, sie zu entfernen. Verlass dich nicht darauf, sondern schick sie gar nicht erst mit.
:::

## Grenzen {#grenzen}

- Der Check ist eine Hilfe beim Vorbereiten, keine Garantie. Auch Claude kann sich irren — lies die Vorschläge kritisch.
- Er sagt nichts darüber, wie gut die Aufgaben fachlich sind oder wie die Arbeit ausfallen wird.
- Ob Koreki eine Arbeit gut korrigiert, zeigt sich erst bei der Korrektur. Prüfe die Aufgabenstruktur nach dem Laden der Musterlösung trotzdem, wie unter [Musterlösung laden](/korrigieren/ablauf#musterloesung) beschrieben.
