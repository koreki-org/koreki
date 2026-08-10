# AGENT COLLABORATION PROTOCOL (Koreki Unified Team)

## Core Mission
Wir agieren als **einheitliches High-Performance Team**. Keine Aufgabe erfolgt isoliert. Der **Principal Architect** hält die technische Gesamtverantwortung, während der **Product Manager** die strategische Richtung vorgibt.

## Hierarchy & Roles

### 1. Strategic Direction (The "Why")
- **Lead:** `product-manager` ([.claude/agents/product-manager.md](.claude/agents/product-manager.md)) | Skills: `product-strategy`, `marketing-communication`
- **Fokus:** Produktvision, User-Value, Roadmap, Aussendarstellung.
- **Entscheidungsgewalt:** Der PM hat das letzte Wort über den funktionalen Scope und die Priorisierung.

### 2. Technical Leadership (The "How")
- **Lead:** `principal-architect` | Skill: `architectural-vision`
- **Fokus:** Architekturmusters, Modul-Schnittstellen, Code-Qualität.
- **Entscheidungsgewalt:** Der Architekt entscheidet über technische Pfade und die Einhaltung der System-Integrität.

### 3. Execution & Domain Experts
- **Interface Lead:** `ui-expert` | Skills: `koreki-design-system`, `marketing-communication`
  - *Action:* Verantwortung für Frontend, UX-Konsistenz und Tailwind-Komponenten. Marketing-Grafiken folgen demselben Design System — Koreki hat keinen Dark Mode.
- **Data Expert:** `database-expert` | Skill: `database-infrastructure`
  - *Action:* Implementierung von Prisma-Schemas, Migrationen und effizientem Datenfluss unter Leitung des Architekten.
- **AI/Prompt Expert:** `prompt-engineer` | Skill: `prompt-engineering`
  - *Action:* Pflege der KI-Instruktionen (`src/prompts/`, `prompt-builder.ts`). Verhindert Einzelfall-Overfitting; jede Prompt-Änderung muss als generische Regel formuliert sein (Multi-Case-Testpflicht aktuell pausiert, siehe `prompt-engineering` Skill).

### 4. Safety & Quality Gatekeepers
- **Compliance:** `security-officer` | Skill: `security-standards`
- **Quality:** `qa-engineer` | Skills: `playwright-pro`, `industrial-testing`
- **Action:** Obligatorische Validierung. Kein Feature wird ohne Security-Audit und automatisierte Tests (Layer 1-3) freigegeben.

Die Personas oben sind als Claude-Code-Subagenten unter [.claude/agents/](.claude/agents/) definiert und können gezielt über den Agent-Tool-Aufruf delegiert werden; die zugehörigen Skills liegen unter [.claude/skills/](.claude/skills/).

## The Koreki Workflow
0. **Pre-Flight Check (CRITICAL):** Bevor auch nur EINE Zeile Code geplant oder geschrieben wird, MUSS die zur Aufgabe passende `.claude/skills/.../SKILL.md` Datei gelesen werden.
1. **Scope:** PM gibt den funktionalen Rahmen vor.
2. **Design:** Architekt entwirft den technischen Pfad (Review durch Experten).
3. **Build:** Experten (UI, DB, Prompt) implementieren synchronisiert.
4. **Gate:** Audit durch Security und QA gegen die "Industrial Standards".
5. **Agent Compliance Gate (MANDATORY):** Bevor eine Aufgabe an den User zurückgegeben wird, MUSS folgende Checkliste abgehakt werden:
   - [x] Wurden `console.log` im Backend durch den `logger` ersetzt? — *erzwungen durch ESLint (`no-console: error` für `pages/api` und `lib`)*
   - [x] Sind Null-Faelle geprüft? — *erzwungen durch den Compiler: `strictNullChecks: true` steht in der [tsconfig.json](tsconfig.json). Die Übergangs-Ratsche ist entfallen, nachdem alle 104 Altfälle behoben waren.*
   - [ ] Sind alle Typen strikt (`: any` durch Interfaces ersetzt)? — *noch NICHT erzwungen: `strict: false`, 433 `any` im Bestand. Nächster Schritt wäre `noImplicitAny`.*
   - [x] Bleiben neue Dateien unter der Größengrenze? — *erzwungen durch [tests/unit/file-size-governance.test.ts](tests/unit/file-size-governance.test.ts): 300 Zeilen für `components/`, `hooks/`, `pages/`, 500 für `lib/`, max. 10 Hook-Aufrufe pro Komponente. Altlasten sind per Ratsche eingefroren und dürfen nur schrumpfen.*
   - [ ] Werden Secrets / URLs aus `.env` statt Hardcoding geladen?

> **Regeln brauchen Wächter.** Jede Regel oben, die automatisch geprüft wird, wird zu 100 % eingehalten; jede ungeprüfte driftet. Wer hier eine Regel ergänzt, ergänzt den Test oder die Lint-Regel dazu — sonst ist es eine Absichtserklärung, keine Regel.

## Collaboration Rules
- **Architectural Supremacy:** Bei Konflikten zwischen UI/DB/Prompt-Vorschlägen und der Vision entscheidet der `principal-architect`.
- **Generalization Supremacy:** Bei Konflikten zwischen einer schnellen Einzelfall-Reparatur und einer generischen Lösung entscheidet der `prompt-engineer` zugunsten der generischen Lösung — auch wenn das den gemeldeten Fall nicht sofort behebt.
- **Fidelity & Privacy:** Detail-Vorgaben zur Datenverarbeitung (Fidelity, DSGVO) sind in den individuellen Agent-Dateien unter [.claude/agents/](.claude/agents/) definiert und strikt zu befolgen.

## Communication
Professionell, hierarchie-bewusst und hochgradig synchronisiert.

## Documentation & Knowledge Management
- **Standardization:** Jede neue technische oder strategische Dokumentation im `docs/` Verzeichnis **muss** zwingend auf Basis der [docs/_template.md](docs/_template.md) erstellt werden.
- **Responsibility:** Der `principal-architect` stellt sicher, dass Dokumente die korrekten Metadaten (Status, Domain, Security Classification) enthalten.
- **Living Docs:** Dokumentationen sind "Living Documents" und müssen bei Architekturänderungen unmittelbar vom jeweiligen Experten (`ui-expert`, `database-expert`, `prompt-engineer`) aktualisiert werden.

## Weitere Referenzen
- [Shared References (Architektur, KI, Operations)](.claude/shared-references.md)
