---
title: "Teststrategie: Industrial Grade Stabilität 🛡️🦅"
description: "Koreki Dokumentation: Teststrategie: Industrial Grade Stabilität 🛡️🦅"
author: "@qa_engineer"
date: "2026-04-23"
last_updated: "2026-08-18"
status: "Approved"
domain: "operations"
security_classification: "Public"
---

# Teststrategie: Industrial Grade Stabilität 🛡️🦅

## 1. Executive Summary & Kontext

Dieses Dokument beschreibt den architektonischen Ansatz für das Testing bei Koreki. Wir verfolgen eine mehrschichtige Strategie, um sicherzustellen, dass die Plattform robust, wartbar und resistent gegen Regressionen ist.

## 2. Die Schicht-Architektur 🏗️

### Layer 0: Ausführbare Regeln (Governance-Wächter)
- **Ziel**: Regeln, die sonst driften, brechen den Build statt eine Notiz zu hinterlassen.
- **Der Befund, der dazu geführt hat**: Jede Regel MIT Wächter wurde zu 100 % eingehalten, jede OHNE driftete. Beim Backend-Logging (ESLint aktiv) gab es null Verstöße, bei den Dateigrößen (nur im Dokument) 24.
- **Ratschen-Prinzip**: Ein naiver Test schlüge sofort vielfach fehl, jemand setzt ihn auf `skip`, und dann ist er schlechter als kein Test. Stattdessen frieren Baselines den IST-Zustand ein: Neues muss sauber sein, Altlasten dürfen nur schrumpfen, und wer eine Datei aufräumt, muss sie aus der Baseline entfernen.
- **Die Wächter** (alle unter `tests/unit/`):

| Wächter | Prüft |
|:---|:---|
| `any-governance` | Neue Dateien ohne explizites `any`; Altfälle nur schrumpfend |
| `file-size-governance` | 300 Zeilen für Komponenten/Hooks/Pages, 500 für `lib`/`types`; max. 10 Hook-Aufrufe je Komponente |
| `duplication-governance` | Wortgleiche Blöcke ab 6 Zeilen — zwischen zwei Dateien UND innerhalb einer |
| `profile-family-symmetry` | Was in drei der vier Profil-Familien gilt, muss in der vierten auch gelten |
| `ai-settings-gate-governance` | Jede KI-Route geht über `sanitizeClientAiSettings` |
| `security-audit` | Abhängigkeiten, Auth-Wrapper, Rollenprüfungen, keine Test-Bypässe |

> [!IMPORTANT]
> **Regeln brauchen Wächter.** Wer hier eine Regel ergänzt, ergänzt den Test dazu — sonst ist es eine Absichtserklärung, keine Regel.

### Layer 1: Logik-Rüstung (Unit Testing)
- **Ziel**: Abdeckung in `src/lib/` auf 80%+, und zwar bei den ZWEIGEN, nicht nur den Zeilen.
- **Fokus**: Pure Functions, Bewertungsmathematik, Abrechnung, Datenschutz-Pfade, Rundläufe (Export/Import).
- **Status (18.08.2026)**: `src/lib/` bei 80,8 % Zeilen und 72,5 % Zweigen. Die Lücke liegt inzwischen in `src/hooks/` (39 % Zweige), nicht mehr in `lib/`.
- **Bekannte Lücken**: `file-utils.ts` (PDF-Worker schwer mockbar, gehört in Layer 3), `useFileDropZone`, `auth-keycloak`, `grading-memory-characters` (reine Beschriftungstabelle — bewusst ungeprüft, ein Test schriebe nur den `switch` ab).

### Layer 2: Stahldrähte / Steel Threads (Integration Testing)
- **Ziel**: Absicherung der geschäftskritischen "Workflow-Funnels" (Steel Threads).
- **Fokus**: Zusammenspiel der Komponenten, DOM-Events und asynchrones State-Management.
- **Status**: **3 von 3 Stahldrähten implementiert**.
    - [x] **Draht A (Workflow-Orchestrierung)**: Dashboard -> Korrektur starten -> Datenschutz-Modal bestätigt -> Prozess-Start. 🛡️
    - [x] **Draht B (Korrektur-Loop)**: KI-Ergebnis trifft ein -> User editiert Punkte -> Noten/Punkte aktualisieren sich visuell. 🛠️
    - [x] **Draht C (Export-Kette)**: Sitzungsergebnisse vorhanden -> Export getriggert -> Browser-Download verifiziert. 📊

### Layer 3: End-to-End (E2E Testing)
- **Ziel**: Reale Browser-Verifizierung des gesamten Anwendungs-Deployments.
- **Fokus**: Öffentliche Seiten (Zone A: 9 Tests, 36 Checks), Authentifizierungs-Flow (Zone B).
- **Tooling**: Browser-Automatisierung (z.B. via Claude Code Browser-Tooling) gegen Live-Deployment (kein lokaler Server nötig).
- **Status**: **Zone A implementiert** — auslösbar via `/layer3-smoke` Slash-Command.
- **Siehe**: `.claude/commands/layer3-smoke.md`

---

## 3. Werkzeuge & Infrastruktur 🛠️

- **Test-Runner**: Jest (konfiguriert mit JS-DOM für Layer 2).
- **UI-Interaktion**: `@testing-library/react`.
- **Daten-Versorgung**: `src/test/factories.ts` liefert schlanke, typsichere Mock-Daten für alle Layer.
- **Mocks**: 
  - `fetch`: Global gemockt, um API-Orchestrierung zu verifizieren.
  - `Prisma`: Datenbank-Interaktionen werden über `$transaction`-Patterns simuliert.
  - `Browser APIs`: Blobs, URLs und Timer werden in der Testumgebung vollständig kontrolliert.
  - `pdfjs-dist`: Global gemockt in `jest.setup.js`, um ESM-Inkompatibilitäten zu umgehen.
- **Coverage-Gate** (`jest.config.js`) — je Bereich verschieden, weil die Bereiche verschieden testbar sind:

| Bereich | Zweige | Funktionen | Zeilen |
|:---|---:|---:|---:|
| `src/lib/` | 45 % | 65 % | 63 % |
| `src/hooks/` | 25 % | 30 % | 30 % |
| `src/pages/api/` | 35 % | 40 % | 55 % |

  - Ausgenommene Module: `prisma.ts`, `logto.ts`, `logto-mgmt.ts`, `stripe.ts` (Infrastruktur-Glue, nicht sinnvoll unit-testbar)
- **Mutationstests**: Stryker über die teuren Bereiche (`npm run test:mutation`). Siehe Abschnitt 5 — sie prüfen die TESTS, nicht den Code.

---

## 4. Aktueller Stand (18.08.2026) 📊

| Ebene | Ziel | Aktuell | Status |
| :--- | :--- | :--- | :--- |
| **Tests gesamt** | — | **1439** | 🟢 grün, inkl. Build und Lint |
| **`src/lib/` Zeilen** | 80 % | **80,8 %** | 🟢 Ziel erreicht |
| **`src/lib/` Zweige** | 80 % | **72,5 %** | 🟡 die eigentliche Kennzahl |
| **`src/hooks/` Zweige** | — | **39 %** | 🟡 überwiegend Zustandsverdrahtung |
| **Gesamt Zweige** | 70 % | **61,5 %** | 🟡 |
| **Layer 0 Wächter** | — | **6** | 🟢 alle aktiv |
| **Layer 2 Stahldrähte** | 3 / 3 | **3 / 3** | ✅ |
| **Layer 3 E2E** | — | **2 Specs** | 🔴 dünn für diese Anwendung |
| **TypeScript** | `strict` | **`strict: true`** | 🟢 seit 18.08.2026 |

### Vorbildlich abgedeckt
| Modul | Zeilen | Zweige |
|:---|---:|---:|
| `parsers/markdown-grading-memory-parser.ts` | 100 % | 97 % |
| `error-message.ts` | 100 % | 97 % |
| `utils.ts` | 100 % | 93 % |
| `grading/numeric-tolerance.ts` | 100 % | 100 % |

### Bekannte Lücken
| Modul | Zeilen | Grund |
|:---|---:|:---|
| `file-utils.ts` | 15 % | PDF-Worker-API schwer mockbar, gehört in Layer 3 |
| `hooks/useFileDropZone.ts` | 5 % | reine Browser-Ereignisse |
| `auth-keycloak.ts` | 18 % | Community-Pfad, braucht einen echten Keycloak |
| `grading-memory-characters.ts` | 17 % | **bewusst**: reine Beschriftungstabelle, ein Test schriebe nur den `switch` ab |

---

## 5. Mutationstests 🧬

Sie prüfen die **Tests**, nicht den Code: Stryker setzt kleine Fehler in den Quelltext und fährt die Suite. Bleibt so ein Mutant am Leben, hat kein Test ihn bemerkt — die Abdeckung sagt dann „geprüft", obwohl nichts geprüft wird.

### Was sie leisten — und was nicht

**Sie finden keine Fehler.** In den ersten Durchläufen (18.08.2026) war *jeder* Fund korrekter Code, den nur kein Test absicherte. Echte Fehler hat in derselben Sitzung das aufmerksame Lesen beim Umbauen gefunden, rund fünfzehn Stück — darunter einer, der Schülern Punkte kostete.

Der Nutzen ist ein anderer und schmaler: **sie sagen, welche Tests Attrappen sind.** Das zählt genau dann, wenn man sich auf die Suite verlassen will, um etwas umzubauen. Versicherung, keine Fehlersuche.

### Gemessene Werte

| Bereich | Rate | Bemerkung |
|:---|---:|:---|
| `grading/numeric-tolerance.ts` | **100 %** | vorher 59 % — es gab gar keinen eigenen Test |
| `grading-memory-persistence.ts` | **100 %** | vorher 94,7 % |
| `src/lib/grading/` gesamt | **~65 %** | 952 Überlebende von 2711 geprüften Mutanten |

> [!NOTE]
> **65 % ist normal.** Gut getestete Open-Source-Projekte liegen typisch bei 60–80 %. Ein Teil der Überlebenden ist zudem gar nicht tötbar („äquivalente Mutanten", die nichts am Verhalten ändern) — Faustregel 5–20 %.

### Wie sie benutzt werden

```bash
npm run test:mutation                              # die teuren Bereiche, inkrementell
npm run test:mutation -- --mutate "src/lib/x.ts"   # eine Datei, direkt vor ihrem Umbau
npm run test:mutation:full                         # alles neu, ohne Zwischenspeicher
```

> [!WARNING]
> **Niemals als Gate.** Nicht im Pre-Push, nicht blockierend in CI. Das Signal heißt „ungeschützt", nicht „kaputt" — darauf zu blockieren bestraft das Falsche. Die Laufzeit macht es ohnehin unmöglich: ein Lauf über `src/lib/grading` instrumentiert 2937 Mutanten und braucht über eine Stunde.

Der sinnvolle Einsatz ist punktuell: **vor einem Umbau die betroffene Datei messen** und damit die Frage beantworten, ob die Tests einen tragen. Der Zwischenspeicher macht Wiederholungen billig (gemessen: 5:45 beim ersten Lauf, 1:33 beim zweiten).

---

## 6. Wie man beiträgt
1. **Neue Logik?** Erstelle eine `.test.ts` unter `tests/unit/` und halte das Coverage-Gate ein.
2. **Neues Feature?** Prüfe, ob es ein neuer „Stahldraht" ist. Wenn ja, füge einen Integrationstest hinzu.
3. **Bugfix?** Füge immer erst einen Regressionstest hinzu, bevor du den Fix pushst — und schreibe in den Kommentar, WAS ohne ihn passiert wäre, nicht nur was er prüft.
4. **Neue Regel?** Ergänze den Wächter dazu (Layer 0). Ohne ihn ist es eine Absichtserklärung.
5. **Umbau geplant?** Miss die betroffene Datei vorher mit `npm run test:mutation -- --mutate "<datei>"`. Die Antwort auf „tragen mich diese Tests?" ist selten die, die man erwartet.

> [!TIP]
> **Prüfe jeden neuen Test gegen einen bewusst eingesetzten Fehler.** Ein Test, der auch dann grün bleibt, wenn man die geprüfte Zeile kaputt macht, ist eine Attrappe. Das ist von Hand in Sekunden erledigt und hat in dieser Codebasis mehrfach Lücken aufgedeckt — zuletzt eine, bei der der Einzel-Weg geprüft war und der Stapel-Weg nicht.

> [!IMPORTANT]
> **Industrial Grade** bedeutet: Wir testen nicht nur Code, sondern wir **"verifizieren Verhalten"**. Coverage ist eine Metrik, aber die "Stahldrähte" sind unsere eigentliche Versicherungspolice. Die Coverage-Zahlen in der Dokumentation müssen den tatsächlichen Stand widerspiegeln – Ehrlichkeit vor Schönfärberei.


---

## X. Security & Compliance (Mandatory for Industrial Grade)
> [!IMPORTANT]
> Keine Komponente ohne Security-Betrachtung. (TBD)

* **Datenverarbeitung:** TBD
* **Authentifizierung/Autorisierung:** TBD
* **Audit-Logs:** TBD

---

## Y. Testing & Referenzen
> [!WARNING]
> Verlinke hier zwingend auf zugehörige GitHub PRs, Tasks oder Architektur-Entscheidungen (ADR).

* **Verwandte Dokumente:** TBD
* **Test-Coverage:** TBD
* **Externe Referenzen:** TBD
