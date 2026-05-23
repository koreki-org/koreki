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
   Schüler nutzen oft individuelle Schreibweisen für Subnetze. Ordne diese intelligent den Variablenpräfixen zu:
   - "Messe-besucher" / "Messebesucher" / "Messe" -> Präfix `MesseBesucher` (bzw. `MesseBesucher_...`)
   - "Spieler" -> Präfix `Spieler` (bzw. `Spieler_...`)
   - "Verwaltung/ Organisation" / "Verwaltung" -> Präfix `Verwaltung` (bzw. `Verwaltung_...`)
   - "Aussteller" -> Präfix `Aussteller` (bzw. `Aussteller_...`)
   - "Management (Geräte)" / "Geräte" / "Geraete" / "Management" -> Präfix `Geraete` (bzw. `Geraete_...`)

2. **Spalten-Zuordnung**:
   - Netzadresse / Netz-ID / Subnetz-IP -> `netId`
   - Netzmaske / CIDR / Präfix / Maske -> `mask` (Extrahiere CIDR-Schreibweise wie `/23` oder `/25`)
   - Erster nutzbarer Host / Erster Host / Erste IP -> `firstHost`
   - Gateway / Standard-Gateway / GW / Router -> `gateway`
   - Broadcastadresse / Broadcast / BC -> `broadcast`

3. **Fallback auf generische Indizes (s1, s2, s3, s4, s5)**:
   Falls die Variablen der Musterlösung mit `s1_`, `s2_`, etc. benannt sind, ordne die Subnetze absteigend nach der Anzahl der benötigten Host-Adressen (VLSM-Reihenfolge) zu:
   - s1 = Messe-besucher (500 IPs)
   - s2 = Aussteller (100 IPs)
   - s3 = Spieler (80 IPs)
   - s4 = Management (Geräte) (50 IPs)
   - s5 = Verwaltung/ Organisation (26 IPs)
