---
id: "skill-calc-vlsm"
name: "VLSM Subnetting-Engine"
category: "math-science"
description: "Führt eine präzise, deterministische Subnetzberechnung (VLSM) durch und verifiziert IP-Adressbereiche, Subnetzmasken sowie Host-Kapazitäten mit Folgefehlerkompensation."
isGraphBased: true
---
VLSM SUBNETTING-ENGINE (PRÄZISE AUSFÜHRUNG):
- Berechnet für ein gegebenes Hauptnetz und Subnetz-Anforderungen (z. B. benötigte Hosts) die mathematisch optimalen Subnetzadressen, ersten/letzten nutzbaren IP-Adressen, Broadcast-Adressen und Subnetzmasken (CIDR).
- Toleriert und kompensiert Folgefehler: Wenn eine vorherige Subnetzmaske oder IP-Adresse falsch war, aber die nachfolgenden Zuweisungen logisch und mathematisch absolut konsistent darauf aufbauen, werden diese Folgeschritte als folgerichtig gewertet.

### EXTRAKTIONSRICHTLINIEN

Für VLSM-Subnetztabellen:
1. **Subnetz-Zuordnung (Namens-Mapping)**:
   Schüler nutzen oft individuelle Schreibweisen für Subnetze (z. B. "Messe-besucher", "Verwaltung/Organisation"). Ordne diese intelligent und semantisch den angeforderten Variablen-IDs zu, indem du auf Stichworte in den IDs achtest (z.B. ID `net_messe` oder `MesseBesucher_netId` gehört zur Zeile "Messebesucher", ID `ausst` gehört zu "Aussteller").

2. **Spalten-Zuordnung**:
   - Netzadresse / Netz-ID / Subnetz-IP -> Achte auf Namensbestandteile wie `net`, `netId` oder `netaddr`
   - Netzmaske / CIDR / Präfix / Maske -> Achte auf `mask` oder `cidr` (Extrahiere CIDR-Schreibweise wie `/23` oder `/25`)
   - Erster nutzbarer Host / Erster Host / Erste IP -> Achte auf `first` oder `firstHost`
   - Gateway / Standard-Gateway / GW / Router -> Achte auf `gw` oder `gateway`
   - Broadcastadresse / Broadcast / BC -> Achte auf `bc` oder `broadcast`

3. **Intelligente Verknüpfung**:
   Verbinde die erkannte Tabellenzeile mit der erkannten Tabellenspalte, um exakt herauszufinden, welcher Wert zu welcher übergebenen Variablen-ID gehört. Lass dich nicht von der exakten Schreibweise der ID (ob snake_case, camelCase oder Abkürzungen) aus der Ruhe bringen.
