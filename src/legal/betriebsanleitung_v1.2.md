# Betriebsanleitung und Nutzungshinweise
für das KI-System **Koreki**

> Dieses Dokument beschreibt Zweck, Grenzen und Aufsichtspflichten des Systems.
> Koreki stellt es bereit, weil Nutzerinnen und Nutzer diese Angaben brauchen,
> um das System verantwortlich einzusetzen — unabhängig davon, wie das System
> aufsichtsrechtlich eingeordnet wird.

## 1. Anbieter und Kontakt
*   **Anbieter:** [FIRMIERUNG BITTE HIER EINTRAGEN]
*   **Anschrift:** [ADRESSE BITTE HIER EINTRAGEN]
*   **Kontakt für Rückfragen, Störungen und Hinweise auf Fehlbewertungen:** [KONTAKT BITTE HIER EINTRAGEN]

Betreiben Sie Koreki selbst, tragen Sie Ihre eigenen Angaben über die Umgebungsvariablen `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS` und `NEXT_PUBLIC_LEGAL_EMAIL` ein. Ohne diese Angaben zeigt Ihre Instanz Platzhalter; für einen Produktivbetrieb reicht das nicht.

## 2. Wer welche Rolle hat
Die KI-Verordnung kennt zwei Rollen mit sehr unterschiedlichen Pflichten. Welche Sie haben, hängt nicht davon ab, wer den Server bezahlt.

*   **Anbieter** ist, wer das System entwickelt und **unter eigenem Namen** bereitstellt.
*   **Betreiber** ist, wer es **unter eigener Verantwortung einsetzt**.

| Ihre Nutzung | Anbieter | Betreiber |
|---|---|---|
| Gehostet über koreki.org | Koreki | Ihre Schule |
| Community Edition, selbst gehostet, unverändert | Koreki | Ihre Schule |
| Desktop-Anwendung auf dem eigenen Rechner | Koreki | Sie bzw. Ihre Schule |
| Koreki unter eigenem Namen oder eigener Marke ausgebracht | **Sie** | Sie |

**Wichtig für Selbstbetreiber:** Dass Sie Koreki auf Ihrem eigenen Server betreiben, macht Sie **nicht** zum Anbieter. Die Rolle geht nur über, wenn Sie das System mit Ihrem Namen oder Ihrer Marke versehen, es wesentlich verändern oder seine Zweckbestimmung ändern.

**Keine Rollenübernahme sind:** ein anderes Modell in den Einstellungen wählen, eigene Bewertungsprofile oder einen Erfahrungsschatz anlegen, eine eigene Musterlösung hinterlegen. Beachten Sie aber: Angaben zur Genauigkeit gelten nur für die geprüften Modellkonfigurationen.

## 3. Zweckbestimmung
Koreki ist ein KI-gestütztes Assistenzsystem zur Unterstützung von Lehrkräften bei der Korrektur von schriftlichen Leistungsnachweisen (Klassenarbeiten, Tests).
*   **Zweck:** Analyse von Schülerantworten gegen eine Musterlösung, Punktvorschläge und Feedback-Entwürfe.
*   **Nicht-Zweck:** Koreki darf **nicht** zur Erstellung von psychologischen Profilen, zur Verhaltensvorhersage oder zur automatisierten, alleinigen Entscheidung über Noten ohne menschliche Kontrolle verwendet werden.
*   **Keine Profilbildung:** Das System speichert keine Profile über einzelne Schülerinnen und Schüler, schreibt keine Bewertungen über mehrere Arbeiten hinweg fort und trifft keine Aussagen über künftige Leistung, Eignung oder Verhalten. Jeder Durchlauf bewertet genau ein Dokument gegen die vorgegebenen Kriterien.

## 4. Genauigkeit & Fehlerquellen
Trotz hoher technologischer Standards kann die KI fehlerhafte Ergebnisse liefern. Bekannte Fehlerquellen sind:
*   **Handschrift:** Sehr unleserliche oder ungewöhnliche Handschriften können zu Fehlinterpretationen führen.
*   **Ironie & Nuancen:** Subtile sprachliche Mittel wie Ironie, Sarkasmus oder extrem spezifische Dialekte werden unter Umständen nicht korrekt erfasst.
*   **Kontext:** Die KI bewertet semantisch. Bei fachspezifischen Abkürzungen, die nicht in der Musterlösung definiert sind, kann es zu Punktabzug kommen.

### 4.1 Was gemessen wurde
Seit dem 02.09.2026 liegt eine erste Messung vor. Zwölf Referenzaufgaben aus zwölf Fächern — von Deutsch über Mathematik und Chemie bis Pflege und Kaufmännisches — wurden mit einer festgelegten Sollpunktzahl versehen und von einer Lehrkraft durchgesehen. Gemessen wurde, wie weit der Punktvorschlag davon abweicht.

| Kennzahl | Wert |
|---|---|
| Mittlere Abweichung | **0,17 Punkte je Aufgabe** (4,2 % der erreichbaren Punkte) |
| Aufgaben ohne jede Abweichung | 10 von 12 |
| Wiederholter Lauf, gleiche Sitzung | dreimal dieselbe Punktzahl, in allen zwölf Fällen |
| Wiederholter Lauf, andere Sitzung | in zwei bis drei von zwölf Fällen 1 bis 2 Punkte Unterschied |

In beiden abweichenden Fällen bewertete Koreki **strenger** als die Referenz, nicht großzügiger.

**Zur Wiederholbarkeit.** Koreki sendet an alle KI-Anbieter einen festen Startwert, damit derselbe Stapel beim zweiten Durchlauf dieselben Zahlen ergibt und nicht neue. Das wirkt zuverlässig, solange Sie innerhalb einer Sitzung arbeiten. Über längere Zeiträume hinweg — etwa wenn der Modellserver zwischendurch neu geladen hat — können einzelne Punktzahlen dennoch um ein bis zwei Punkte abweichen. Verlassen Sie sich daher nicht darauf, eine einmal erzeugte Bewertung Wochen später zeichengenau reproduzieren zu können; **speichern oder exportieren Sie das Protokoll**, wenn Sie eine Bewertung später belegen müssen.

### 4.2 Wofür diese Zahl gilt — und wofür nicht
Bitte lesen Sie die Zahl mit ihren Grenzen:
*   Sie gilt **ausschließlich** für die Konfiguration `qwen3.6:35b` über lokales Ollama (Temperatur 0.2, Standardprofil „MINT Standard"). **Jedes andere Modell — auch Mistral — ist ungeprüft.** Da Sie das Modell selbst wählen, kann Ihre Konfiguration abweichen.
*   Als auffällig gilt eine Abweichung von mehr als **10 %** im Mittel oder mehr als **25 %** in einem einzelnen Fall. Diese Grenzen hat der Anbieter vorab festgelegt; die oben genannte Messung hält beide ein.
*   Zwölf Aufgaben sind eine erste Messung, kein Nachweis über alle Fächer. Der Prüfsatz enthält gezielt schwierige Grenzfälle und entspricht nicht einer durchschnittlichen Klassenarbeit.
*   Die Eingabe war durchweg **getippter** Text. Fehler der Handschrifterkennung sind darin **nicht** enthalten und kommen hinzu.
*   Gemessen wurde die Übereinstimmung mit einer Referenzbewertung — nicht, ob eine Note richtig ist.

### 4.3 Rechenaufgaben mit hinterlegter Rechenkette
Für Rechenaufgaben können Sie in der Musterlösung ein Rechenziel hinterlegen; Koreki rechnet den Weg dann selbst nach.

**Folgefehler werden dabei nicht doppelt bestraft.** Wer sich in Teilaufgabe a) verrechnet und in b) mit seinem eigenen falschen Wert korrekt weiterrechnet, erhält den Ergebnispunkt für b). Der Abzug bleibt dort, wo der Fehler entstanden ist. Ein in der **Aufgabe gegebener** Wert muss dagegen richtig eingesetzt werden — ein Fehler dort ist ein eigener Fehler und kostet Punkte.

**Was Sie trotzdem beachten sollten:** In der Messung lag die Abweichung bei den sechs Rechenaufgaben **mit** hinterlegtem Rechenziel bei 0,50 Punkten, **ohne** bei 0,17 Punkten. Die Rechenkette liegt also weiterhin etwas höher; woran das liegt, ist nicht abschließend geklärt. Prüfen Sie mehrschrittige Rechenaufgaben deshalb weiterhin aufmerksam.

### 4.4 Was das für Ihre Arbeit heißt
Ein Punktvorschlag bleibt ein Entwurf. Die Zahl oben beschreibt, wie nah die Vorschläge im Mittel lagen — sie sagt nichts über den einzelnen Fall vor Ihnen. Die Prüfpflicht aus Abschnitt 5 wird durch sie nicht kleiner.

## 5. Menschliche Aufsicht (Human-in-the-Loop)
**WICHTIGER HINWEIS:** Koreki ist ein Assistenzsystem, kein Ersatz für die pädagogische Fachkraft.
*   Jeder Bewertungsvorschlag der KI **muss** durch die Lehrkraft geprüft und ggf. korrigiert werden.
*   Die KI kann "halluzinieren" (Inhalte erfinden oder Fakten falsch verknüpfen). Die Letztverantwortung für die Note liegt ausschließlich bei der Lehrkraft.
*   Jede Einschätzung trägt einen Vertrauenswert. Bei niedrigem Wert markiert Koreki die Aufgabe zur Prüfung, statt die Unsicherheit zu verbergen.
*   Vor jedem Export bestätigen Sie einmal je Stapel ausdrücklich, dass Sie die Bewertungen geprüft haben. Die Bestätigung wird protokolliert; ein neuer Korrekturlauf setzt sie zurück.
*   Eine Note entsteht ausschließlich durch die Freigabe der Lehrkraft. Einen automatisierten Pfad zur Notenvergabe gibt es nicht.

Die Software erzwingt die Durchsicht nicht und gibt auch nicht vor, es zu tun. Die Bestätigung ist Ihre Erklärung, kein Nachweis, dass jede Arbeit geöffnet wurde.

## 6. Kennzeichnung KI-erzeugter Inhalte
Feedbacktexte und Punktvorschläge werden maschinell erzeugt. Diese Herkunft bleibt auf allen Ausgabewegen erkennbar:
*   **Exportierte Dateien** tragen sie maschinenlesbar in den Dateieigenschaften (PDF-Schlüsselwörter, Excel-Kategorie) und lesbar in der Fußzeile.
*   **Der digitale Rückmeldezettel** trägt sie als Angabe im Seitenkopf und als Zeile unter dem Feedback.

**Grenze:** Die Kennzeichnung hängt an der Datei beziehungsweise an der Seite, nicht am Text selbst. Wer einen Feedbacksatz herauskopiert, nimmt sie nicht mit.

## 7. Technische Grenzen
*   **Dateien:** Unterstützt werden PDF, JPG, PNG, TXT, XLSX und CSV bis maximal 50 MB pro Datei.
*   **Sprachen:** Belastbare Aussagen zur Qualität in einzelnen Unterrichtssprachen liegen nicht vor. Die frühere Angabe „optimiert für Deutsch, Englisch und Französisch" ließ sich nicht belegen und ist entfallen.
*   **Zeichenlimit:** 10.000 Zeichen je Seite, höchstens 100.000 Zeichen je Anfrage.

## 8. Risikovermeidung & Antidiskriminierung
Das System wird stichprobenartig auf sprachbedingte Ungleichbehandlung geprüft. Im Test vom 23.08.2026 wurde dieselbe fachliche Leistung in Standardsprache, in einfacher Umgangssprache und in nicht-muttersprachlicher Formulierung identisch bewertet (je 4 von 4 Punkten, keine Abweichung). Eine systematische Prüfung über mehrere Fächer, Aufgabentypen und Modelle hinweg steht aus. Lehrkräfte sollten darauf achten, dass die KI keine diskriminierenden Muster (z.B. aufgrund von Ausdrucksweise oder Herkunft) reproduziert. Bei Verdacht auf systematische Fehlbehandlung ist der Support zu informieren.

**Zur Pseudonymisierung, klar gesagt:** Koreki ersetzt den **Dateinamen** automatisch durch eine Bezeichnung wie „Schüler #1". Das geschieht ohne Ihr Zutun.

**Namen auf dem Blatt** erfasst diese automatische Ersetzung nicht. Dafür gibt es die **Schwärzung**: Markieren Sie die Stelle, und Koreki verwendet für die Texterkennung ausschließlich den geschwärzten Abzug — der Name gelangt dann nicht an das Sprachmodell. Fehlt zu einer als geschwärzt geführten Arbeit auch nur eine geschwärzte Seite, bricht der Vorgang mit einer Fehlermeldung ab, statt heimlich das Original zu verwenden.

Die Schwärzung ist allerdings **freiwillig und je Datei von Hand anzuwenden**. Wer sie nicht nutzt, überträgt einen auf dem Blatt stehenden Namen mit. Bei Verdacht auf einen Klarnamen im erkannten Text zeigt Koreki einen Hinweis, hält den Vorgang aber nicht an.

**Empfehlung:** Schwärzen Sie Namen vor dem Hochladen, oder lassen Sie die Arbeiten von vornherein mit Nummern statt Namen schreiben.

**Nachteilsausgleich:** Ein gewährter Nachteilsausgleich — etwa bei Legasthenie — ist dem System nicht bekannt und wird von ihm nicht berücksichtigt. Sie müssen ihn bei der Durchsicht selbst einbringen.

## 9. Anweisungen im Schülertext
Der Text einer Arbeit wird dem Modell im selben Zusammenhang vorgelegt wie die Bewertungsregeln. Daraus folgt eine Möglichkeit, die es bei einer Korrektur auf Papier nicht gibt: Jemand könnte versuchen, eine Anweisung in die Arbeit zu schreiben, um die Bewertung zu beeinflussen.

Dagegen ist vorgesorgt: Werte werden nur über ein abgesichertes Verfahren in die Anweisung eingesetzt, Steuerzeichen im Schülertext werden neutralisiert, und die Bewertungsanweisung lässt Text innerhalb der Arbeit ausdrücklich nicht als Anweisung gelten. Am 27.08.2026 wurden sechs Angriffsarten geprüft; nach der Härtung wirkte keine mehr.

Sechs Angriffsarten sind eine Stichprobe, kein Sicherheitsnachweis. Fällt Ihnen in einer Arbeit Text auf, der sich an die Software statt an die Aufgabe richtet, bewerten Sie diese Arbeit von Hand und melden Sie den Fall.

## 10. Wartung & Updates
*   Das Gesamtsystem wird **kontinuierlich/agil** aktualisiert, um Sicherheit und Stabilität zu gewährleisten.
*   **Modellversionen:** Koreki spricht **feste Modellversionen** an, keine gleitenden Kennungen. Verwendet werden `mistral-medium-2604` für die Bewertung, `mistral-ocr-4-1` für die Texterkennung, `mistral-large-2512` und `mistral-small-2603` für die Aufbereitung. Ein stiller Austausch des Modells durch den Anbieter ist damit ausgeschlossen.
*   **So läuft ein Wechsel ab:** Bevor eine neue Modellversion in Betrieb geht, wird sie gegen dieselben Prüfungen gemessen wie die bisherige. Sie wird nur übernommen, wenn kein Beeinflussungsversuch wirkt und keine Messung schlechter ausfällt. Besteht keine verfügbare Version diese Prüfung, wechseln wir auf die beste verfügbare und benennen die Verschlechterung ausdrücklich. Der Wechsel wird vor seinem Wirksamwerden in den Versionshinweisen angekündigt, zusammen mit dem Ergebnis der Nachmessung. Wie viel Vorlauf möglich ist, hängt bei erzwungenen Wechseln von der Abkündigungsfrist des Modellanbieters ab und kann kurz sein.
*   **Bei lokalem Betrieb** mit einem selbst vorgehaltenen Modell bestimmen Sie den Zeitpunkt eines Wechsels vollständig selbst.

***
**Stand: 30. August 2026 (v1.2)**
*Erstellt in Anlehnung an die Transparenzanforderungen der Verordnung (EU) 2024/1689*
