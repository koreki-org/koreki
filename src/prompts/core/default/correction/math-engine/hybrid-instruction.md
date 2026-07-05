<engine_evaluation_logic>

### PFLICHT-CHECKLISTE IM SCHMIERZETTEL (correctionNotes)

Führe in den `correctionNotes` zwingend diese Checkliste durch, BEVOR du Punkte vergibst:

**Schritt 1 — Folgefehler-Prüfung (OBERSTE PRIORITÄT, zuerst prüfen!):**
Lese den CalcTrace-Block:
- Proof A = ✓ ("mathematisch in sich vollkommen fehlerfrei") UND Proof B = ✗ (Endziel nicht erreicht)?
  → JA: **FOLGEFEHLER erkannt.** Notiere: "Folgefehler: Proof A ✓ / Proof B ✗ → Ergebnis-Punkt wird ZWINGEND vergeben."
  → Der Teilpunkt für "korrekte Berechnung / Ergebnis" aus dem Erwartungshorizont MUSS vergeben werden. OHNE AUSNAHME.
  → Begründung: Der Schüler hat seine eigenen (falschen) Eingabewerte fehlerfrei durchgerechnet. Das ist die mathematische Transferleistung, die bewertet wird.

**Schritt 2 — Teilschritte einzeln abgleichen:**
Gehe jeden Teilschritt des Erwartungshorizonts durch (z.B. "Formel = 1P, Einsetzen = 1P, Ergebnis = 1P"):
- Formel-Schritt: Hat der Schüler eine abstrakte Formel mit korrekten Variablen aufgeschrieben? → ja/nein (xP)
- Einsetz-Schritt: Hat der Schüler die korrekten Zahlenwerte eingesetzt? → ja/nein (xP)
- Ergebnis-Schritt: Wenn Folgefehler erkannt (Schritt 1) → **automatisch ja (xP)**, egal ob der Zahlenwert vom Sollwert abweicht.

**Schritt 3 — Punkte addieren.**

---

### Bewertungsregeln pro Teilschritt

**1. Der Formel-Schritt**
- Vergib den Punkt, wenn der Schüler eine abstrakte Formel mit korrekten Variablen aufgeschrieben hat (z.B. `F = m × a`).
- Rein eingesetzte Zahlenwerte (z.B. `50 × 9.81`) erfüllen den Formel-Schritt nicht.
- Kompakte Schreibweise (z.B. `F = m × a = 50 × 9.81 = 490.5`) ist akzeptiert — Formel-Schritt gilt als erfüllt.
- Semantische Toleranz: Akzeptiere gleichwertige Symbole (z.B. `W = P × t` ≡ `Energie = Leistung × Zeit`).
- Falsche Variable = 0 Punkte: `F = m × v` statt `F = m × a` ist ein physikalischer Fehler (v = Geschwindigkeit ≠ a = Beschleunigung).

**2. Der Einsetz-Schritt**
- Wenn die CalcTrace-Engine eine Eingabevariable als außerhalb der Toleranz markiert → Einsetz-Schritt nicht erfüllt (0P).
- Vorsatzzeichen-Kulanz: Keine explizite Umrechnung von Einheiten fordern, wenn die Rechnung mathematisch aufgeht.
- OCR-Toleranz: Fehlende Multiplikationszeichen sind kein Fehler.

**3. Der Ergebnis-Schritt**
- Proof A ✓ + Proof B ✗ = **Folgefehler → Ergebnis-Punkt MUSS vergeben werden** (siehe Schritt 1 oben).
- Proof A ✓ + Proof B ⚠ (Einheiten-Fehler) = Der reine Zahlenwert stimmt, aber die Einheit ist falsch. **Formel- und Einsetz-Punkte bleiben zwingend erhalten!** Entziehe nur den Punkt für das Ergebnis/Einheit.
- Proof A ✗ (Rechenfehler in der Sandbox) = Keine Punkte für das Ergebnis, auch wenn der Zahlenwert zufällig stimmt.
- Verbot von Doppelabzügen: Ein Fehler darf pro Teilschritt nur einmal bestraft werden.

**4. Toleranz bei Einheiten & Umrechnungen (WICHTIG)**
- Bewerte Umrechnungen in physikalische SI-Basiseinheiten (z.B. `kJ` in `J` oder `mm` in `m`) NIEMALS als Fehler, wenn der Umrechnungsfaktor stimmt.
- Erfinde KEINE pädagogischen Fantasie-Regeln wie "Die Ausgangseinheit muss beibehalten werden".
- Bestrafe Einheiten-Fehler NUR dann, wenn der Schüler am Ende eine Zahl aufschreibt, aber die völlig falsche Dimension/Präfix dahinter notiert (z.B. `0.05` errechnet, aber `cm` statt `m` dahinter schreibt).
- **Abzugs-Regel bei Einheiten-Fehlern (⚠ Einheiten-Analyse):** Ein Einheiten-Fehler am Ende einer Rechnung betrifft AUSSCHLIESSLICH den "Ergebnis-Punkt" (oder einen expliziten "Einheiten-Punkt"). Die Teilpunkte für "Formel" und "Einsetzen" in diesem Teilschritt BLEIBEN ERHALTEN und dürfen unter keinen Umständen wegen der falschen Einheit abgezogen werden. Entziehe für einen Einheitenfehler maximal 1 Punkt (bzw. exakt die Punkte, die der Erwartungshorizont für das "Ergebnis" vorsieht).

---

### Konkretes Beispiel (Folgefehler)

Erwartungshorizont: 1P Formel (F=m×a), 1P Einsetzen (50kg×9.81), 1P Ergebnis (490.5N)
Schüler schreibt: `F = m × v = 5 × 9.81 = 49.05`
CalcTrace: Proof A = ✓, Proof B = ✗

correctionNotes-Schmierzettel:
- Folgefehler-Check: Proof A ✓, Proof B ✗ → FOLGEFEHLER. Ergebnis-Punkt wird vergeben.
- Formel: Variable v statt a → FALSCH (0P)
- Einsetzen: 5kg statt 50kg → FALSCH (0P)
- Ergebnis: Folgefehler erkannt → 5 × 9.81 = 49.05 ist mathematisch korrekt → RICHTIG (1P)
- Gesamt: 0 + 0 + 1 = 1P

pointsObtained: 1
feedback: "[f] Die Variable v steht für Geschwindigkeit, nicht für Beschleunigung — korrekt wäre a. [f] Die Masse wurde falsch eingesetzt (5 kg statt 50 kg). [r] Das Durchrechnen mit den eigenen Werten war jedoch mathematisch fehlerfrei (5 × 9.81 = 49.05)."

</engine_evaluation_logic>
