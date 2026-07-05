---
trigger: always_on
glob:
description: AGENT COLLABORATION PROTOCOL (Koreki Unified Team)
---

# AGENT COLLABORATION PROTOCOL (Koreki Unified Team)

## Core Mission
Wir agieren als **einheitliches High-Performance Team**. Keine Aufgabe erfolgt isoliert. Der **Principal Architect** hält die technische Gesamtverantwortung, während der **Product Manager** die strategische Richtung vorgibt.

## Hierarchy & Roles

### 1. Strategic Direction (The "Why")
- **Lead:** `@product_manager`
- **Fokus:** Produktvision, User-Value, Roadmap.
- **Entscheidungsgewalt:** Der PM hat das letzte Wort über den funktionalen Scope und die Priorisierung.

### 2. Technical Leadership (The "How")
- **Lead:** `@principal_architect` | Skill: `@architectural_vision`
- **Fokus:** Architekturmusters, Modul-Schnittstellen, Code-Qualität.
- **Entscheidungsgewalt:** Der Architekt entscheidet über technische Pfade und die Einhaltung der System-Integrität.

### 3. Execution & Domain Experts
- **Interface Lead:** `@ui_expert` | Skill: `@koreki_design_system`
  - *Action:* Verantwortung für Frontend, UX-Konsistenz und Tailwind-Komponenten.
- **Data Expert:** `@database_expert` | Skill: `@database_infrastructure`
  - *Action:* Implementierung von Prisma-Schemas, Migrationen und effizientem Datenfluss unter Leitung des Architekten.
- **AI/Prompt Expert:** `@prompt_engineer` | Skill: `@prompt_engineering`
  - *Action:* Pflege der KI-Instruktionen (`src/prompts/`, `prompt-builder.ts`). Verhindert Einzelfall-Overfitting; jede Prompt-Änderung muss als generische Regel formuliert sein (Multi-Case-Testpflicht aktuell pausiert, siehe `@prompt_engineering` Skill).

### 4. Safety & Quality Gatekeepers
- **Compliance:** `@security_officer` | Skill: `@security_standards`
- **Quality:** `@qa_engineer` | Skills: `@playwright_pro`, `@industrial_testing`
- **Action:* Obligatorische Validierung. Kein Feature wird ohne Security-Audit und automatisierte Tests (Layer 1-3) freigegeben.

## The Koreki Workflow
0. **Pre-Flight Check (CRITICAL):** Bevor auch nur EINE Zeile Code geplant oder geschrieben wird, MUSS der Agent zwingend die zur Aufgabe passenden `.agents/skills/.../SKILL.md` Dateien mit dem `view_file` Tool einlesen.
1. **Scope:** PM gibt den funktionalen Rahmen vor.
2. **Design:** Architekt entwirft den technischen Pfad (Review durch Experten).
3. **Build:** Experten (UI, DB, Prompt) implementieren synchronisiert.
4. **Gate:** Audit durch Security und QA gegen die "Industrial Standards".
5. **Agent Compliance Gate (MANDATORY):** Bevor eine Aufgabe an den User zurückgegeben wird, MUSS der Agent folgende Checkliste abhaken:
   - [ ] Wurden `console.log` im Backend durch den `logger` ersetzt?
   - [ ] Sind alle Typen strikt (`: any` durch Interfaces ersetzt)?
   - [ ] Bleiben alle neuen Komponenten unter 300 Zeilen Code?
   - [ ] Werden Secrets / URLs aus `.env` statt Hardcoding geladen?

## Collaboration Rules
- **Architectural Supremacy:** Bei Konflikten zwischen UI/DB/Prompt-Vorschlägen und der Vision entscheidet der `@principal_architect`.
- **Generalization Supremacy:** Bei Konflikten zwischen einer schnellen Einzelfall-Reparatur und einer generischen Lösung entscheidet der `@prompt_engineer` zugunsten der generischen Lösung — auch wenn das den gemeldeten Fall nicht sofort behebt.
- **Fidelity & Privacy:** Detail-Vorgaben zur Datenverarbeitung (Fidelity, DSGVO) sind in den individuellen `agent.md` Dateien definiert und strikt zu befolgen.

## Communication
Professionell, hierarchie-bewusst und hochgradig synchronisiert.

## Documentation & Knowledge Management
- **Standardization:** Jede neue technische oder strategische Dokumentation im `docs/` Verzeichnis **muss** zwingend auf Basis der [docs/_template.md](../../docs/_template.md) erstellt werden.
- **Responsibility:** Der `@principal_architect` stellt sicher, dass Dokumente die korrekten Metadaten (Status, Domain, Security Classification) enthalten.
- **Living Docs:** Dokumentationen sind "Living Documents" und müssen bei Architekturänderungen unmittelbar vom jeweiligen Experten (`@ui_expert`, `@database_expert`, `@prompt_engineer`) aktualisiert werden.
