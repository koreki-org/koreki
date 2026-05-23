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

Extrahiere ausschließlich die reinen Fachinhalte (Aufgabenstellungen) und die dazugehörigen Lösungen.

WICHTIG (Struktur erhalten - KRITISCH):
Lösche NIEMALS Aufgabenbezeichnungen, Nummern, fachliche Überschriften oder Punktangaben (z.B. "Aufgabe 1", "Frage a)", "Lösung", "Musterlösung", "(4 P)", "10 Punkte"). Diese sind für die Übersichtlichkeit und Struktur des Dokuments absolut essentiell. Behandle sie wie fachlichen Inhalt.

WICHTIG (Unteraufgaben): 
Falls Aufgaben Unteraufgaben haben (z.B. Aufgabe 1 -> a, b, c), erstelle für JEDE Unteraufgabe einen eigenen Eintrag in der Liste. 
Verwende dabei einen kombinierten Namen, damit die Zuordnung klar bleibt (z.B. "Aufgabe 1a", "Aufgabe 1b").
WICHTIG (Keine Duplikate): Wenn eine Aufgabe Unteraufgaben hat, extrahiere NUR die Unteraufgaben. Extrahiere NICHT die übergeordnete Aufgabe (z.B. "Aufgabe 1"), da dies sonst zu doppelten Punkten führt.
NIEMALS ZUSAMMENFASSEN: Fasse niemals mehrere Teilaufgaben oder Punkteangaben (z.B. 1a und 1b) zu einer gemeinsamen Aufgabe zusammen, selbst wenn sie ähnliche Inhalte haben. Jede bepunktete Einheit muss ein eigenes Objekt sein.

WICHTIG (Präzision): Erfinde unter keinen Umständen Aufgaben! Wenn der Text keine erkennbaren Aufgaben oder Punkte enthält, oder leer ist, gib einfach ein leeres Array für "tasks" zurück.
Die PUNKTE müssen exakt als ZAHL (int oder float) extrahiert werden, keine Strings!

WICHTIG (Inhaltliche Zuordnung - KRITISCH):
Verteile den fachlichen Inhalt der Musterlösung PRÄZISE auf die jeweiligen Aufgaben-Objekte. 
- Das Feld "content" darf NIEMALS den gesamten Text des Dokuments enthalten, sondern NUR den Text, der fachlich zu dieser spezifischen Aufgabe gehört.
- Jede Aufgabe muss ihren eigenen Lösungs-Inhalt im Feld "content" haben. 
- Wenn eine Aufgabe Unteraufgaben hat, teile den Text entsprechend auf die Unteraufgaben auf.
- Ein leeres "content" Feld bei einer Aufgabe ist ein Fehler, wenn im Gesamtdokument eine Lösung dafür existiert.

WICHTIG (Bewertungsschema erhalten):
- Behalte JEDE einzelne Punktangabe im "content" Feld (z.B. "1 Pkt für Definition", "2 Pkt für Beispiel").
- Kürze den Erwartungshorizont NIEMALS! Er ist die einzige Referenz für die Korrektur. 
- Falls im OCR-Text Tabellen oder Listen mit Teilpunkten vorkommen, müssen diese im Feld "content" exakt so wiedergegeben werden.

WICHTIG (Tabellen-Formatierung & Rekonstruktion):
- Falls der bereitgestellte Text Tabellen, Listen oder strukturierte Daten (z.B. VLSM-Subnetting-Tabellen, IP-Adressberechnungen, Matrizen oder Punktübersichten) enthält, müssen diese zwingend im standardmäßigen GitHub Flavored Markdown (GFM) Tabellenformat ausgegeben werden.
- Jede Markdown-Tabelle MUSS eine Kopfzeile, gefolgt von einer Ausrichtungszeile/Trennzeile mit Bindestrichen und Trennstrichen (z. B. `| :--- | :---: | :---: |` oder `|---|---|---|`), und danach die Datenzeilen enthalten.
- Falls die Daten durch den PDF-Extraktor oder OCR in einer Zeile zusammengequetscht wurden (z.B. nebeneinander stehende Werte getrennt durch Leerzeichen oder fehlende Zeilenumbrüche), musst du diese semantisch rekonstruieren und in eine saubere, mehrzeilige GFM-Tabelle mit passenden Spaltentrennern (`|`) umwandeln.
- Lass niemals die Ausrichtungszeile weg, da die Tabelle sonst im User Interface nicht korrekt gerendert wird!

WICHTIG (Automatische Typerkennung & Bewertungsgraphen - NEU):
Prüfe für jede extrahierte Aufgabe, ob es sich um eine hochgradig mathematisch-strukturierte oder deterministische Aufgabe handelt (insbesondere VLSM/Subnetting-Tabellen, IP-Adressberechnungen, etc.).
- Falls die Aufgabe eine VLSM-Subnetting-Tabelle oder -Berechnung ist, setze "taskType" auf "vlsm" und erstelle ein "gradingGraph" Objekt im JSON.
- Falls es eine normale Freitextaufgabe oder andere nicht-mathematische Aufgabe ist, setze "taskType" auf "general" (und setze "gradingGraph" auf null).

Struktur eines "gradingGraph" für "vlsm":
Das "gradingGraph" Objekt enthält:
- "taskId": Entspricht dem Namen der Aufgabe (z.B. "Aufgabe 1a")
- "discipline": "computer-science-networking"
- "variables": Ein Array von Variablen-Definitionen. Jede Variable definiert einen Rechenschritt oder eine Tabellenzelle.
  - "id": Eindeutiger Bezeichner (z.B. "subnetA_hosts", "subnetA_netId", "subnetA_mask", "subnetA_broadcast", "subnetB_hosts", "subnetB_mask", "subnetB_netId", "subnetB_broadcast")
  - "type": "input" (für Vorgaben wie Hosts-Anzahl oder Start-Netz) oder "formula" (für berechnete Werte)
  - "defaultValue": (nur bei "input") Der Vorgabewert aus der Musterlösung (z.B. 50 oder "192.168.1.0")
  - "expression": (nur bei "formula") Die Berechnungsformel. Unterstützte Ausdrücke:
    - "network.calculateMask(hosts_variable)"
    - "network.calculateBroadcast(netId_variable, mask_variable)"
    - "network.calculateNetId(prevNetId_variable, prevMask_variable)"
    - "network.calculateFirstHost(netId_variable)" (Erste nutzbare IP)
    - "network.calculateGateway(netId_variable, mask_variable)" (Gateway / Höchste nutzbare IP)
    - "network.calculateLastHost(netId_variable, mask_variable)" (Letzte nutzbare IP)
  - "validationType": "exact"
  - "maxPoints": Die Punkte, die auf diesen einzelnen Teilschritt entfallen (Standard ist 1).

Antworte EXAKT im folgenden JSON-Format:
{
  "tasks": [
    {
      "name": "Eindeutiger Name (z.B. Aufgabe 1a)",
      "maxPoints": (Zahl),
      "content": "NUR der fachliche Inhalt (Frage & Antwort) dieser spezifischen Aufgabe.",
      "taskType": "general" | "vlsm",
      "gradingGraph": null | {
        "taskId": "Aufgabe 1a",
        "discipline": "computer-science-networking",
        "variables": [
          { "id": "subnetA_hosts", "type": "input", "defaultValue": 50, "validationType": "exact", "maxPoints": 1 },
          { "id": "subnetA_netId", "type": "input", "defaultValue": "192.168.1.0", "validationType": "exact", "maxPoints": 1 },
          { "id": "subnetA_mask", "type": "formula", "expression": "network.calculateMask(subnetA_hosts)", "validationType": "exact", "maxPoints": 1 },
          { "id": "subnetA_broadcast", "type": "formula", "expression": "network.calculateBroadcast(subnetA_netId, subnetA_mask)", "validationType": "exact", "maxPoints": 1 }
        ]
      }
    }
  ]
}

