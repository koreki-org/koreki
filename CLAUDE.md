# AGENT COLLABORATION PROTOCOL (Koreki Unified Team)

## Core Mission
Wir agieren als **einheitliches High-Performance Team**. Keine Aufgabe erfolgt isoliert. Der **Principal Architect** hält die technische Gesamtverantwortung, während der **Product Manager** die strategische Richtung vorgibt.

## Hierarchy & Roles

### 1. Strategic Direction (The "Why")
- **Lead:** `product-manager` ([.claude/agents/product-manager.md](.claude/agents/product-manager.md)) | Skills: `product-strategy`, `marketing-communication`, `eu-ai-act`
- **Fokus:** Produktvision, User-Value, Roadmap, Aussendarstellung, Einhaltung der KI-Verordnung.
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
   - [x] Sind Null-Faelle geprüft? — *erzwungen durch den Compiler: seit 18.08.2026 steht `strict: true` in der [tsconfig.json](tsconfig.json), das schließt `strictNullChecks` ein. Die Übergangs-Ratsche ist entfallen, nachdem alle 104 Altfälle behoben waren.*
   - [x] Entstehen keine **impliziten** `any`? — *erzwungen durch den Compiler: von `strict: true` abgedeckt. Keine Ratsche nötig, es gab nur 9 Altfälle.*
   - [x] Sind alle Typen strikt (**explizite** `: any` durch Interfaces ersetzt)? — *erzwungen durch [tests/unit/any-governance.test.ts](tests/unit/any-governance.test.ts): neue Dateien müssen frei von `any` sein, die Altfälle sind per Ratsche eingefroren und dürfen nur schrumpfen (Stand 18.08.2026: 227 in 95 Dateien, von ursprünglich 530 in 128). Kommentare werden vor dem Zählen entfernt.*
   - [x] Ist der im `catch` gefangene Wert geprüft, statt blind auf `.message` zuzugreifen? — *erzwungen durch den Compiler: von `strict: true` abgedeckt. Ohne diesen Schalter war ein blankes `catch (err)` trotz `noImplicitAny` ein unsichtbares `any` — die Ratsche oben konnte es nicht sehen, weil nichts dastand. Für den Zugriff auf den Wert gibt es [src/lib/error-message.ts](src/lib/error-message.ts): `toErrorMessage`, `isAbortError`, `isRateLimitError`, `toErrorCode`.*
   - [x] Bleiben neue Dateien unter der Größengrenze? — *erzwungen durch [tests/unit/file-size-governance.test.ts](tests/unit/file-size-governance.test.ts): 300 Zeilen für `components/`, `hooks/`, `pages/`, 500 für `lib/`, max. 10 Hook-Aufrufe pro Komponente. Altlasten sind per Ratsche eingefroren und dürfen nur schrumpfen.*
   - [x] Wurde nichts kopiert, statt es herauszuziehen? — *erzwungen durch [tests/unit/duplication-governance.test.ts](tests/unit/duplication-governance.test.ts): wortgleiche Blöcke ab 6 aussagekräftigen Zeilen fallen durch — zwischen zwei Dateien UND innerhalb einer einzelnen. Import-Zeilen zählen nicht mit. Altfälle sind per Ratsche eingefroren (Stand 18.08.2026: 51 Dateipaare, 11 Selbst-Doppelungen). Drei Produktionsfehler dieser Art waren der Anlass; der dritte lag innerhalb einer Datei und war für die erste Fassung des Wächters unsichtbar — siehe Kopf der Testdatei.*
   - [x] Ruft eine neue API-Route einen KI-Anbieter nur über `sanitizeClientAiSettings`? — *erzwungen durch [tests/unit/ai-settings-gate-governance.test.ts](tests/unit/ai-settings-gate-governance.test.ts). Ohne das Gate könnte der Client im SaaS Anbieter-Endpunkt und -Schlüssel bestimmen.*
   - [x] Sagt eine Rückruf-Signatur die Wahrheit über ihre Parameter? — *erzwungen durch den Compiler: `strictFunctionTypes` ist Teil von `strict: true` (seit 18.08.2026). Er fand auf Anhieb sieben Falschaussagen, darunter eine Durchreiche, die einen Setter auf `Task[]` verengte, obwohl drei Aufrufstellen eine Aktualisierungs-Funktion übergeben. Wo ein Rahmenwerk die Wahrheit nicht ausdrücken kann (Logto reichert die Anfrage selbst an), steht die Zusicherung als benannte Zeile mit `// ARCH:`-Begründung — nicht in der Signatur.*
   - [x] Gilt eine Regel in ALLEN vier Profil-Familien (Expertise, KI, Skills, Erfahrungsschatz)? — *erzwungen durch [tests/unit/profile-family-symmetry.test.ts](tests/unit/profile-family-symmetry.test.ts). Die wiederkehrende Fehlerklasse dieses Projekts ist nicht die falsche Regel, sondern die Regel, die in drei Familien gilt und in der vierten fehlt. Geprüft wird: wer aus einer Datei heraus speichert, muss vor dem Überschreiben fragen; Profilnamen werden nirgends von Hand verglichen (`isSameName`); die Meldung bei belegtem Namen ist überall dieselbe. Anlass war ein Bericht vom 18.08.2026 — ein Erfahrungsschatz-Import überschrieb den gleichnamigen Schatz wortlos.*
   - [x] Wird ein Wert woertlich in eine Prompt-Vorlage eingesetzt? — *erzwungen durch [tests/unit/prompt-placeholder-governance.test.ts](tests/unit/prompt-placeholder-governance.test.ts): Platzhalter duerfen nur ueber `setzeEin` aus [src/lib/prompt-placeholder.ts](src/lib/prompt-placeholder.ts) gefuellt werden, nie per `String.replace`. Im Ersatztext von `replace` haben `$&`, `` $` ``, `$'` und `$$` Sonderbedeutung — Schuelertext konnte damit den Aufbau des Prompts steuern und sogar das schliessende `</task_to_evaluate>` mitten in die eigene Antwort schreiben. Die ungeschuetzte Form stand an 31 Stellen in drei Dateien; die Regel galt an keiner (18.08.2026).*
   - [x] Validiert eine API-Route ihren Anfrage-Rumpf per Zod? — *erzwungen durch [tests/unit/zod-validation-governance.test.ts](tests/unit/zod-validation-governance.test.ts). `architectural-vision` §8 verlangt das seit jeher, hatte aber keinen Waechter — und war entsprechend auf zehn Routen gedriftet (19.08.2026), davon fuenf in den Profil-Familien. Die Altfaelle sind per Ratsche eingefroren und duerfen nur schrumpfen; Ausnahmen brauchen eine fachliche Begruendung in der Datei (bisher genau eine: der Stripe-Webhook braucht den rohen Rumpf fuer seine Signaturpruefung).*
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

## Zwei Repositories

Die Compliance-Akte liegt **nicht** im Hauptrepo. `compliance/` ist dort gitignoriert — oeffentlich ist allein die Landkarte [compliance/README.md](compliance/README.md) — und enthaelt ein eigenstaendiges, privates Repository (`koreki-org/koreki-compliance`).

**Wer Code und Akte zusammen aendert, braucht zwei Commits und zwei Pushes.** Das kommt regelmaessig vor: Eine Messung beruehrt Code, Nachweis und Risikoregister zugleich. Der Pre-Push-Hook erinnert daran, haelt aber nichts auf.

Warum getrennt und kein Submodul: Artikel 11 und 18 verlangen, die Dokumentation zu erstellen und zehn Jahre verfuegbar zu halten — nicht, sie zu veroeffentlichen. Ein vergessener zweiter Commit ist dann einfach ein fehlender Commit; bei einem Submodul waere es ein Zeiger auf einen veralteten Stand, und das faellt niemandem auf.

## Weitere Referenzen
- [Shared References (Architektur, KI, Operations)](.claude/shared-references.md)
