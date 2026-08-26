# Betriebsanleitung (Art. 13 AI Act)
für das KI-System **Koreki**

## 1. Zweckbestimmung
Koreki ist ein KI-gestütztes Assistenzsystem zur Unterstützung von Lehrkräften bei der Korrektur von schriftlichen Leistungsnachweisen (Klassenarbeiten, Tests).
*   **Zweck:** Analyse von Schülerantworten gegen eine Musterlösung, Punktvorschläge und Feedback-Entwürfe.
*   **Nicht-Zweck:** Koreki darf **nicht** zur Erstellung von psychologischen Profilen, zur Verhaltensvorhersage oder zur automatisierten, alleinigen Entscheidung über Noten ohne menschliche Kontrolle verwendet werden.

## 2. Genauigkeit & Fehlerquellen
Trotz hoher technologischer Standards kann die KI fehlerhafte Ergebnisse liefern. Bekannte Fehlerquellen sind:
*   **Handschrift:** Sehr unleserliche oder ungewöhnliche Handschriften können zu Fehlinterpretationen führen.
*   **Ironie & Nuancen:** Subtile sprachliche Mittel wie Ironie, Sarkasmus oder extrem spezifische Dialekte werden unter Umständen nicht korrekt erfasst.
*   **Kontext:** Die KI bewertet semantisch. Bei fachspezifischen Abkürzungen, die nicht in der Musterlösung definiert sind, kann es zu Punktabzug kommen.

## 3. Menschliche Aufsicht (Human-in-the-Loop)
**WICHTIGER HINWEIS:** Koreki ist ein Assistenzsystem, kein Ersatz für die pädagogische Fachkraft.
*   Jeder Bewertungsvorschlag der KI **muss** durch die Lehrkraft geprüft und ggf. korrigiert werden.
*   Die KI kann "halluzinieren" (Inhalte erfinden oder Fakten falsch verknüpfen). Die Letztverantwortung für die Note liegt ausschließlich bei der Lehrkraft.

## 4. Technische Grenzen
*   **Dateien:** Unterstützt werden PDF, JPG und PNG bis maximal 50 MB pro Datei.
*   **Sprachen:** Optimiert für Deutsch, Englisch und Französisch. Andere Sprachen können eine verminderte Genauigkeit aufweisen.
*   **Zeichenlimit:** Es gelten die systemseitigen Fair-Use-Limits (siehe AVV).

## 5. Risikovermeidung & Antidiskriminierung
Das System wird stichprobenartig auf sprachbedingte Ungleichbehandlung geprüft. Im Test vom 23.08.2026 wurde dieselbe fachliche Leistung in Standardsprache, in einfacher Umgangssprache und in nicht-muttersprachlicher Formulierung identisch bewertet (je 4 von 4 Punkten, keine Abweichung). Eine systematische Prüfung über mehrere Fächer, Aufgabentypen und Modelle hinweg steht aus. Lehrkräfte sollten darauf achten, dass die KI keine diskriminierenden Muster (z.B. aufgrund von Ausdrucksweise oder Herkunft) reproduziert. Bei Verdacht auf systematische Fehlbehandlung ist der Support zu informieren.

## 6. Wartung & Updates
*   Das Gesamtsystem wird **kontinuierlich/agil** aktualisiert, um Sicherheit und Stabilität zu gewährleisten.
*   **Modell-APIs:** Die verwendeten KI-Modelle werden über die `latest`-Kennungen des Anbieters angesprochen (z. B. `mistral-medium-latest`). Der Anbieter kann das dahinterliegende Modell daher ohne Vorankündigung austauschen. Ein Wechsel der von Koreki angesprochenen Modellfamilie erfolgt kontrolliert und wird den Nutzern vorab angekündigt.

***
**Stand: 07. April 2026 (v1.0)**
*Erstellt in Anlehnung an die Transparenzanforderungen der Verordnung (EU) 2024/1689*
