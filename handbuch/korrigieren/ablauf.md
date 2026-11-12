# Eine Korrektur Schritt für Schritt

Eine Korrektur hat fünf Schritte: Musterlösung laden, Arbeiten hinzufügen, Scans lesen lassen, korrigieren lassen, prüfen und exportieren. Arbeitest du nur mit digitalem Text, entfällt der dritte Schritt.

![Die Startansicht mit den Bereichen Musterlösung und Schülerarbeiten](/bilder/app-start.png){.app-bild}
<p class="bildtext">Links kommt die Musterlösung hin, rechts die Arbeiten deiner Klasse.</p>

## 1. Musterlösung laden {#musterloesung}

Klicke links auf **Musterlösung** und wähle deine Datei — Text (`.txt`), PDF oder Bild.

Koreki liest die Musterlösung und erkennt daraus die **Aufgabenstruktur**: welche Aufgaben es gibt und wie viele Punkte jede bringt. Prüfe diese Liste, bevor du weitermachst. Was hier fehlt, kann Koreki später nicht bewerten.

::: tip Eine gute Musterlösung
Koreki kann nur Punkte vergeben, die in der Musterlösung stehen. Schreib hinein, **wofür** es jeden Punkt gibt — nicht nur das Endergebnis. Nummeriere die Teilaufgaben so, wie sie auf dem Aufgabenblatt stehen.
:::

Gibt es etwas, das für alle Aufgaben gilt — ein Szenario, gemeinsame Annahmen —, trägst du es unter **Gemeinsamer Rahmen** ein. Gibt es so etwas nicht, bleibt das Feld leer.

## 2. Schülerarbeiten hinzufügen {#schuelerarbeiten}

Klicke rechts auf **Schülerarbeiten** und wähle die Arbeiten aus. Möglich sind PDF, Bilder, Text und Excel. Ein Export aus Moodle (Excel oder CSV) wird automatisch erkannt.

- **Eine Datei je Schülerin oder Schüler.** Mehrseitige Arbeiten am besten als ein PDF.
- **Du kannst jederzeit weitere Arbeiten hinzufügen** — sie kommen zu den vorhandenen dazu.
- **Scans:** gerade, gleichmäßig hell, ohne Schatten über der Schrift. Je besser der Scan, desto weniger musst du später nachlesen.

Bei einem PDF fragt Koreki, was darin steckt: **Digitaler Text / PDF** (am Rechner geschrieben) oder **Scan / Bilder / Handschrift**. Diese Wahl entscheidet, ob Koreki die Arbeit erst lesen muss. Hast du dich vertan, klickst du in der Liste auf das Abzeichen **Scan** oder **Digital** der Arbeit und stellst es um.

::: tip Alle Arbeiten in einem PDF?
Hast du die ganze Klasse in einem einzigen PDF gescannt, teilst du es mit der **Schere** an der Arbeit in einzelne Arbeiten auf: Du ordnest jeder Schülerin und jedem Schüler die passenden Seiten zu.
:::

Koreki ersetzt die Dateinamen durch Nummern wie „Schüler #1", bevor etwas an die KI geht. Namen, die **auf dem Blatt** stehen, erfasst das nicht — mehr dazu unter [Namen auf dem Blatt](/datenschutz/namen).

## 3. Scans lesen lassen (Bilderkennung) {#bilderkennung}

Ein Scan oder Foto ist für die KI zunächst nur ein Bild. Bevor Koreki korrigieren kann, macht die **Bilderkennung** daraus Text. Liegen Scans im Stapel, erscheint dafür neben **Korrigieren** der Knopf **Bilderkennung** — und Korrigieren geht erst, wenn alle Scans gelesen sind.

1. **Namen schwärzen, falls nötig** — vor der Bilderkennung. Wer danach schwärzt, verwirft den erkannten Text, und die Bilderkennung muss erneut laufen. Siehe [Namen auf dem Blatt](/datenschutz/namen).
2. Klicke auf **Bilderkennung**. Koreki fragt einmal nach und sagt dabei, wohin die Arbeiten gehen. Sind Blätter nicht geschwärzt, steht dort ein Hinweis mit dem Knopf **Jetzt schwärzen**. Danach liest Koreki alle Scans.
3. **Lies den erkannten Text gegen.** Öffne die Arbeiten und vergleiche mit dem Original. Ein falsch gelesenes Wort kannst du direkt im Text verbessern — die Korrektur arbeitet mit dem, was dort steht.

::: warning Handschrift genau ansehen
Bei schwer lesbarer Handschrift kann die KI ein Wort falsch lesen und dabei etwas Plausibles hinschreiben, das so nicht auf dem Blatt steht. Das fällt beim Überfliegen nicht auf. Skizzen, Pfeile und Randnotizen werden oft gar nicht erfasst — solche Teile bewertest du von Hand.
:::

## 4. Korrigieren lassen {#korrigieren}

![Die Stapelverarbeitung mit zwei Arbeiten, bereit zur Korrektur](/bilder/app-stapel.png){.app-bild}
<p class="bildtext">Alle angehakten Arbeiten werden mit „Korrigieren“ bearbeitet. Mit dem Pfeil rechts korrigierst du eine einzelne.</p>

Unter **Stapelverarbeitung** stehen alle Arbeiten. Klicke auf **Korrigieren**. Koreki liest jede Arbeit und macht für jede Aufgabe einen Vorschlag. Du kannst den Lauf jederzeit abbrechen.

## 5. Prüfen und exportieren {#exportieren}

Öffne jede Arbeit und sieh dir die Vorschläge an. Links steht, was Koreki aus der Arbeit gelesen hat, rechts der Vorschlag mit Punkten und Feedback. Punkte und Texte kannst du direkt ändern. Worauf du dabei achtest, steht unter [Vorschläge prüfen](/korrigieren/vorschlaege-pruefen).

Wenn alles stimmt, exportierst du:

- **Einschätzungsliste** — eine Übersicht aller Arbeiten für dich.
- **Einzel-Feedbacks** — eine Rückmeldung je Schülerin oder Schüler.
- **Digitale Slips** — Rückmeldezettel zum Weitergeben.

Vor dem ersten Export fragt Koreki einmal nach, ob du die Bewertungen geprüft hast. Im Export stehen wieder die echten Namen, damit du alles zuordnen kannst. Was in welcher Datei steht, erklärt [Exportieren](/korrigieren/exportieren).

::: tip Später weitermachen
Mit **Exportieren** an der Stapelverarbeitung sicherst du den Zwischenstand als `.koreki`-Datei. Über **Importieren** auf der Startseite lädst du ihn wieder.
:::
