---
title: "Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)"
description: "Koreki Dokumentation: Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)"
author: "@principal_architect"
date: "2026-04-05"
last_updated: "2026-04-05"
status: "Approved"
domain: "support"
security_classification: "Public"
---

# Troubleshooting: Login 401 Unauthorized (Logto Cookie Problem)

## 1. Executive Summary & Kontext

> Gelöst am **17.03.2026** – Dieses Dokument beschreibt Ursache, Diagnose und Lösung der 401-Fehler beim Logto-Login im Produktionsbetrieb (Coolify/Docker).

---

## Symptom

Nach dem Deployment auf dem IONOS-VPS (hinter Coolify/Traefik-Proxy) traten sporadische **401 Unauthorized**-Fehler auf. Betroffene API-Routen:

- `/api/admin/prompt-profiles`
- `/api/ai-status`
- `/api/user`

Der Login über Logto funktionierte lokal, aber im Docker-Container hinter dem Reverse-Proxy schlug die Session-Validierung fehl.

---

## Ursachen (3 Probleme)

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

## Zusätzliche Fixes

| Commit | Beschreibung |
|--------|-------------|
| `71e9b25` | `TRUST_PROXY=true` in Dockerfile gesetzt – Coolify/Traefik leitet Requests über einen Proxy weiter; ohne diese Einstellung werden Cookie-Attribute (wie `Secure`) falsch interpretiert. |
| `858317a` | Fehlende `isAuthenticated`/`claims`-Variablen in `prompt-profiles.ts` wiederhergestellt, die nach einem Refactoring verloren gegangen waren. |
| `3ec6c18` | Alle Debug-Logs entfernt für Production-Readiness. |

---

## Checkliste für zukünftige Logto-Probleme

1. **Env-Variablen prüfen:** `LOGTO_COOKIE_SECRET` muss in Coolify gesetzt sein (mind. 32 Zeichen).
2. **Proxy-Konfiguration:** `TRUST_PROXY=true` muss im Docker-Container gesetzt sein.
3. **Cookie-Debug:** Mit `req.headers.cookie` loggen, welche Cookies ankommen.
4. **Race Conditions:** Unkritische Routen sollten den leichten Cookie-Check nutzen, nicht `withLogtoApiRoute`.
5. **Callback-Duplikate:** Der Deduplizierungsschutz in `[action].ts` fängt doppelte Hits ab.

---

## Betroffene Dateien

- [logto.ts](../src/lib/logto.ts) – Cookie-Secret Konfiguration
- [ai-status.ts](../src/pages/api/ai-status.ts) – Leichtgewichtiger Auth-Check
- [[action].ts](../src/pages/api/logto/[action].ts) – Callback-Deduplizierung
- [prompt-profiles.ts](../src/pages/api/admin/prompt-profiles.ts) – Auth-Variablen Fix
- [Dockerfile](../Dockerfile) – `TRUST_PROXY` und `HOSTNAME`


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
