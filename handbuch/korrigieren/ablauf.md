# Eine Korrektur Schritt für Schritt

Eine Korrektur hat fünf Schritte: Musterlösung laden, Arbeiten hinzufügen, Scans lesen lassen, korrigieren lassen, prüfen und exportieren. Arbeitest du nur mit digitalem Text, entfällt der dritte Schritt.

![Die Startansicht mit den Bereichen Musterlösung und Schülerarbeiten](/bilder/app-start.png){.app-bild}
<p class="bildtext">Links kommt die Musterlösung hin, rechts die Arbeiten deiner Klasse.</p>

## 1. Musterlösung laden {#musterloesung}

Klicke links auf **Musterlösung** und wähle deine Datei: PDF, Bild (JPG, PNG) oder Text (TXT, MD). Andere Formate wie Word lehnt Koreki mit einer Meldung ab — speichere sie vorher als PDF.

Koreki liest die Musterlösung und erkennt daraus die **Aufgabenstruktur**: welche Aufgaben es gibt und wie viele Punkte jede bringt. Prüfe diese Liste, bevor du weitermachst. Was hier fehlt, kann Koreki später nicht bewerten.

::: tip Eine gute Musterlösung
Koreki kann nur Punkte vergeben, die in der Musterlösung stehen. Schreib hinein, **wofür** es jeden Punkt gibt — nicht nur das Endergebnis. Nummeriere die Teilaufgaben so, wie sie auf dem Aufgabenblatt stehen.

Bei Rechenaufgaben bewährt sich diese Aufteilung:

> 1 P Formel, 1 P Einsetzen der gegebenen Werte, 1 P richtig gerechnet (auch mit falsch eingesetzten Werten)

Nur so kann der Skill **Folgefehler** richtig arbeiten. Wer einen gegebenen Wert falsch abschreibt und damit richtig weiterrechnet, verliert dann genau den Punkt fürs Einsetzen. Steht stattdessen nur „1 P Rechenweg, 1 P Ergebnis“ da, gibt es keinen Punkt, an dem der Fehler zählt, und die Arbeit bekommt womöglich volle Punktzahl.

Ob deine Musterlösung so aufgebaut ist, kannst du schon vorher mit deinem KI-Chat prüfen: [Klassenarbeit vorab prüfen](/korrigieren/klassenarbeit-pruefen).
:::

Gibt es etwas, das für alle Aufgaben gilt — ein Szenario, gemeinsame Annahmen —, trägst du es unter **Gemeinsamer Rahmen** ein. Gibt es so etwas nicht, bleibt das Feld leer.

## 2. Schülerarbeiten hinzufügen {#schuelerarbeiten}

Klicke rechts auf **Schülerarbeiten** und wähle die Arbeiten aus. Möglich sind PDF, Bilder (JPG, PNG), Text (TXT, MD), ein Export aus Moodle (XLSX oder CSV), den Koreki automatisch erkennt, und ein ZIP mit einem Ordner je Schülerin oder Schüler. Kann Koreki eine Datei nicht lesen, nennt es sie dir.

- **Eine Datei je Schülerin oder Schüler** — oder ein ZIP, siehe unten. Mehrseitige Arbeiten am besten als ein PDF.
- **Du kannst jederzeit weitere Arbeiten hinzufügen** — sie kommen zu den vorhandenen dazu.
- **Scans:** gerade, gleichmäßig hell, ohne Schatten über der Schrift. Je besser der Scan, desto weniger musst du später nachlesen.

Bei einem einzelnen PDF fragt Koreki, was darin steckt: **Digitaler Text / PDF** (am Rechner geschrieben) oder **Scan / Bilder / Handschrift**. Diese Wahl entscheidet, ob Koreki die Arbeit erst lesen muss. Hast du dich vertan, klickst du in der Liste auf das Abzeichen **Scan** oder **Digital** der Arbeit und stellst es um.

::: tip Mehrere Dateien je Schülerin oder Schüler (ZIP)
Gibt jede Person mehrere Dateien ab, etwa eine Prüfung mit einer Datei je Aufgabe, packst du alle Abgaben in ein ZIP: **ein Ordner je Schülerin oder Schüler**. Du kannst auch mehrere ZIPs auf einmal wählen, dann ist jedes ZIP eine Person. Koreki fügt die Dateien jeder Person zu **einer** Arbeit zusammen. Vor jeder Datei steht eine Seite mit ihrem Namen.

Vorher zeigt Koreki das Fenster **Abgaben prüfen**: je Person eine Zeile, aufgeklappt die Ordner und Dateien mit Haken.

- Angehakt ist, was nach eigener Abgabe aussieht: PDF, Bilder, Text und Quelltext, zum Beispiel Python, Java oder SQL. Quelltext übernimmt Koreki wörtlich, mit Einrückung.
- Abgewählt sind Dateien, die bei allen gleich sind, meist die bereitgestellten Vorlagen. Erkennen kann Koreki das erst ab zwei Personen im ZIP. Bei einer einzigen Person wählst du die Vorlagen selbst ab.
- Word, Excel und andere Formate kann Koreki nicht lesen. Sie stehen ausgegraut in der Liste.
- **Ein Ordner-Haken gilt für alle Personen.** Liegt im Abgabeordner zum Beispiel noch der Ordner einer anderen Prüfung, wählst du ihn einmal ab, nicht für jede Person einzeln. Ein Haken an einer Datei gilt nur für diese eine Person.
- Erst **Prüflinge übernehmen** legt die Arbeiten an. **Abbrechen** übernimmt aus dem ZIP nichts.
- Koreki fragt bei einem ZIP nicht, ob die Dateien digital oder gescannt sind. Es liest PDFs und Bilder immer als **Scan**, damit Tabellen, Screenshots und Fotos nicht verloren gehen. Das dauert etwas länger. Text und Quelltext übernimmt Koreki davon unberührt wörtlich.
:::

::: tip Alle Arbeiten in einem PDF?
Hast du die ganze Klasse in einem einzigen PDF gescannt, teilst du es mit der **Schere** an der Arbeit in einzelne Arbeiten auf. Am schnellsten geht es, wenn der Stapel in der Reihenfolge der Klassenliste liegt. Nötig ist das nicht.

Du blätterst den Stapel einmal durch, Seite für Seite in Lesegröße. Mit den Pfeiltasten geht es eine Seite weiter oder zurück.

- **Wo beginnt eine Arbeit?** Drück auf der ersten Seite einer Arbeit **Enter** oder klicke **Hier beginnt eine Arbeit**. Hat jede Arbeit gleich viele Seiten, trägst du die Zahl bei **Seiten je Arbeit** ein und klickst **Übernehmen**.
- **Eine Arbeit ist kürzer?** Geh auf die Seite, auf der die nächste Arbeit wirklich beginnt, und drück **Enter**. Alle folgenden Arbeiten rücken mit.
- **Eine Arbeit ist länger?** Drück auf dem falschen Anfang **Entf** (**Anfang entfernen**). Die Seite gehört dann zur vorigen Arbeit. Danach auf dem richtigen Anfang **Enter**.
- **Wem gehört sie?** Auf der ersten Seite jeder Arbeit steht rechts das Namensfeld. Trag den Namen ein, den du auf der Seite liest. **Enter** springt zur nächsten Arbeit, so tippst du die Klasse in einem Zug durch.
- **Klassenliste laden** liest eine Excel- oder CSV-Liste (Spalte A Nachname, Spalte B Vorname). Dann reichen die ersten Buchstaben. Namen, die schon vergeben sind, bietet Koreki nicht mehr an.
- Mit Klassenliste steht unter dem Namensfeld ein farbiger **Vorschlag**: der nächste Name in der Reihenfolge der Liste. **Enter** übernimmt ihn und springt zur nächsten Arbeit, egal wo der Cursor steht. Ein übernommener Name bekommt einen grünen Haken. Liegt dein Stapel wie die Liste, gehst du so mit Enter durch und siehst dabei jede erste Seite. Ein Vorschlag, den du nicht übernimmst, gilt nicht. Die Arbeit heißt dann „Schüler #…“.
- Hast du noch nichts geschnitten, schneidet die Klassenliste vor: Seiten geteilt durch Namen. Geht das nicht glatt auf, rundet Koreki und sagt es dir. Dann prüfst du beim Durchblättern die Anfänge.
- Die Leiste unten zeigt alle Seiten klein. Die Zahlen markieren, wo eine Arbeit beginnt. Ein Klick springt zur Seite.

Eine Arbeit ohne Namen heißt danach „Schüler #…“.
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

### Unsichere Stellen (?) {#unsichere-stellen}

Ist sich die Bilderkennung bei einem Wort nicht sicher, setzt sie **(?)** dahinter und hebt die Stelle farbig hervor. Die Aufgabe trägt dann den Hinweis **OCR prüfen!**. Sieh dir diese Wörter im Original an und verbessere sie, wo nötig. Die Markierung löschst du einfach mit.

Oft ist ein markiertes Wort trotzdem richtig gelesen. Dann musst du nicht jede Markierung einzeln löschen:

- Neben **OCR prüfen!** steht an jeder Aufgabe der Knopf **… (?) entfernen**. Er entfernt die Markierungen dieser einen Aufgabe sofort, ohne Rückfrage.
- Über dem erkannten Text steht der Knopf **Alle … (?) entfernen**, mit der Zahl der Markierungen in der ganzen Arbeit. Er entfernt nach einer Rückfrage alle auf einmal.

Die Wörter davor bleiben stehen, ebenso andere Kennzeichen wie [GESTRICHEN]. Rückgängig machen lässt sich das nicht.

Entferne die Markierungen erst, wenn du die Stellen angesehen hast. Bleibt eine stehen, ist der Vorschlag zu dieser Aufgabe in der Regel als **„Bitte prüfen“** gekennzeichnet. Nach dem Entfernen gibt es diesen Hinweis nicht mehr.

## 4. Korrigieren lassen {#korrigieren}

![Alle Arbeiten mit zwei Arbeiten, bereit zur Korrektur](/bilder/app-stapel.png){.app-bild}
<p class="bildtext">Alle angehakten Arbeiten werden mit „Korrigieren“ bearbeitet. Mit dem Dreieck korrigierst du eine einzelne, der Pfeil am Zeilenende öffnet sie.</p>

Unter **Alle Arbeiten** stehen deine Arbeiten. Klicke auf **Korrigieren**. Koreki liest jede Arbeit und macht für jede Aufgabe einen Vorschlag. Du kannst den Lauf jederzeit abbrechen.

Solange Bilderkennung oder Korrektur laufen, lassen sich Arbeiten weder löschen noch mit der **Schere** aufteilen. Beides verschiebt die Liste, und ein Ergebnis könnte sonst bei der falschen Arbeit landen. Musst du vorher etwas ändern, brich den Lauf ab.

## 5. Prüfen und exportieren {#exportieren}

Öffne jede Arbeit und sieh dir die Vorschläge an. Links steht, was Koreki aus der Arbeit gelesen hat, rechts der Vorschlag mit Punkten und Feedback. Punkte und Texte kannst du direkt ändern. Worauf du dabei achtest, steht unter [Vorschläge prüfen](/korrigieren/vorschlaege-pruefen).

Wenn alles stimmt, exportierst du:

- **Einschätzungsliste** — eine Übersicht aller Arbeiten für dich.
- **Einzel-Feedbacks** — eine Rückmeldung je Schülerin oder Schüler.
- **Digitale Slips** — Rückmeldezettel zum Weitergeben.

Vor dem ersten Export fragt Koreki einmal nach, ob du die Bewertungen geprüft hast. Im Export stehen wieder die echten Namen, damit du alles zuordnen kannst. Was in welcher Datei steht, erklärt [Exportieren](/korrigieren/exportieren).

::: tip Später weitermachen
Mit **Korrektur speichern** unter **Alle Arbeiten** sicherst du den Zwischenstand als `.koreki`-Datei. Über **Öffnen** lädst du ihn wieder. Bevor **Neue Korrektur** etwas verwirft, fragt Koreki, ob du speichern willst. Mehr dazu unter [Speichern und später weitermachen](/korrigieren/exportieren#zwischenstand).
:::
