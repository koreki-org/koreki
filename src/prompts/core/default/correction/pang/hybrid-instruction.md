WICHTIG: Halte dich bei der Vergabe der Punkte streng und ohne Abweichung an die expliziten Punktvorgaben pro Teilschritt aus der Musterlösung des Lehrers (z. B. Formel = 1P, Einsetzen = 1P, Ergebnis = 1P).

Nutze bei der Bewertung, ob der Schüler die Kriterien für den jeweiligen Teilschritt erfüllt hat, die folgende strukturierte Unterstützung:

### 1. Der Formel-Schritt (NUR WENN EXPLIZIT IN DER MUSTERLÖSUNG GEFORDERT)
Bewerte diesen Teilschritt wie folgt:
* **Abstrakte Variablennotation erforderlich**: Vergib den Punkt nur, wenn der Schüler die Formel mit abstrakten Variablennamen aufgeschrieben hat (z. B. `P = U × I` oder `Kosten = W × VE`).
  * *Achtung*: Rein eingesetzte Zahlenwerte (z. B. `0,1916 × 0,30` oder `230 × 10`) erfüllen den Formel-Schritt **NICHT** (das ist bereits der Einsetz-Schritt).
* **Erlaubte semantische Toleranz (Synonyme)**: Beharre niemals pedantisch auf exakt denselben Worten der Musterlösung. Akzeptiere gleichwertige Symbole oder Bezeichnungen, solange sie **dieselbe physikalische/mathematische Größe** repräsentieren.
  * *Beispiel*: `Kosten = W × VE` ist vollkommen äquivalent zu `Kosten = Energie × Preis` (W steht für Arbeit/Energie, VE für Verbrauchseinheit/Preis, AP für Arbeitspreis).
* **Verbotene Fehler (Strikte Variablenprüfung)**: Wenn der Schüler sachlich falsche Variablen für eine physikalische Größe verwendet, bewerte die Formel als **fehlerhaft (0 Punkte)**.
  * *Beispiel*: `P = U × Z` statt `P = U × I` ist ein grober physikalischer Fehler (0 Punkte), da Z (Impedanz) eine völlig andere physikalische Größe als I (Stromstärke) is.

### 2. Der Einsetz-Schritt / Rechenweg
Bewerte diesen Teilschritt wie folgt:
* **Überprüfung der eingesetzten Zahlenwerte (PANG-Abgleich)**: Nutze die mathematische Vorevaluierung der PANG-Engine im Hintergrund für alle Input-Variablen (Eingabewerte).
  * *Kriterium*: Wenn PANG eine der Eingabevariablen (z. B. `spannung_u`) als **FEHLERHAFT** bewertet, hat der Schüler einen falschen Zahlenwert aus der Aufgabe eingesetzt. In diesem Fall ist der Einsetz-Schritt **nicht erfüllt (0 Punkte)**.
  * *Ausnahme*: Wenn PANG alle Eingabewerte als **KORREKT** bewertet, oder falls keine Eingabewerte im Graph existieren, aber der Schüler einen korrekten Rechenweg mit den richtigen Werten aus der Aufgabenstellung aufgeschrieben hat, ist der Schritt **erfüllt (1 Punkt)**.

### 3. Der Ergebnis-Schritt (Mathematische PANG-Vorevaluierung)
Bewerte diesen Teilschritt wie folgt:
* **PANG-Entscheidung übernehmen**: Nutze die mathematische Vorevaluierung der PANG-Engine im Hintergrund. Meldet PANG, dass das Ergebnis mathematisch korrekt oder folgerichtig ist (Status "Folgefehler-Kompensiert" oder "KORREKT"), bewerte den Schritt zwingend als erfüllt.
* **Kettenabzugs-Verbot (Absolut zwingend)**: Ist ein Teilschritt folgerichtig (Folgefehler-kompensiert), **MUSS** er im Hybrid-Modus mit den vollen dafür vorgesehenen Punkten bewertet werden! Du darfst dem Schüler für einen Folgefehler (der mathematisch korrekt auf einem vorherigen Fehler aufbaut) kein zweites Mal Punkte abziehen.
