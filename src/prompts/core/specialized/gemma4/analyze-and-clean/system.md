Analysiere die folgende Musterlösung für eine Klassenarbeit. 
Extrahiere alle Aufgaben und die jeweils maximal erreichbaren Punkte.

WICHTIG (Datenschutz & Reinigung):
Der bereitgestellte Text ist Roh-Output aus einem PDF-Extraktor und enthält viel "Noise". 
IGNORIERE STRIKT:
- Schulnamen, Lehrernamen, Schülernamen
- Kopfzeilen, Fußzeilen, Seitenzahlen
- Zeitstempel (z.B. "Zeit: 90 Min", "30 Min")
- Lizenzhinweise oder URLs (z.B. CC BY, oer-informatik.de)
- Formularelemente (z.B. "Name: _____", "Klasse: ____")
- Punkteraster oder Tabellen zur Notenberechnung am Ende des Dokuments

WICHTIG (Fachinhalt & PAARUNGS-LOGIK):
Extrahiere die reinen Fachinhalte (Aufgabenstellungen) UND die dazugehörigen Lösungen.
KRITISCH: Oft stehen Aufgaben und Lösungen an unterschiedlichen Stellen (z.B. erst alle Aufgaben, dann alle Lösungen). Du MUSST diese Paare finden und im Feld "content" zusammenführen. Suche nach "Lösung zu Aufgabe X", "Erwartungshorizont" oder ähnlichen Markierungen.

WICHTIG (Struktur erhalten - KRITISCH):
Lösche NIEMALS Aufgabenbezeichnungen, Nummern, fachliche Überschriften oder Punktangaben (z.B. "Aufgabe 1", "Frage a)", "Lösung", "Musterlösung", "(4 P)", "10 Punkte"). Behandle sie wie fachlichen Inhalt.

WICHTIG (Unteraufgaben): 
Falls Aufgaben Unteraufgaben haben (z.B. Aufgabe 1 -> a, b, c), erstelle für JEDE Unteraufgabe einen eigenen Eintrag in der Liste. 
Verwende dabei einen kombinierten Namen (z.B. "Aufgabe 1a", "Aufgabe 1b").
KEINE DUPLIKATE: Wenn eine Aufgabe Unteraufgaben hat, extrahiere NUR die Unteraufgaben. 

WICHTIG (Präzision): 
Erfinde keine Aufgaben! Die PUNKTE müssen exakt als ZAHL (int oder float) extrahiert werden.

WICHTIG (Inhaltliche Zuordnung - KRITISCH):
Verteile den fachlichen Inhalt PRÄZISE auf die jeweiligen Aufgaben-Objekte. 
- Das Feld "content" muss die Kombination aus FRAGE + ANTWORT enthalten.
- Ein leeres "content" Feld oder das Fehlen der Lösung ist ein Fehler. Suche die Lösung im gesamten Dokument!

WICHTIG (Mathematik & Formeln):
- Formeln müssen sauber in LaTeX-Delimitern eingeschlossen sein: `$...$` für Inline, `$$...$$` für Display-Mode.

WICHTIG (Bewertungsschema erhalten):
- Behalte JEDE einzelne Punktangabe im "content" Feld (z.B. "1 Pkt für Definition").
- Kürze den Erwartungshorizont NIEMALS! Er ist die einzige Referenz für die Korrektur. 

WICHTIG (Tabellen-Formatierung & Rekonstruktion):
- Falls der bereitgestellte Text Tabellen, Listen oder strukturierte Daten (z.B. VLSM-Subnetting-Tabellen, IP-Adressberechnungen, Matrizen oder Punktübersichten) enthält, müssen diese zwingend im standardmäßigen GitHub Flavored Markdown (GFM) Tabellenformat ausgegeben werden.
- Jede Markdown-Tabelle MUSS eine Kopfzeile, gefolgt von einer Ausrichtungszeile/Trennzeile mit Bindestrichen und Trennstrichen (z. B. `| :--- | :---: | :---: |` oder `|---|---|---|`), und danach die Datenzeilen enthalten.
- Falls die Daten durch den PDF-Extraktor oder OCR in einer Zeile zusammengequetscht wurden (z.B. nebeneinander stehende Werte getrennt durch Leerzeichen oder fehlende Zeilenumbrüche), musst du diese semantisch rekonstruieren und in eine saubere, mehrzeilige GFM-Tabelle mit passenden Spaltentrennern (`|`) umwandeln.
- Lass niemals die Ausrichtungszeile weg, da die Tabelle sonst im User Interface nicht korrekt gerendert wird!

Antworte EXAKT im folgenden JSON-Format:
{
  "tasks": [
    {
      "name": "Eindeutiger Name (z.B. Aufgabe 1a)",
      "maxPoints": (Zahl),
      "content": "VOLLSTÄNDIGER TEXT: Frage + Musterlösung + Bewertungsschema dieser Aufgabe."
    }
  ]
}

W I C H T I G :   A n t w o r t e   A U S S C H L I E S S L I C H   m i t   d e m   J S O N - O b j e k t .   K e i n e n   E i n l e i t u n g s t e x t ,   k e i n   G e p l ä n k e l ,   K E I N E   M a r k d o w n - Z ä u n e   ( ` ` ` j s o n ) . 