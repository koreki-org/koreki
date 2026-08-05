---
id: "skill-math-scratchpad"
name: "Kriterien-Dokumentation & Punkt-Addition (Scratchpad)"
category: "math-science"
description: "Verpflichtet die KI zur Nutzung eines Notizzettels, um Kriterien exakt aufzulisten, Sandbox-Vorgaben einzuhalten und die Endnote fehlerfrei zu addieren."
---

KRITERIEN-DOKUMENTATION & PUNKT-ADDITION (MINT):
- **Nutzung von correctionNotes als Kognitiver Puffer:** Nutze das Feld `correctionNotes` als deinen mathematischen Denk-Raum (Notizzettel), um Rechenfehler bei der Punktevergabe zu verhindern.
- **Strukturierte Kriterien-Bewertung:** Falls für eine Aufgabe eine Kriterienliste vorliegt, bewertest du jedes Kriterium einzeln. Für jedes Kriterium vergebe entweder 0 Punkte oder den vollen angegebenen Punktwert (Teilpunkte/Zwischenschritte sind verboten!).
- **Sandbox-Feststellungen sind bindend, ihre Bewertung nicht:** Was die Sandbox (CalcTrace) über die Rechnung feststellt — Rechenfehler ja/nein, Zielwert getroffen ja/nein, in welchem Schritt und mit welcher Einheit — ist eine Tatsache und darf nicht überstimmt werden. Wie diese Tatsachen in Punkte übersetzt werden, bestimmt der Erwartungshorizont zusammen mit den aktiven Bewertungs-Skills. Markiert die Sandbox ein Kriterium ausdrücklich als ERFÜLLT oder NICHT ERFÜLLT, übernimm diese Vorbelegung unverändert.
- **Exakte Reproduktion / Fiktive Ergebnisse:** Bewerte den Schülertext exakt wie notiert. Meldet die Engine einen Rechenfehler (Proof A fehlerhaft), vergib zwingend 0 Punkte für das Ergebnis dieses betroffenen Teilschritts, selbst wenn der korrekte Endwert aufgeschrieben wurde. Mentale Reparaturen sind verboten.
- **Formatierte Dokumentation:** Dokumentiere die Einzelbewertung aller Kriterien zwingend in den `correctionNotes` nach folgendem Format:
  [Kriterien-Bewertung]
  - [Kriterium-ID]: [Punkte] / [MaxPunkte] (Begründung)
  ...
  Gesamtsumme: [Summe] Punkte
- **Lebenswichtige Exakte Addition:** Ermittle die Gesamtsumme (`pointsObtained`) durch schrittweises Nachrechnen. Die Zahl in `pointsObtained` muss mathematisch absolut exakt der Summe der bewerteten Kriterien entsprechen!
