# Betriebsanleitung und Nutzungshinweise
für das KI-System **Koreki**

> Dieses Dokument beschreibt Zweck, Grenzen und Aufsichtspflichten des Systems.
> Koreki stellt es bereit, weil Nutzerinnen und Nutzer diese Angaben brauchen,
> um das System verantwortlich einzusetzen — unabhängig davon, wie das System
> aufsichtsrechtlich eingeordnet wird.

## 1. Zweckbestimmung
Koreki ist ein KI-gestütztes Assistenzsystem zur Unterstützung von Lehrkräften bei der Korrektur von schriftlichen Leistungsnachweisen (Klassenarbeiten, Tests).
*   **Zweck:** Analyse von Schülerantworten gegen eine Musterlösung, Punktvorschläge und Feedback-Entwürfe.
*   **Nicht-Zweck:** Koreki darf **nicht** zur Erstellung von psychologischen Profilen, zur Verhaltensvorhersage oder zur automatisierten, alleinigen Entscheidung über Noten ohne menschliche Kontrolle verwendet werden.
*   **Keine Profilbildung:** Das System speichert keine Profile über einzelne Schülerinnen und Schüler, schreibt keine Bewertungen über mehrere Arbeiten hinweg fort und trifft keine Aussagen über künftige Leistung, Eignung oder Verhalten. Jeder Durchlauf bewertet genau ein Dokument gegen die vorgegebenen Kriterien.

## 2. Genauigkeit & Fehlerquellen
Trotz hoher technologischer Standards kann die KI fehlerhafte Ergebnisse liefern. Bekannte Fehlerquellen sind:
*   **Handschrift:** Sehr unleserliche oder ungewöhnliche Handschriften können zu Fehlinterpretationen führen.
*   **Ironie & Nuancen:** Subtile sprachliche Mittel wie Ironie, Sarkasmus oder extrem spezifische Dialekte werden unter Umständen nicht korrekt erfasst.
*   **Kontext:** Die KI bewertet semantisch. Bei fachspezifischen Abkürzungen, die nicht in der Musterlösung definiert sind, kann es zu Punktabzug kommen.

## 3. Menschliche Aufsicht (Human-in-the-Loop)
**WICHTIGER HINWEIS:** Koreki ist ein Assistenzsystem, kein Ersatz für die pädagogische Fachkraft.
*   Jeder Bewertungsvorschlag der KI **muss** durch die Lehrkraft geprüft und ggf. korrigiert werden.
*   Die KI kann "halluzinieren" (Inhalte erfinden oder Fakten falsch verknüpfen). Die Letztverantwortung für die Note liegt ausschließlich bei der Lehrkraft.
*   Jede Einschätzung trägt einen Vertrauenswert. Bei niedrigem Wert markiert Koreki die Aufgabe zur Prüfung, statt die Unsicherheit zu verbergen.
*   Eine Note entsteht ausschließlich durch die Freigabe der Lehrkraft. Einen automatisierten Pfad zur Notenvergabe gibt es nicht.

## 4. Kennzeichnung KI-erzeugter Inhalte
Feedbacktexte und Punktvorschläge werden maschinell erzeugt. Exportierte Dateien tragen diese Herkunft an zwei Stellen:
*   **Maschinenlesbar** in den Dateieigenschaften (PDF-Schlüsselwörter, Excel-Kategorie).
*   **Lesbar** als Hinweis in der Fußzeile exportierter Dokumente.

## 5. Technische Grenzen
*   **Dateien:** Unterstützt werden PDF, JPG und PNG bis maximal 50 MB pro Datei.
*   **Sprachen:** Optimiert für Deutsch, Englisch und Französisch. Andere Sprachen können eine verminderte Genauigkeit aufweisen.
*   **Zeichenlimit:** Es gelten die systemseitigen Fair-Use-Limits (siehe AVV).

## 6. Risikovermeidung & Antidiskriminierung
Das System wird stichprobenartig auf sprachbedingte Ungleichbehandlung geprüft. Im Test vom 23.08.2026 wurde dieselbe fachliche Leistung in Standardsprache, in einfacher Umgangssprache und in nicht-muttersprachlicher Formulierung identisch bewertet (je 4 von 4 Punkten, keine Abweichung). Eine systematische Prüfung über mehrere Fächer, Aufgabentypen und Modelle hinweg steht aus. Lehrkräfte sollten darauf achten, dass die KI keine diskriminierenden Muster (z.B. aufgrund von Ausdrucksweise oder Herkunft) reproduziert. Bei Verdacht auf systematische Fehlbehandlung ist der Support zu informieren.

Zur Verringerung namensbezogener Verzerrung werden Schülernamen pseudonymisiert, bevor der Text an das Sprachmodell übergeben wird. Die Zuordnung zum Klarnamen erfolgt erst beim Export durch die Lehrkraft.

## 7. Wartung & Updates
*   Das Gesamtsystem wird **kontinuierlich/agil** aktualisiert, um Sicherheit und Stabilität zu gewährleisten.
*   **Modell-APIs:** Die verwendeten KI-Modelle werden über die `latest`-Kennungen des Anbieters angesprochen (z. B. `mistral-medium-latest`). Der Anbieter kann das dahinterliegende Modell daher ohne Vorankündigung austauschen. Ein Wechsel der von Koreki angesprochenen Modellfamilie erfolgt kontrolliert und wird den Nutzern vorab angekündigt.

***
**Stand: 24. August 2026 (v1.1)**
*Erstellt in Anlehnung an die Transparenzanforderungen der Verordnung (EU) 2024/1689*
