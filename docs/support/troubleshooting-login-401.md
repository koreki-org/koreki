---
title: "Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)"
description: "Koreki Dokumentation: Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)"
author: "@principal_architect"
date: "2026-04-05"
last_updated: "2026-08-03"
status: "Approved"
domain: "support"
security_classification: "Public"
---

# Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)

## 1. Executive Summary & Kontext

> Dieses Dokument beschreibt Ursache, Diagnose und Lösung der 401-Fehler beim Logto-Login im Produktionsbetrieb (Coolify/Docker).

Es dokumentiert **zwei getrennte Vorfälle**:

| Vorfall | Datum | Kern |
|---|---|---|
| I — Session-Infrastruktur | 17.03.2026 | Cookie-Secret, Session-Races, Callback-Duplikate (Abschnitte 1–3) |
| II — `/api/user/grading-memories` | 03.08.2026 | Fehlendes Auth-Gate + Request-Verstärkung im Client (Abschnitt 4) |

> [!IMPORTANT]
> Vorfall I wurde serverseitig behoben, Vorfall II clientseitig. Wer ein neues 401
> untersucht, sollte zuerst klären, **ob der Request überhaupt hätte gesendet werden
> dürfen** — bei Vorfall II war nicht die Session kaputt, sondern der Aufruf verfrüht.

---

## Symptom

Nach dem Deployment auf dem IONOS-VPS (hinter Coolify/Traefik-Proxy) traten sporadische **401 Unauthorized**-Fehler auf. Betroffene API-Routen:

- `/api/admin/prompt-profiles`
- `/api/ai-status`
- `/api/user`

Der Login über Logto funktionierte lokal, aber im Docker-Container hinter dem Reverse-Proxy schlug die Session-Validierung fehl.

---

## Vorfall I — Ursachen (3 Probleme)

### 1. Hardcoded `LOGTO_COOKIE_SECRET` Fallback

**Datei:** `src/lib/logto.ts`

Das Cookie-Secret hatte einen festen Fallback-Wert:

```diff
- cookieSecret: process.env.LOGTO_COOKIE_SECRET || 'complex_password_at_least_32_characters_long',
+ cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
```

**Problem:** Wenn die Env-Variable in der Produktionsumgebung fehlte oder leer war, wurde der Fallback verwendet. Dadurch stimmte das Secret zwischen Builds nicht überein → Cookies konnten nicht entschlüsselt werden → 401.

**Fix** (`9582d11`): Fallback entfernt, Production-Guard hinzugefügt:

```typescript
if (!logtoConfig.cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('LOGTO_COOKIE_SECRET is required in production');
}
```

---

### 2. Session-Race-Conditions bei parallelen API-Calls

**Datei:** `src/pages/api/ai-status.ts`

Mehrere API-Routen verwendeten `logtoClient.withLogtoApiRoute()`, das intern `iron-session` für die Cookie-Entschlüsselung nutzt. Bei parallelen Requests (z.B. Dashboard-Load) kam es zu **Race Conditions**: Die Session-Entschlüsselung blockierte sich gegenseitig → 401.

**Fix** (`475424b`): Für unkritische Routen wie `ai-status` wurde die schwere Logto-Session-Validierung durch einen leichtgewichtigen Cookie-Check ersetzt:

```typescript
function hasLogtoSession(req: NextApiRequest): boolean {
    const cookie = req.headers.cookie || '';
    return cookie.includes('logto_');
}
```

---

### 3. Doppelte Callback-Hits (500 → 401-Kette)

**Datei:** `src/pages/api/logto/[action].ts`

React Strict Mode (oder schnelle Redirects) triggerte den Login-Callback doppelt. Der zweite Hit schlug fehl → 500-Error → Session wurde nicht korrekt gesetzt → nachfolgende Requests lieferten 401.

**Fix** (`df99c01`): Deduplizierung über ein State-Set:

```typescript
const processedStates = new Set<string>();

if (action === 'sign-in-callback' && typeof state === 'string') {
    if (processedStates.has(state)) {
        return res.status(302).setHeader('Location', '/app').end();
    }
    processedStates.add(state);
    setTimeout(() => processedStates.delete(state), 60000);
}
```

---

## Vorfall II — `/api/user/grading-memories` (03.08.2026)

Behoben in `ab20e5b`.

### Symptom

`GET https://<host>/api/user/grading-memories 401 (Unauthorized)` in der Browser-Konsole —
zuverlässig beim Login, darüber hinaus sporadisch.

> [!NOTE]
> Die Konsolenzeile stammt vom **Netzwerk-Stack des Browsers**, nicht vom App-Code.
> [api-client.ts](../../src/lib/api-client.ts) wiederholt nach 300ms, und der Hook prüft
> nur `res.ok`. Das Feature funktionierte deshalb in der Regel trotzdem — die Meldung
> blieb aber stehen. Ein 401 in der Konsole heißt nicht automatisch, dass etwas kaputt ist.

### Ursache 4a — Governance-Hook ohne Auth-Gate

`useGradingMemories` war der einzige der vier Governance-Hooks ohne Gate:

| Hook | Gate |
|---|---|
| `usePromptGovernance` | `if (authLoading \|\| !isHydrated \|\| !userData?.id) return;` |
| `useSkillGovernance` | dito |
| `useAiGovernance` | dito |
| `useGradingMemories` | **fehlte** |

Verschärfend: Der Hook wird in [app.tsx](../../src/pages/app.tsx) im **Component-Body**
aufgerufen, `<AuthGuard>` beginnt erst im JSX. React-Hooks laufen unabhängig davon, was
der Guard rendert — der Fetch war also auch dann unterwegs, wenn der Guard noch lud oder
gerade zum Login umleitete. Ergebnis: garantiertes 401.

**Fix:** Auth-Gate im Netzwerkpfad. Der Desktop-Pfad bleibt bewusst ungegated, da er
netzwerkfrei ist und ohne `userData` auskommt.

### Ursache 4b — Request-Verstärkung N + N²

Der Hook hatte zwei Effects, die sich gegenseitig triggerten:

1. Mount-Fetch → dispatcht `koreki-grading-memories-changed`
2. Listener auf genau dieses Event → löst einen weiteren Fetch aus

Da der Hook **mehrfach gleichzeitig gemountet** ist (`app.tsx`, `GradingMemoryModal`,
je eine Instanz pro `BatchTaskAnalysisCard`), ergab das bei N Instanzen `N + N²` Requests
auf denselben Endpunkt. Batch-Done-Ansicht mit 5 Tasks: 56 statt 7.

Das erklärt, warum ausgerechnet dieser Endpunkt auffiel und `prompt-profiles` oder
`skill-profiles` nicht.

**Fix:** Der Mount-Fetch notifiziert nicht mehr. Die Mutations-Dispatches
(`selectMemory` / `deleteMemory` / `addLocalMemory`) bleiben erhalten — dort ist die
Cross-Instanz-Synchronisation der eigentliche Zweck.

**Gemessen** (Playwright gegen den lokalen Dev-Server, `/app` geladen, 6s beobachtet):

| | Requests auf `/api/user/grading-memories` |
|---|---|
| vor dem Fix | 9 |
| nach dem Fix | 3 (= Anzahl gemounteter Instanzen) |

### Staffelungs-Delays zentralisiert

Die vier „Cookie Settling"-Delays lagen als lose `setTimeout`-Aufrufe in vier Hook-Dateien
und waren bereits auseinandergelaufen (drei dokumentierten sich als „Slot n/3", während
längst ein vierter existierte). Sie liegen jetzt in
[session-settling.ts](../../src/lib/session-settling.ts) und wurden halbiert
(letzter Slot 1500ms → 750ms).

> [!WARNING]
> **Nicht bewiesen:** Die Delays mitigieren eine vermutete Token-Refresh-Race in Logto
> (bei Refresh-Token-Rotation gewinnt bei parallelen Requests einer, die übrigen bekommen
> `invalid_grant`). Diese Race wurde **nie durch Logs belegt** — sie ist eine plausible
> Erklärung für die sporadische Variante, mehr nicht. Deshalb wurden die Delays halbiert
> statt entfernt. Wer sie ganz entfernen will, sollte vorher die Audit-Abfrage unten über
> mindestens einen Token-Ablauf-Zyklus laufen lassen.

### Verifikation via Audit-Log

`logSecurityEvent` schreibt **nicht** in eine `SecurityEvent`-Tabelle, sondern in
`PrivacyLog` ([audit-service.ts](../../src/lib/audit-service.ts)), mit dem Event-Typ im
`action`-Feld:

```sql
SELECT "createdAt", "confirmedText", "ip"
FROM "PrivacyLog"
WHERE "action" = 'SECURITY_EVENT: AUTH_FAILURE'
  AND "confirmedText" LIKE '%grading-memories%'
ORDER BY "createdAt" DESC
LIMIT 50;
```

> [!NOTE]
> Das 401 aus Vorfall II ist **lokal nicht reproduzierbar**: `.env.local` setzt
> `NEXT_PUBLIC_KOREKI_MODE=community` und `NEXT_PUBLIC_AUTH_TYPE=NONE`, damit greift
> serverseitig der lokale Trust-Bypass in `withSecurity` und es gibt gar keine
> Logto-Session. Die Request-Verstärkung (4b) ist dagegen modus-unabhängig und lokal
> messbar.

---

## Zusätzliche Fixes

| Commit | Beschreibung |
|--------|-------------|
| `71e9b25` | `TRUST_PROXY=true` in Dockerfile gesetzt – Coolify/Traefik leitet Requests über einen Proxy weiter; ohne diese Einstellung werden Cookie-Attribute (wie `Secure`) falsch interpretiert. |
| `858317a` | Fehlende `isAuthenticated`/`claims`-Variablen in `prompt-profiles.ts` wiederhergestellt, die nach einem Refactoring verloren gegangen waren. |
| `3ec6c18` | Alle Debug-Logs entfernt für Production-Readiness. |
| 2026-07-29 | **API-Client 401-Retry**: Globaler Retry-Mechanismus in `api-client.ts` – bei 401-Response wird nach 300ms ein einmaliger Retry ausgeführt. Überspringt `/api/logto/`-Endpoints. Fängt transiente Cookie-Race-Conditions ab. |
| 2026-07-29 | **AuthGuard Retry**: `AuthGuard.tsx` führt bei `!userData` einen einmaligen `checkAuth()`-Refetch aus bevor zum Login redirected wird. Verhindert falsche Logouts bei transienten Session-Problemen. |

---

## Checkliste für zukünftige Logto-Probleme

1. **Env-Variablen prüfen:** `LOGTO_COOKIE_SECRET` muss in Coolify gesetzt sein (mind. 32 Zeichen).
2. **Proxy-Konfiguration:** `TRUST_PROXY=true` muss im Docker-Container gesetzt sein.
3. **Cookie-Debug:** Mit `req.headers.cookie` loggen, welche Cookies ankommen.
4. **Race Conditions:** Unkritische Routen sollten den leichten Cookie-Check nutzen, nicht `withLogtoApiRoute`.
5. **Callback-Duplikate:** Der Deduplizierungsschutz in `[action].ts` fängt doppelte Hits ab.
6. **Transiente 401-Fehler:** Der `apiClient` retried automatisch einmal nach 300ms. Falls das Problem persistiert, liegt es NICHT an Race Conditions.
7. **Falsche Logouts:** Der `AuthGuard` retried `checkAuth()` einmal bevor er zum Login redirected. Erst bei doppeltem Fehlschlag wird redirected.
8. **Durfte der Request überhaupt raus?** Vor jeder Session-Analyse prüfen, ob der aufrufende Hook ein Auth-Gate hat (`!userData?.id → return`) und ob er außerhalb des `AuthGuard` im Component-Body hängt. Hooks laufen unabhängig davon, was der Guard rendert.
9. **Wie oft feuert der Endpunkt?** Im Network-Tab die Treffer pro Endpunkt zählen. Mehr Requests als gemountete Komponenten deuten auf eine Event-Rückkopplung (siehe 4b), nicht auf ein Session-Problem.
10. **Konsole ≠ Defekt.** Der `apiClient`-Retry heilt transiente 401 still; die Browser-Konsole zeigt den Fehlversuch trotzdem. Vor der Fehlersuche klären, ob das Feature tatsächlich kaputt ist.

---

## Betroffene Dateien

- [logto.ts](../../src/lib/logto.ts) – Cookie-Secret Konfiguration
- [ai-status.ts](../../src/pages/api/ai-status.ts) – Leichtgewichtiger Auth-Check
- [[action].ts](../../src/pages/api/logto/[action].ts) – Callback-Deduplizierung
- [prompt-profiles.ts](../../src/pages/api/user/prompt-profiles.ts) – Auth-Variablen Fix (die Route lag zum Zeitpunkt von Vorfall I unter `api/admin/` und ist seither nach `api/user/` verschoben)
- [Dockerfile](../../Dockerfile) – `TRUST_PROXY` und `HOSTNAME`
- [api-client.ts](../../src/lib/api-client.ts) – Globaler 401-Retry (Resilience Layer)
- [AuthGuard.tsx](../../src/components/guards/AuthGuard.tsx) – Retry vor Login-Redirect

**Vorfall II:**

- [useGradingMemories.ts](../../src/hooks/useGradingMemories.ts) – Auth-Gate, Ende der Event-Verstärkung
- [session-settling.ts](../../src/lib/session-settling.ts) – Zentralisierte Staffelungs-Slots
- [usePromptGovernance.ts](../../src/hooks/usePromptGovernance.ts), [useSkillGovernance.ts](../../src/hooks/useSkillGovernance.ts), [useAiGovernance.ts](../../src/hooks/useAiGovernance.ts) – auf die zentralen Slots umgestellt
- [app.tsx](../../src/pages/app.tsx) – Aufrufort des Hooks (Component-Body, außerhalb `AuthGuard`)


---

## X. Security & Compliance (Mandatory for Industrial Grade)
> [!IMPORTANT]
> Keine Komponente ohne Security-Betrachtung.

* **Datenverarbeitung:** Die hier beschriebenen Fixes betreffen ausschließlich den
  Zeitpunkt und die Anzahl von API-Aufrufen, nicht deren Inhalt. `GradingMemory`-Fälle
  enthalten allerdings Schülertexte (`GradingMemoryCase.studentText`) und damit
  personenbezogene Daten — die Reduktion von 9 auf 3 Requests verringert entsprechend
  auch die Übertragungshäufigkeit dieser Daten.
* **Authentifizierung/Autorisierung:** Unverändert serverseitig autoritativ. `withSecurity`
  ([security.ts](../../src/lib/security.ts)) bleibt die einzige Instanz, die über Zugriff
  entscheidet. Das clientseitige Auth-Gate ist **reine Vermeidung sinnloser Requests, kein
  Sicherheitsmechanismus** — es darf nie als solcher behandelt oder als Begründung für eine
  Lockerung serverseitiger Prüfungen herangezogen werden.
* **Audit-Logs:** Fehlgeschlagene Authentifizierungen landen als
  `SECURITY_EVENT: AUTH_FAILURE` in `PrivacyLog` (Abfrage siehe Vorfall II). Durch das
  Auth-Gate entfallen die bisherigen Fehlalarme aus verfrühten Client-Aufrufen — die
  verbleibenden Einträge sind damit aussagekräftiger.

---

## Y. Testing & Referenzen
> [!WARNING]
> Verlinke hier zwingend auf zugehörige GitHub PRs, Tasks oder Architektur-Entscheidungen (ADR).

* **Verwandte Dokumente:** [grading-memory.md](../technical/grading-memory.md),
  [direct-grading-memory-integration.md](../concepts/direct-grading-memory-integration.md)
* **Test-Coverage:**
  * [useGradingMemories.saas.test.tsx](../../tests/unit/hooks/useGradingMemories.saas.test.tsx)
    — Auth-Gate und Verstärkungs-Regression. Gegen den Stand vor dem Fix verifiziert
    (12 statt 3 Requests bei 3 Instanzen, 2 statt 0 ohne Session).
  * [session-settling.test.ts](../../tests/unit/lib/session-settling.test.ts) — sichert die
    Invariante der Staffelung (Slots echt aufsteigend, paarweise verschieden, konstanter
    Abstand), nicht die konkreten Millisekunden.
  * [useGradingMemories.desktop.test.tsx](../../tests/unit/hooks/useGradingMemories.desktop.test.tsx)
    — deckt ausschließlich den Desktop-Pfad ab.
  * **Lücke:** Kein E2E-Spec für Grading Memory unter `tests/e2e/`.
* **Externe Referenzen:** [Logto Next.js SDK](https://docs.logto.io/quick-starts/next)
