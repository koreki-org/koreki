# Exportieren

Wenn du die Vorschläge geprüft hast, gibt es drei Wege, die Ergebnisse aus Koreki herauszuholen: eine **Liste für dich**, **Rückmeldungen für die Klasse** und **digitale Rückgabe-Zettel**. Alle Knöpfe stehen oben unter **Alle Arbeiten**.

::: info Einmal bestätigen
Vor dem ersten Export fragt Koreki: *„Bitte bestätige, dass du sie geprüft hast — die Verantwortung für die Noten liegt bei dir.“* Die Bestätigung gilt, bis du neu korrigieren lässt.
:::

In allen Exporten stehen wieder die **echten Namen** — Koreki ersetzt sie nur, solange die KI arbeitet.

## Einschätzungsliste {#einschaetzungsliste}

Eine **Excel-Datei für dich** mit einer Zeile je Schülerin und Schüler:

- Nachname und Vorname,
- erreichte Punkte insgesamt und in Prozent,
- Punkte je Hauptaufgabe,
- eine **Einschätzung** als Note.

Oben in der Datei steht, womit korrigiert wurde: Expertise, Erfahrungsschatz und KI-Modell, dazu das Datum.

::: warning Die Einschätzung ist kein Notenschlüssel
Die Note in der Liste ist rein rechnerisch und gleichmäßig verteilt: 100 % ergibt 1,0, 0 % ergibt 6,0, 50 % ergibt 3,5. Dein Notenschlüssel sieht vermutlich anders aus. Nimm die Prozente und Punkte aus der Liste und setze die Note nach dem Schlüssel deiner Schule.
:::

## Rückmeldungen für die Klasse {#feedback}

Unter **Einzel-Feedbacks** wählst du die Form:

| Auswahl | Was du bekommst |
| :--- | :--- |
| **Einzel-PDFs (ZIP)** | ein PDF je Schülerin oder Schüler, gepackt in eine ZIP-Datei — zum Drucken oder Verschicken |
| **Einzel-Excels (ZIP)** | dasselbe als Excel-Datei je Person |
| **Einzel-Feedback (Excel)** | alle Rückmeldungen untereinander in einer einzigen Excel-Datei |

Bei den PDFs legst du vorher fest, wie viel von der Bewertung zu sehen ist:

- **Keine Punkte** — nur der Text. Gut, wenn du die Punkte selbst eintragen oder erst besprechen willst.
- **Gesamtaufgabe** — Punkte je Hauptaufgabe.
- **Detailliert** — Punkte je Teilaufgabe mit Summenzeile.

Jede Rückmeldung trägt den Hinweis *„KI-generiert, von der Lehrkraft freigegeben.“* — so ist klar, wie sie entstanden ist und dass du sie geprüft hast.

## Digitale Slips {#slips}

**Digitale Slips** sind kleine Zettel zum Ausdrucken und Austeilen: Name, Punkte, ein QR-Code und ein vierstelliger PIN. Wer den Code mit dem Handy scannt und den PIN eingibt, sieht die ganze Rückmeldung zu jeder Aufgabe.

- Die Rückmeldung steckt **im QR-Code selbst**. Sie liegt auf keinem Server und wird beim Scannen nicht hochgeladen.
- Ist eine Rückmeldung sehr lang, passt sie nicht mehr in einen QR-Code. Der Zettel zeigt das an; nimm für diese Person das PDF.

::: warning Den Zettel wie die Arbeit behandeln
Der PIN hält Neugierige davon ab, beim Scannen sofort alles zu sehen. Er ist aber kein Schutz wie ein Passwort: Wer den QR-Code hat, kann die Rückmeldung mit etwas Technik auch ohne PIN auslesen. Gib jeden Zettel deshalb nur der Person, der er gehört — genau wie die korrigierte Arbeit.
:::

## Speichern und später weitermachen {#zwischenstand}

Koreki speichert deine Korrektur nicht von selbst — schließt du das Programm, ist sie weg. **Exportieren** gibt Ergebnisse an andere weiter (Liste, Rückmeldungen, Slips). **Speichern** sichert deine Korrektur, damit du später weitermachen kannst:

- **Korrektur speichern** unter **Alle Arbeiten** legt die Arbeiten mit allen Vorschlägen und deinen Änderungen als `.koreki`-Datei ab. Das geht jederzeit, auch vor dem Korrigieren — nur nicht, während gerade eine Bilderkennung oder Korrektur läuft.
- **Speichern** an der Musterlösung legt nur die Musterlösung ab — praktisch, wenn du dieselbe Arbeit in einer Parallelklasse schreibst.

PDFs und Fotos stecken nicht in der Datei, nur ihr erkannter Text. Brauchst du die Scans nach dem Öffnen wieder, lädst du sie über **Dateien verknüpfen** nach.

Über **Öffnen** in der Seitenleiste oder auf der Startseite lädst du eine `.koreki`-Datei wieder.

Klickst du auf **Neue Korrektur**, während noch eine Korrektur geladen ist, fragt Koreki wie Word beim Schließen nach:

- **Speichern …** sichert die Korrektur, genau wie **Korrektur speichern**, und beginnt dann neu.
- **Nicht speichern** verwirft die Korrektur und beginnt neu.
- **Abbrechen** lässt alles, wie es ist.

Läuft gerade eine Bilderkennung, Korrektur oder die Analyse der Musterlösung, fragt Koreki nicht, sondern bittet dich zu warten oder den Lauf abzubrechen. Dasselbe gilt für **Öffnen** und **Demo**.

Musterlösung und Arbeiten der laufenden Korrektur siehst du jederzeit unter **Einrichtung** in der Seitenleiste. Dort lädst du auch weitere Arbeiten nach.

::: warning Die Datei enthält Schülerarbeiten
Eine `.koreki`-Datei mit Korrektur enthält die Arbeiten und Bewertungen deiner Klasse. Bewahre sie so auf wie die Klassenarbeiten selbst — nicht in einem öffentlichen Ordner und nicht als Anhang an eine Problem-Meldung.
:::

## Weitere Knöpfe

- **Detaillierte Analyse** zeigt, wie die Klasse bei jeder Aufgabe abgeschnitten hat — nützlich, um zu sehen, welche Aufgabe vielen schwerfiel.
- **Protokoll** speichert eine Aufzeichnung der KI-Läufe dieser Korrektur. Die brauchst du normalerweise nicht; sie ist für Nachweise gedacht, etwa wenn deine Schule nachvollziehen muss, wie eine Bewertung entstanden ist.
