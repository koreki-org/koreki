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
Lösche NIEMALS Aufgabenbezeichnungen, Nummern, fachliche Überschriften oder Punktangaben (z.B. "Aufgabe 1", "Frage a)", "Lösung", "Musterlösung", "(4 P)", "10 Punkte"). Diese sind für die Übersichtlichkeit und Struktur des Dokuments absolut essentiell. Behandle sie wie fachlichen Inhalt.

WICHTIG (Silbentrennung am Zeilenende):
Ein am Zeilenende mit Bindestrich getrenntes Wort, das in der nächsten Zeile weitergeht, ist EIN Wort: Füge es ohne Bindestrich und Zeilenumbruch zusammen (z. B. "Blüten-" / "blätter" -> "Blütenblätter"). Der Strich bleibt, wenn ein Bindewort folgt ("Laub- und Nadelbäume", "Vor- bzw. Nachteile") oder wenn er zum Wort gehört ("E-Mail", "Ist-Zustand").

WICHTIG (Unteraufgaben): 
Falls Aufgaben Unteraufgaben haben (z.B. Aufgabe 1 -> a, b, c), erstelle für JEDE Unteraufgabe einen eigenen Eintrag in der Liste. 
Verwende dabei einen kombinierten Namen, damit die Zuordnung klar bleibt (z.B. "Aufgabe 1a", "Aufgabe 1b").
WICHTIG (Keine Duplikate): Wenn eine Aufgabe Unteraufgaben hat, extrahiere NUR die Unteraufgaben als Einträge in "tasks". Extrahiere die übergeordnete Aufgabe (z.B. "Aufgabe 1") NICHT als eigenen Eintrag in "tasks", da dies sonst zu doppelten Punkten führt. Ihr Text geht dadurch nicht verloren: Was zwischen ihrer Überschrift und der ersten Teilaufgabe steht, ist ihr Stamm (siehe unten).
NIEMALS ZUSAMMENFASSEN: Fasse niemals mehrere Teilaufgaben oder Punkteangaben (z.B. 1a und 1b) zu einer gemeinsamen Aufgabe zusammen, selbst wenn sie ähnliche Inhalte haben. Jede bepunktete Einheit muss ein eigenes Objekt sein.

WICHTIG (Präzision): Erfinde unter keinen Umständen Aufgaben! Wenn der Text keine erkennbaren Aufgaben oder Punkte enthält, oder leer ist, gib einfach ein leeres Array für "tasks" zurück.
Die PUNKTE müssen exakt als ZAHL (int oder float) extrahiert werden, keine Strings!

WICHTIG (Inhaltliche Zuordnung - KRITISCH):
Verteile den fachlichen Inhalt der Musterlösung PRÄZISE auf die jeweiligen Aufgaben-Objekte. 
- Das Feld "content" darf NIEMALS den gesamten Text des Dokuments enthalten, sondern NUR den Text, der fachlich zu dieser spezifischen Aufgabe gehört.
- Jede Aufgabe muss ihren eigenen Lösungs-Inhalt im Feld "content" haben. 
- Wenn eine Aufgabe Unteraufgaben hat, teile den Text entsprechend auf die Unteraufgaben auf.
- Ein leeres "content" Feld bei einer Aufgabe ist ein Fehler, wenn im Gesamtdokument eine Lösung dafür existiert.

WICHTIG (Gemeinsamer fachlicher Rahmen — Feld "context"):
Manche Dokumente enthalten fachlichen Text, der zu keiner einzelnen Aufgabe gehört, sondern die Ausgangslage für die ganze Arbeit beschreibt. Typische Formen: eine Szenario- oder Fallbeschreibung, ein übergreifender Arbeitsauftrag sowie Annahmen und Vereinfachungen, die für mehrere Hauptaufgaben gelten (z. B. "X wird vernachlässigt", "gehen Sie von Y aus").
- Solcher Text gehört in das Feld "context" auf oberster Ebene, NICHT in "tasks[].content".
- STRENGES KRITERIUM: In "context" gehört ausschließlich, worauf sich Aufgaben aus MINDESTENS ZWEI verschiedenen Hauptaufgaben stützen. Was nur die Teilaufgaben EINER Hauptaufgabe betrifft, ist deren Stamm (siehe unten). Alles, was nur eine einzige Aufgabe benötigt — auch Tabellen, Wertelisten, Abbildungen, Befehle und Vorgaben — bleibt vollständig im "content" genau dieser Aufgabe.
- SELBSTPRÜFUNG (verbindlich): Jede Aufgabe muss aus ihrem eigenen "content" zusammen mit dem Stamm ihrer Hauptaufgabe und dem "context" lösbar bleiben. Verweist eine Aufgabe auf ein Bezugsobjekt (z. B. "die Liste unten", "die folgende Tabelle", "die Abbildung", "der Befehl oben"), MUSS dieses Bezugsobjekt in einer dieser drei Stellen enthalten sein — im "content", wenn nur diese Aufgabe es braucht. Ein Verweis, der ins Leere zeigt, ist ein Fehler.
- IM ZWEIFEL gehört Text in die Aufgabe, nicht in den Rahmen.
- Nimm in "context" ausschließlich fachlich relevanten Rahmen auf. Formularfelder, Kopf- und Fußzeilen, Namens-, Datums- und Notenfelder gehören dort NICHT hinein — sie werden wie oben beschrieben ignoriert.
- Existiert kein solcher Rahmen, gib "context": "" zurück. Erfinde niemals einen.

WICHTIG (Stamm einer Hauptaufgabe — Felder "tasks[].hauptaufgabe" und "tasks[].stamm"):
Hat eine Hauptaufgabe Teilaufgaben, steht zwischen ihrer Überschrift und der ersten Teilaufgabe oft ein Text, der für alle ihre Teilaufgaben gilt: eine Ausgangslage, ein Szenario, ein Ziel, gegebene Werte, eine Tabelle, ein Befehl oder eine Vorgabe. Das ist der STAMM dieser Hauptaufgabe — auch dann, wenn er nur aus einem einzigen erzählenden Satz besteht.
- Jede Teilaufgabe nennt in "hauptaufgabe" die Bezeichnung ihrer Hauptaufgabe (z. B. "Aufgabe 3"), bei allen Teilaufgaben derselben Hauptaufgabe zeichengleich. Aufgaben ohne Teilaufgaben haben "hauptaufgabe": null.
- Die ERSTE Teilaufgabe einer Hauptaufgabe trägt in "stamm" den Text, der im Dokument zwischen der Überschrift der Hauptaufgabe und dem Beginn dieser ersten Teilaufgabe steht — wörtlich, vollständig, ohne Überschrift und ohne Punktangabe der Hauptaufgabe. Alle weiteren Teilaufgaben derselben Hauptaufgabe haben "stamm": "". So steht der Stamm genau einmal in der Ausgabe.
- Steht dort kein Text, ist "stamm" leer.
- Kopiere den Stamm NICHT zusätzlich in "content". Dort steht nur, was zu genau dieser Teilaufgabe gehört.
- Der Stamm enthält nur Aufgabentext. Lösungen und Punktangaben einzelner Teilaufgaben gehören in deren "content".
- Aufgabentext darf an keiner Stelle verloren gehen — er steht entweder im "context", in einem Stamm oder im "content" einer Aufgabe.

WICHTIG (Mathematik & Formeln):
- Falls die Musterlösung mathematische Formeln enthält, stelle sicher, dass diese sauber in LaTeX-Delimitern eingeschlossen sind.
- Nutze `$...$` für Inline-Formeln und `$$...$$` für freigestellte Formeln auf eigener Zeile.
- Erhalte die fachliche Korrektheit der LaTeX-Syntax (z.B. Brüche, Summen, Integrale).
- ACHTUNG (JSON-Maskierung & Delimiter): Da du ein JSON-Objekt ausgibst, musst du JEDEN Backslash vor LaTeX-Befehlen doppelt maskieren (z. B. `\\frac`, `\\text`, `\\Omega`, `\\alpha`) UND die Formeln zwingend in `$` bzw. `$$` einschließen.
  * FALSCH: `"content": "E = m \\times c^2 = 10,\\text{kg} \\times 90,\\frac{\\text{m}^2}{\\text{s}^2}"`
  * RICHTIG: `"content": "$E = m \\times c^2 = 10,\\text{kg} \\times 90,\\frac{\\text{m}^2}{\\text{s}^2}$"`
- ACHTUNG (Anführungszeichen): Gerade Anführungszeichen (") aus dem Dokument übernimmst du in "content" und "context" unverändert, maskierst sie im JSON-Wert aber als \" — sonst endet der Wert an dieser Stelle. Ersetze sie NICHT durch andere Zeichen.


WICHTIG (Tabellen-Formatierung & Rekonstruktion):
- Falls der bereitgestellte Text Tabellen, Listen oder strukturierte Daten (z.B. VLSM-Subnetting-Tabellen, IP-Adressberechnungen, Matrizen oder Punktübersichten) enthält, müssen diese zwingend im standardmäßigen GitHub Flavored Markdown (GFM) Tabellenformat ausgegeben werden.
- Jede Markdown-Tabelle MUSS eine Kopfzeile, gefolgt von einer Ausrichtungszeile/Trennzeile mit Bindestrichen und Trennstrichen (z. B. `| :--- | :---: | :---: |` oder `|---|---|---|`), und danach die Datenzeilen enthalten.
- Falls die Daten durch den PDF-Extraktor oder OCR in einer Zeile zusammengequetscht wurden (z.B. nebeneinander stehende Werte getrennt durch Leerzeichen oder fehlende Zeilenumbrüche), musst du diese semantisch rekonstruieren und in eine saubere, mehrzeilige GFM-Tabelle mit passenden Spaltentrennern (`|`) umwandeln.
- Lass niemals die Ausrichtungszeile weg, da die Tabelle sonst im User Interface nicht korrekt gerendert wird!

WICHTIG (Bewertungsschema erhalten):
- Behalte JEDE einzelne Punktangabe im "content" Feld (z.B. "1 Pkt für Definition", "2 Pkt für Beispiel").
- Kürze den Erwartungshorizont NIEMALS! Er ist die einzige Referenz für die Korrektur. 
- Falls im OCR-Text Tabellen oder Listen mit Teilpunkten vorkommen, müssen diese im Feld "content" exakt so wiedergegeben werden.

WICHTIG (Berechnungs-Struktur - suggestGraph):
- Setze "suggestGraph" auf true, wenn die Aufgabe mathematische, numerische oder physikalische Berechnungen, Formeln, Gleichungen, Rechenwege oder Graphen enthält (d.h. für PANG-Rechengraphen UND CalcTrace-Rechenketten). Setze dies für JEDE Rechenaufgabe zwingend auf true!
  * BEISPIEL FÜR TRUE: "Berechne den Strom I bei U=12V, R=4kOhm", "Berechne den Gesamtwiderstand", "Berechne den Prozentwert von 15% aus 200", "Bestimme das Subnetz für 192.168.1.0/24", "R_ges = R1 + R2 = 6.5kOhm", "Berechne a^2 + b^2".
- Setze "suggestGraph" auf false bei rein textbasierten Fragen, Beschreibungen, Definitionen oder Erklärungen, die keine mathematischen Berechnungen erfordern.
  * BEISPIEL FÜR FALSE: "Erkläre den Unterschied zwischen Reihen- und Parallelschaltung", "Was ist ein Widerstand?", "Nenne die Einheit der Stromstärke", "Beschreibe die Funktionsweise eines Gateways".
- Wenn "suggestGraph" auf true gesetzt wird, MUSS die dazugehörige Plugin-Domäne im Feld "predictedPluginDomain" vorausgewählt werden. Wähle dafür zwingend **einen** dieser Werte: [ {{ACTIVE_DOMAINS}} ]. Setze das Feld auf null, falls suggestGraph=false ist.
  * HINWEIS: Nutze "network" für Netzwerk-/Subnetz-Berechnungen und "math" für alle anderen Berechnungen und Formelaufgaben (wie Physik, Elektrotechnik, allgemeine Mathematik, Prozentrechnung).

Antworte EXAKT im folgenden JSON-Format:
{
  "context": "Gemeinsamer fachlicher Rahmen der ganzen Arbeit, oder \"\" wenn es keinen gibt.",
  "tasks": [
    {
      "name": "Eindeutiger Name (z.B. Aufgabe 1a)",
      "hauptaufgabe": "Bezeichnung der Hauptaufgabe (z.B. Aufgabe 1) oder null",
      "stamm": "Nur bei der ersten Teilaufgabe einer Hauptaufgabe: Text zwischen Überschrift der Hauptaufgabe und dieser Teilaufgabe. Sonst \"\".",
      "maxPoints": (Zahl),
      "content": "NUR der fachliche Inhalt (Frage & Antwort) dieser spezifischen Aufgabe.",
      "suggestGraph": (boolean),
      "predictedPluginDomain": "string" | null
    }
  ]
}

