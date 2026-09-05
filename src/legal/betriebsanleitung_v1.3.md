# Betriebsanleitung und Nutzungshinweise
für das KI-System **Koreki**

> Dieses Dokument beschreibt Zweck, Grenzen und Aufsichtspflichten des Systems.
> Koreki stellt es bereit, weil Nutzerinnen und Nutzer diese Angaben brauchen,
> um das System verantwortlich einzusetzen — unabhängig davon, wie das System
> aufsichtsrechtlich eingeordnet wird.

## 1. Anbieter und Betreiber

Zwei Rollen, zwei Kontakte. Welche davon Sie selbst haben, klärt Abschnitt 2.

**Anbieter des Systems** — verantwortlich für die Software, ihre Dokumentation und die Angaben in diesem Dokument:

*   **Anbieter:** [ANBIETER BITTE HIER EINTRAGEN]
*   **Kontakt für Rückfragen, Störungen und Hinweise auf Fehlbewertungen:** [ANBIETER-KONTAKT BITTE HIER EINTRAGEN]
*   **Vollständige Anbieterangaben:** [ANBIETER-IMPRESSUM BITTE HIER EINTRAGEN]

**Betreiber dieser Instanz** — verantwortlich für den Einsatz vor Ort, für die verarbeiteten Daten und für die Aufsicht über die Bewertungen:

*   **Betreiber:** [FIRMIERUNG BITTE HIER EINTRAGEN]
*   **Anschrift:** [ADRESSE BITTE HIER EINTRAGEN]
*   **Kontakt:** [KONTAKT BITTE HIER EINTRAGEN]

Betreiben Sie Koreki selbst, tragen Sie **Ihre eigenen Angaben als Betreiber** über die Umgebungsvariablen `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS` und `NEXT_PUBLIC_LEGAL_EMAIL` ein. Ohne diese Angaben zeigt Ihre Instanz Platzhalter; für einen Produktivbetrieb reicht das nicht.

Die Angaben zum **Anbieter** gehören zur Software und sind nicht von Ihnen zu ändern. Bringen Sie Koreki unter eigenem Namen aus, werden Sie selbst Anbieter — dann sind sie zu ersetzen. Abschnitt 2 sagt Ihnen, wann das der Fall ist.

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
*   **Prüfungen mit Zulassungs- oder Abschlusswirkung:** Für Abschlussprüfungen, zentrale Prüfungen und vergleichbare Verfahren liegt **kein Eignungsnachweis** vor — die Genauigkeitsmessung (Abschnitt 4) deckt sie nicht ab. Ob und wie KI-gestützte Korrektur dort zulässig ist, richtet sich nach der jeweiligen Prüfungsordnung; das zu prüfen liegt bei der Schule. **Ist eine unabhängige Zweitkorrektur vorgeschrieben, darf der Zweitkorrektor den Vorschlag nicht sehen** — sonst ist die Zweitkorrektur nicht mehr unabhängig, sondern am Vorschlag verankert.

## 4. Genauigkeit & Fehlerquellen
Trotz hoher technologischer Standards kann die KI fehlerhafte Ergebnisse liefern. Bekannte Fehlerquellen sind:
*   **Handschrift:** Sehr unleserliche oder ungewöhnliche Handschriften können zu Fehlinterpretationen führen.
*   **Ironie & Nuancen:** Subtile sprachliche Mittel wie Ironie, Sarkasmus oder extrem spezifische Dialekte werden unter Umständen nicht korrekt erfasst.
*   **Kontext:** Die KI bewertet semantisch. Bei fachspezifischen Abkürzungen, die nicht in der Musterlösung definiert sind, kann es zu Punktabzug kommen.
*   **Umformungsschritte in Rechnungen:** Notiert eine Schülerin ihre Rechnung nicht ausgeschrieben, sondern als Umformung — etwa `3x = 18 | :3` und darunter `x = 9` —, muss Koreki die gemeinte Rechnung erst erschließen. Dabei kann es beim Einlesen versehentlich das RICHTIGE Ergebnis übernehmen statt des notierten; der Rechenfehler verschwindet dann aus der Prüfung, und die Aufgabe bekommt zu viele Punkte. Gemessen betraf das einen von 28 Rechenschritten. **Was Sie tun können:** In der Detailanalyse steht unter „Gelesener Rechenweg“, welche Zahlen Koreki gelesen hat. Weicht dort etwas vom Blatt ab, stimmt die Bewertung dieser Aufgabe nicht.

### 4.1 Was gemessen wurde
Seit dem 02.09.2026 liegt eine erste Messung vor. Zwölf Referenzaufgaben aus zwölf Fächern — von Deutsch über Mathematik und Chemie bis Pflege und Kaufmännisches — wurden mit einer festgelegten Sollpunktzahl versehen und von einer Lehrkraft durchgesehen. Gemessen wurde, wie weit der Punktvorschlag davon abweicht.

| Kennzahl | Wert |
|---|---|
| Mittlere Abweichung | **0,08 bis 0,17 Punkte je Aufgabe** (2,1 % bis 4,2 % der erreichbaren Punkte) |
| Aufgaben ohne jede Abweichung | 10 bis 11 von 12 |
| Wiederholter Lauf, gleiche Sitzung | dreimal dieselbe Punktzahl, in allen zwölf Fällen |
| Wiederholter Lauf, andere Sitzung | in zwei bis drei von zwölf Fällen 1 bis 2 Punkte Unterschied |

**Warum eine Spanne und keine einzelne Zahl.** Dieselbe Konfiguration wurde an zwei Tagen gemessen und ergab einmal 0,08 und einmal 0,17 Punkte. Innerhalb einer Sitzung war das Ergebnis jedes Mal stabil; die Streuung liegt zwischen Sitzungen. Eine einzelne Zahl würde eine Genauigkeit vortäuschen, die die Messung nicht hergibt.

In den abweichenden Fällen bewertete Koreki **strenger** als die Referenz, nicht großzügiger.

**Zur Wiederholbarkeit.** Koreki sendet an alle KI-Anbieter einen festen Startwert, damit derselbe Stapel beim zweiten Durchlauf dieselben Zahlen ergibt und nicht neue. Das wirkt zuverlässig, solange Sie innerhalb einer Sitzung arbeiten. Über längere Zeiträume hinweg — etwa wenn der Modellserver zwischendurch neu geladen hat — können einzelne Punktzahlen dennoch um ein bis zwei Punkte abweichen. Verlassen Sie sich daher nicht darauf, eine einmal erzeugte Bewertung Wochen später zeichengenau reproduzieren zu können; **speichern oder exportieren Sie das Protokoll**, wenn Sie eine Bewertung später belegen müssen.

### 4.2 Wofür diese Zahl gilt — und wofür nicht
Bitte lesen Sie die Zahl mit ihren Grenzen:
*   Sie gilt **ausschließlich** für die Konfiguration `qwen3.6:35b` über lokales Ollama mit dem KI-Profil „Standard" (Temperatur 0.1, topP 0.95, Denkschritte eingeschaltet) und dem Standard-Skillprofil. **Jedes andere Modell — auch Mistral — ist ungeprüft.** Da Sie das Modell selbst wählen, kann Ihre Konfiguration abweichen.
*   Als auffällig gilt eine Abweichung von mehr als **10 %** im Mittel oder mehr als **25 %** in einem einzelnen Fall. Diese Grenzen hat der Anbieter vorab festgelegt; die oben genannte Messung hält beide ein.
*   Zwölf Aufgaben sind eine erste Messung, kein Nachweis über alle Fächer. Der Prüfsatz enthält gezielt schwierige Grenzfälle und entspricht nicht einer durchschnittlichen Klassenarbeit.
*   Die Eingabe war durchweg **getippter** Text. Fehler der Handschrifterkennung sind darin **nicht** enthalten und kommen hinzu.
*   Gemessen wurde die Übereinstimmung mit einer Referenzbewertung — nicht, ob eine Note richtig ist.

### 4.3 Rechenaufgaben mit hinterlegter Rechenkette
Für Rechenaufgaben können Sie in der Musterlösung ein Rechenziel hinterlegen; Koreki rechnet den Weg dann selbst nach.

**Folgefehler soll Koreki nicht doppelt bestrafen.** Wer sich in Teilaufgabe a) verrechnet und in b) mit seinem eigenen falschen Wert korrekt weiterrechnet, soll den Ergebnispunkt für b) erhalten: Der Abzug bleibt dort, wo der Fehler entstanden ist. Ein in der **Aufgabe gegebener** Wert muss dagegen richtig eingesetzt werden — ein Fehler dort ist ein eigener Fehler und kostet Punkte.

**Wie verlässlich das ist.** Diese Regel ist eine Anweisung an das Sprachmodell (der Skill „Folgefehler-Tracking", im Standardprofil aktiv) — keine Rechenregel, die das Programm erzwingt. Das hat einen sachlichen Grund: Ob ein falscher Wert aus der eigenen Teilaufgabe a) stammt oder aus der Angabe falsch abgeschrieben wurde, ist eine fachliche Beurteilung. Die Nachrechnung sieht immer nur *eine* Teilaufgabe und kann beides nicht unterscheiden; sie steuert das Nachprüfbare bei und bestätigt, ob jemand seinen **eigenen** Rechenweg fehlerfrei ausgeführt hat.

In der Messung hat die geprüfte Konfiguration diese Regel eingehalten. Verlassen sollten Sie sich darauf nicht.

**Woran Sie erkennen, ob wirklich nachgerechnet wurde.** Nicht jede Rechnung lässt sich maschinell nachvollziehen — wer sie in Worten formuliert („2 ml in 30 min, das sind 4 ml/h“), schreibt keinen Rechenausdruck hin. Dann prüft Koreki den Weg nicht nach, und die Punkte kommen vom Sprachmodell.

Sie sehen das direkt in der Korrekturansicht: Über dem aufklappbaren Nachweis steht dann in Warnfarbe **„Nicht nachgerechnet — die Sandbox fand keinen Rechenausdruck. Die Punkte hat das Sprachmodell vergeben."** Steht dieser Hinweis nicht da, wurde gerechnet.

Wichtig: „Nicht nachgerechnet“ heißt **nicht** „nicht gerechnet“. Es ist eine Grenze unserer Auswertung, kein Vorwurf an die Schülerin — und Koreki zieht dafür auch keine Punkte ab.

**Was Sie deshalb beachten sollten:** Prüfen Sie bei mehrschrittigen Rechenaufgaben, ob ein Abzug in einer späteren Teilaufgabe wirklich ein neuer Fehler ist — oder derselbe zum zweiten Mal. In der Messung lag die Abweichung bei Rechenaufgaben **ohne** hinterlegtes Rechenziel bei 0,00 bis 0,17 Punkten, **mit** Rechenziel bei 0,33 Punkten. Die Rechenkette liegt also weiterhin höher als die rein sprachliche Bewertung.

### 4.4 Was das für Ihre Arbeit heißt
Ein Punktvorschlag bleibt ein Entwurf. Die Zahl oben beschreibt, wie nah die Vorschläge im Mittel lagen — sie sagt nichts über den einzelnen Fall vor Ihnen. Die Prüfpflicht aus Abschnitt 6 wird durch sie nicht kleiner.

## 5. Was Sie über KI wissen sollten (Art. 4 EU AI Act)

Artikel 4 verlangt, dass alle, die mit einem KI-System arbeiten, es hinreichend verstehen. Nicht als Schulung — sondern so weit, dass Sie einschätzen können, wann Sie dem System trauen dürfen und wann nicht. Diese fünf Punkte genügen dafür.

### 5.1 Eine KI kann überzeugend falsch sein
Das ist der wichtigste Punkt. Ein Sprachmodell erzeugt Text, der **plausibel klingt** — nicht Text, der wahr ist. Eine falsche Bewertung kommt in demselben ruhigen, sachlichen Ton daher wie eine richtige. Sie wirkt nicht unsicher, sie zögert nicht, sie schreibt keine Fragezeichen.

Bei einem Menschen ist Unsicherheit meist zu hören. Hier nicht. Verlassen Sie sich deshalb nie darauf, dass ein Fehler „schon auffallen" wird.

### 5.2 Der Vertrauenswert misst nicht, ob die Bewertung stimmt
Jede Aufgabe trägt einen Vertrauenswert. Er sagt: *Wie eindeutig war dieser Fall für das Modell?* Er sagt **nicht**: *Wie wahrscheinlich ist die Punktzahl richtig?*

Ein niedriger Wert ist ein verlässliches Warnsignal — dort lohnt das Nachsehen besonders. Ein hoher Wert ist dagegen **keine Zusicherung**. Eine falsche Bewertung mit hohem Vertrauenswert ist möglich und kommt vor.

### 5.3 Dieselbe Arbeit kann beim zweiten Lauf anders ausfallen
Koreki sendet an alle KI-Anbieter einen festen Startwert, damit ein wiederholter Lauf dieselben Zahlen liefert. Innerhalb einer Sitzung ist darauf Verlass. Über längere Zeiträume — etwa nach einem Neustart des Modellservers — können einzelne Punktzahlen dennoch um ein bis zwei Punkte abweichen.

Wenn Sie eine Bewertung später belegen müssen, **speichern Sie das Protokoll**. Ein zweiter Lauf ist kein Ersatz dafür.

### 5.4 Das System liest den Text, nicht die Absicht
Koreki vergleicht, was auf dem Blatt steht, mit Ihrer Musterlösung. Es weiß nicht, was eine Schülerin gemeint hat, kennt Ihren Unterricht nicht und erkennt keine Ironie. Eine sachlich richtige Antwort in ungewöhnlicher Formulierung kann es verfehlen — und eine gut klingende Leerformel gelegentlich zu hoch bewerten.

Genau deshalb sind **Ihre Bewertungshinweise in der Musterlösung** der wirksamste Hebel: Je klarer dort steht, wann ein Punkt erfüllt ist, desto weniger muss das System raten.

### 5.5 Wenn ein Vorschlag falsch aussieht
Er ist es vermutlich. Ändern Sie die Punktzahl — sie ist genau dafür überschreibbar. Zwei Dinge helfen darüber hinaus:

* **Sehen Sie die Begründung an.** Zu jeder Aufgabe steht, warum die Punkte so vergeben wurden. Meist zeigt sich dort, ob das System die Antwort missverstanden hat oder ob Ihre Musterlösung an dieser Stelle mehrdeutig ist.
* **Melden Sie es.** Wiederkehrende Fehlbewertungen sind für die Weiterentwicklung wertvoll. Die Kontaktadresse steht in Abschnitt 1.

**Kein Grund zur Sorge ist dagegen:** dass Koreki gelegentlich strenger bewertet als Sie. In der Messung vom 03.09.2026 lag die einzige Abweichung in diese Richtung. Ein System, das zu streng ist, korrigieren Sie beim Durchsehen. Eines, das zu großzügig ist, fällt seltener auf.

## 6. Menschliche Aufsicht (Human-in-the-Loop)
**WICHTIGER HINWEIS:** Koreki ist ein Assistenzsystem, kein Ersatz für die pädagogische Fachkraft.
*   Jeder Bewertungsvorschlag der KI **muss** durch die Lehrkraft geprüft und ggf. korrigiert werden.
*   Die KI kann "halluzinieren" (Inhalte erfinden oder Fakten falsch verknüpfen). Die Letztverantwortung für die Note liegt ausschließlich bei der Lehrkraft.
*   Jede Einschätzung trägt einen Vertrauenswert. Bei niedrigem Wert markiert Koreki die Aufgabe zur Prüfung, statt die Unsicherheit zu verbergen.
*   Vor jedem Export bestätigen Sie einmal je Stapel ausdrücklich, dass Sie die Bewertungen geprüft haben. Die Bestätigung wird protokolliert; ein neuer Korrekturlauf setzt sie zurück.
*   Eine Note entsteht ausschließlich durch die Freigabe der Lehrkraft. Einen automatisierten Pfad zur Notenvergabe gibt es nicht.

Die Software erzwingt die Durchsicht nicht und gibt auch nicht vor, es zu tun. Die Bestätigung ist Ihre Erklärung, kein Nachweis, dass jede Arbeit geöffnet wurde.

## 7. Kennzeichnung KI-erzeugter Inhalte
Feedbacktexte und Punktvorschläge werden maschinell erzeugt. Diese Herkunft bleibt auf allen Ausgabewegen erkennbar:
*   **Exportierte Dateien** tragen sie maschinenlesbar in den Dateieigenschaften (PDF-Schlüsselwörter, Excel-Kategorie) und lesbar in der Fußzeile.
*   **Der digitale Rückmeldezettel** trägt sie als Angabe im Seitenkopf und als Zeile unter dem Feedback.

**Grenze:** Die Kennzeichnung hängt an der Datei beziehungsweise an der Seite, nicht am Text selbst. Wer einen Feedbacksatz herauskopiert, nimmt sie nicht mit.

## 8. Technische Grenzen
*   **Dateien:** Unterstützt werden PDF, JPG, PNG, TXT, XLSX und CSV bis maximal 50 MB pro Datei.
*   **Sprachen:** Belastbare Aussagen zur Qualität in einzelnen Unterrichtssprachen liegen nicht vor. Die frühere Angabe „optimiert für Deutsch, Englisch und Französisch" ließ sich nicht belegen und ist entfallen.
*   **Zeichenlimit:** 10.000 Zeichen je Seite, höchstens 100.000 Zeichen je Anfrage.

### 8.1 Betrieb ohne Anmeldung
Die Community- und Desktop-Ausgabe lässt sich mit `AUTH_TYPE=NONE` ohne Anmeldung betreiben. **Für den Mehrbenutzerbetrieb an einer Schule ist dieser Modus ungeeignet.** Es gibt dann keine Benutzertrennung: Wer Zugriff auf den Rechner oder die Adresse hat, sieht alle Arbeiten. Der Zugang ist genau so weit geschützt wie der Rechner selbst.

Für den Betrieb an einer Schule verwenden Sie die Anmeldung über Keycloak oder betreiben Koreki auf einem Einzelplatzrechner, zu dem nur die korrigierende Lehrkraft Zugang hat.

### 8.2 Schülerinnen und Schüler mit Notenschutz
Liegt für ein Kind **Notenschutz** vor — Rechtschreib- oder Leseleistung wird ganz oder teilweise nicht bewertet —, lässt sich das über die Bewertungs-Skills abbilden (etwa „Kulante Bewertung (Rechtschreibungs-Blind)").

**Beachten Sie dabei:** Die Skill-Auswahl gilt für den **gesamten Stapel**, nicht für einzelne Arbeiten. Korrigieren Sie die betroffene Arbeit deshalb in einem **eigenen Durchlauf** mit dem passenden Profil. Andernfalls fließt die Rechtschreibung in die Bewertung ein, obwohl sie es nicht darf — und das fällt nicht auf, weil die Punktzahl plausibel aussieht.

Der **Nachteilsausgleich** (verlängerte Bearbeitungszeit, Hilfsmittel) betrifft dagegen die Bedingungen der Arbeit und nicht die Bewertung; er berührt Koreki nicht.

## 9. Risikovermeidung & Antidiskriminierung
Das System wird stichprobenartig auf sprachbedingte Ungleichbehandlung geprüft. Im Test vom 23.08.2026 wurde dieselbe fachliche Leistung in Standardsprache, in einfacher Umgangssprache und in nicht-muttersprachlicher Formulierung identisch bewertet (je 4 von 4 Punkten, keine Abweichung). Eine systematische Prüfung über mehrere Fächer, Aufgabentypen und Modelle hinweg steht aus. Lehrkräfte sollten darauf achten, dass die KI keine diskriminierenden Muster (z.B. aufgrund von Ausdrucksweise oder Herkunft) reproduziert. Bei Verdacht auf systematische Fehlbehandlung ist der Support zu informieren.

**Zur Pseudonymisierung, klar gesagt:** Koreki ersetzt den **Dateinamen** automatisch durch eine Bezeichnung wie „Schüler #1". Das geschieht ohne Ihr Zutun.

**Namen auf dem Blatt** erfasst diese automatische Ersetzung nicht. Dafür gibt es die **Schwärzung**: Markieren Sie die Stelle, und Koreki verwendet für die Texterkennung ausschließlich den geschwärzten Abzug — der Name gelangt dann nicht an das Sprachmodell. Fehlt zu einer als geschwärzt geführten Arbeit auch nur eine geschwärzte Seite, bricht der Vorgang mit einer Fehlermeldung ab, statt heimlich das Original zu verwenden.

Die Schwärzung ist allerdings **freiwillig und je Datei von Hand anzuwenden**. Wer sie nicht nutzt, überträgt einen auf dem Blatt stehenden Namen mit. Bei Verdacht auf einen Klarnamen im erkannten Text zeigt Koreki einen Hinweis, hält den Vorgang aber nicht an.

**Empfehlung:** Schwärzen Sie Namen vor dem Hochladen, oder lassen Sie die Arbeiten von vornherein mit Nummern statt Namen schreiben.

**Nachteilsausgleich:** Ein gewährter Nachteilsausgleich — etwa bei Legasthenie — ist dem System nicht bekannt und wird von ihm nicht berücksichtigt. Sie müssen ihn bei der Durchsicht selbst einbringen.

## 10. Anweisungen im Schülertext
Der Text einer Arbeit wird dem Modell im selben Zusammenhang vorgelegt wie die Bewertungsregeln. Daraus folgt eine Möglichkeit, die es bei einer Korrektur auf Papier nicht gibt: Jemand könnte versuchen, eine Anweisung in die Arbeit zu schreiben, um die Bewertung zu beeinflussen.

Dagegen ist vorgesorgt: Werte werden nur über ein abgesichertes Verfahren in die Anweisung eingesetzt, Steuerzeichen im Schülertext werden neutralisiert, und die Bewertungsanweisung lässt Text innerhalb der Arbeit ausdrücklich nicht als Anweisung gelten. Am 27.08.2026 wurden sechs Angriffsarten geprüft; nach der Härtung wirkte keine mehr.

Sechs Angriffsarten sind eine Stichprobe, kein Sicherheitsnachweis. Fällt Ihnen in einer Arbeit Text auf, der sich an die Software statt an die Aufgabe richtet, bewerten Sie diese Arbeit von Hand und melden Sie den Fall.

## 11. Wartung & Updates
*   Das Gesamtsystem wird **kontinuierlich/agil** aktualisiert, um Sicherheit und Stabilität zu gewährleisten.
*   **Modellversionen:** Koreki spricht **feste Modellversionen** an, keine gleitenden Kennungen. Verwendet werden `mistral-medium-2604` für die Bewertung, `mistral-ocr-4-1` für die Texterkennung, `mistral-large-2512` und `mistral-small-2603` für die Aufbereitung. Ein stiller Austausch des Modells durch den Anbieter ist damit ausgeschlossen.
*   **So läuft ein Wechsel ab:** Bevor eine neue Modellversion in Betrieb geht, wird sie gegen dieselben Prüfungen gemessen wie die bisherige. Sie wird nur übernommen, wenn kein Beeinflussungsversuch wirkt und keine Messung schlechter ausfällt. Besteht keine verfügbare Version diese Prüfung, wechseln wir auf die beste verfügbare und benennen die Verschlechterung ausdrücklich. Der Wechsel wird vor seinem Wirksamwerden in den Versionshinweisen angekündigt, zusammen mit dem Ergebnis der Nachmessung. Wie viel Vorlauf möglich ist, hängt bei erzwungenen Wechseln von der Abkündigungsfrist des Modellanbieters ab und kann kurz sein.
*   **Bei lokalem Betrieb** mit einem selbst vorgehaltenen Modell bestimmen Sie den Zeitpunkt eines Wechsels vollständig selbst.

***
**Stand: 05. September 2026 (v1.3)**
*Erstellt in Anlehnung an die Transparenzanforderungen der Verordnung (EU) 2024/1689*
