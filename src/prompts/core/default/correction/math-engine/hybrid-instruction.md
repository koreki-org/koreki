WICHTIG: Halte dich bei der Vergabe der Punkte streng und ohne Abweichung an die expliziten Punktvorgaben pro Teilschritt aus der Musterlösung des Lehrers (z. B. Formel = 1P, Einsetzen = 1P, Ergebnis = 1P).
* **Teilschritte-Abgleich im Schmierzettel (correctionNotes)**: Führe in den `correctionNotes` zwingend eine kurze Strichliste aller Teilschritte aus der Musterlösung (z.B. Formel, Einsetzen, Ergebnis) für jede Berechnungsgröße durch und prüfe einzeln, ob der Schüler diese erfüllt hat (z. B. "Formel I: ja (1P), Einsetzen I: ja (1P), Ergebnis I: nein (0P)"). Addiere diese Punkte für die finalen `pointsObtained`.

Nutze bei der Bewertung, ob der Schüler die Kriterien für den jeweiligen Teilschritt erfüllt hat, die folgende strukturierte Unterstützung:

### 1. Der Formel-Schritt (NUR WENN EXPLIZIT IN DER MUSTERLÖSUNG GEFORDERT)
Bewerte diesen Teilschritt wie folgt:
* **Abstrakte Variablennotation erforderlich**: Vergib den Punkt nur, wenn der Schüler die Formel mit abstrakten Variablennamen aufgeschrieben hat (z. B. `P = U × I` oder `Kosten = W × VE`).
  * *Achtung*: Rein eingesetzte Zahlenwerte (z. B. `0,1916 × 0,30` oder `230 × 10`) erfüllen den Formel-Schritt **NICHT** (das ist bereits der Einsetz-Schritt).
* **Kompakte/Kombinierte Schreibweise & Leerzeichen-Toleranz**: Wenn der Schüler die allgemeine Formel direkt mit dem Einsetzen und dem Ergebnis in einer einzigen Zeile/Kette aufgeschrieben hat (z. B. `I = U/R = 12 V / 6500 Ω = 0,001846 mA` oder `I = U / R = 12 V / 6500 Ω = ...`), ist der Formel-Schritt vollständig **ERFÜLLT**! Werte dies niemals fälschlicherweise als fehlende Formel, nur weil sie auf derselben Zeile wie die Zahlenwerte steht.
  - Akzeptiere jede Schreibweise (z. B. mit oder ohne Leerzeichen wie `I = U/R`, `I = U / R`, `I=U/R`, oder mit Doppelpunkt/Division `I = U : R`).
  - Wenn die korrekte abstrakte Formel (wie `I = U/R` oder `I = U / R`) irgendwo in der Schülerantwort steht, ist der Formel-Schritt zwingend als erfüllt zu bewerten. Ein Abzug oder eine Rüge wegen einer "fehlenden Formel" ist in diesem Fall ein schwerer Fehler.
* **Erlaubte semantische Toleranz (Synonyme)**: Beharre niemals pedantisch auf exakt denselben Worten der Musterlösung. Akzeptiere gleichwertige Symbole oder Bezeichnungen, solange sie **dieselbe physikalische/mathematische Größe** repräsentieren.
  * *Beispiel*: `Kosten = W × VE` ist vollkommen äquivalent zu `Kosten = Energie × Preis` (W steht für Arbeit/Energie, VE für Verbrauchseinheit/Preis, AP für Arbeitspreis).
  * *Weglassen der Zielvariable*: Wenn der Schüler den mathematischen Term direkt als Formel aufschreibt, ohne die Zielvariable explizit zu nennen (z. B. `R1 + R2 = 4 kΩ + 2,5 kΩ = ...` statt `Rges = R1 + R2 = ...` oder `U/R = 12 V / ...` statt `I = U/R = ...`), ist der Formel-Schritt ebenfalls vollständig **ERFÜLLT**! Der algebraische Term (`R1 + R2` bzw. `U/R`) repräsentiert die Formel bereits hinreichend. Wende hierfür keinen Punktabzug an.
* **Verbotene Fehler (Strikte Variablenprüfung)**: Wenn der Schüler sachlich falsche Variablen für eine physikalische Größe verwendet, bewerte die Formel als **fehlerhaft (0 Punkte)**.
  * *Beispiel*: `P = U × Z` statt `P = U × I` ist ein grober physikalischer Fehler (0 Punkte), da Z (Impedanz) eine völlig andere physikalische Größe als I (Stromstärke) ist.

### 2. Der Einsetz-Schritt / Rechenweg
Bewerte diesen Teilschritt wie folgt:
* **Überprüfung der eingesetzten Zahlenwerte (Engine-Abgleich)**: Nutze die mathematische Vorevaluierung der Rechen-Engine im Hintergrund für alle Input-Variablen (Eingabewerte).
  * *Kriterium*: Wenn die Engine eine der Eingabevariablen (z. B. `spannung_u` oder `R1`) als **FEHLERHAFT** bewertet, hat der Schüler einen falschen Zahlenwert aus der Aufgabe eingesetzt. In diesem Fall ist der Einsetz-Schritt **nicht erfüllt (0 Punkte)**.
  * *Ausnahme*: Wenn die Engine alle Eingabewerte als **KORREKT** bewertet, oder falls keine Eingabewerte im Graph/Kette existieren, aber der Schüler einen korrekten Rechenweg mit den richtigen Werten aus der Aufgabenstellung aufgeschrieben hat, ist der Schritt **erfüllt (1 Punkt)**.
* **Vorsatzzeichen-Kulanz**: Fordere NIEMALS eine explizite Umrechnung von Vorsatzzeichen (wie `kΩ` in `Ω` oder `mA` in `A`) im Rechenweg, wenn die Rechnung auch ohne (z. B. durch direktes Verrechnen/Kürzen wie `k × m = 1` oder `k × A = V`) mathematisch und physikalisch korrekt aufgeht. Behandle SI-Präfixe als mathematische Exponenten (z. B. `4 kΩ * 1,846 * 10^-3 A` ist absolut korrekt und ergibt direkt `7,38 V`, da `10^3 * 10^-3 = 1` ist). Werte dies niemals als Fehler oder fehlende Umrechnung.
* **Toleranz bei fehlenden Multiplikationszeichen (OCR-Artefakte)**: Im extrahierten Text und durch OCR-Filterung fehlen oft Multiplikationszeichen (z. B. steht dort `4 kΩ1,84610^-3 A` statt `4 kΩ * 1,846 * 10^-3 A` oder `4kΩ1,846mA`). Bewerte dies als vollkommen korrekten Einsetz-Schritt! Da die Werte für Widerstand (`4 kΩ`) und Stromstärke (`1,846 * 10^-3 A` bzw. `1,846 mA`) physikalisch korrekt nebeneinanderstehen, ist dies ein gültiger Rechenweg. Ziehe dafür niemals Punkte (auch keine halben Punkte) ab.

### 3. Der Ergebnis-Schritt (Mathematische Vorevaluierung)
Bewerte diesen Teilschritt wie folgt:
* **Engine-Entscheidung übernehmen**: Meldet die Engine das Ergebnis als "KORREKT" or "Folgefehler-Kompensiert", bewerte den Schritt als erfüllt (es sei denn, eine falsche/fehlende Einheit erfordert einen Abzug).
* **Teilschritte unabhängig bewerten**: Wenn ein Teilschritt (wie Formel oder Einsetzen) korrekt ist, das Ergebnis jedoch fehlerhaft ist, MUSST du die Punkte für Formel und Einsetzen trotzdem vergeben. Ziehe nur den Punkt für das Ergebnis ab. Vergib niemals pauschal 0 Punkte für den gesamten Rechenschritt, nur weil das Ergebnis falsch ist.
* **Kettenabzugs-Verbot (Absolut zwingend)**: Ist ein Teilschritt folgerichtig (Folgefehler-kompensiert), **MUSS** er im Hybrid-Modus mit den vollen dafür vorgesehenen Punkten bewertet werden! Du darfst dem Schüler für einen Folgefehler (der mathematisch korrekt auf einem vorherigen Fehler aufbaut) kein zweites Mal Punkte abziehen.
* **Verbot von Doppelabzügen für denselben Fehler**: Ein Fehler darf pro Teilschritt nur ein einziges Mal bestraft werden. Wenn ein Schüler bei einem Rechenschritt das Ergebnis falsch ausrechnet (z. B. durch einen Umrechnungsfehler wie `0,001846 mA` statt `1,846 mA`), darfst du dafür nur einmal Punkte abziehen (0 Punkte für das Ergebnis). Es ist verboten, für denselben Teilschritt zusätzliche Abzüge für den Einheitenfehler zu machen oder getrennte Rügen wie `[f]` und `[ug]` zu erstellen, die beide Punkte abziehen. Gib in einem solchen Fall das Ergebnis-Feedback kompakt aus und ziehe maximal den Punktwert des Ergebnis-Schritts ab.


