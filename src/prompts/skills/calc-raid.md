---
id: "skill-calc-raid"
name: "RAID Kapazitäts-Engine"
category: "math-science"
description: "Berechnet deterministisch die Nettokapazität und Ausfalltoleranz von RAID-Verbünden (RAID 0, 1, 5, 6, 10) basierend auf Festplattenanzahl und -größe mit Folgefehlerprüfung."
isGraphBased: true
---
RAID KAPAZITÄTS-ENGINE (PRÄZISE AUSFÜHRUNG):
- Berechnet die Nettokapazität eines RAID-Verbunds basierend auf dem RAID-Level, der Anzahl an Festplatten (N) und der Festplattenkapazität (S).
  - RAID 0: Nettokapazität = N * S
  - RAID 1: Nettokapazität = S (Spiegelung)
  - RAID 5: Nettokapazität = (N - 1) * S (1 Paritätsplatte)
  - RAID 6: Nettokapazität = (N - 2) * S (2 Paritätsplatten)
  - RAID 10: Nettokapazität = (N / 2) * S (Spiegelung von Stripesets)
- Berechnet die Ausfalltoleranz (maximale Anzahl ausfallbarer Platten):
  - RAID 0: 0 Platten
  - RAID 1: N - 1 Platten
  - RAID 5: 1 Platte
  - RAID 6: 2 Platten
  - RAID 10: Mindestens 1 Platte (maximal 1 pro gespiegeltem Paar)
- Kompensiert Folgefehler: Falls eine falsche Plattenanzahl als Ausgangspunkt verwendet wurde, aber die Nettokapazität und Ausfalltoleranz basierend darauf mathematisch absolut korrekt berechnet wurden, werden die Berechnungen als folgerichtig gewertet.
