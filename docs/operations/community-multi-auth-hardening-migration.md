# Migration: Token-Verifikation für Community Multi-User 🛡️🗝️

| Feld | Wert |
|---|---|
| **Status** | Active |
| **Domain** | Operations / Security |
| **Security Classification** | Internal |
| **Betrifft** | Bestehende Community Multi-User Installationen (Keycloak) |

---

## 1. Worum es geht

Bis einschließlich Version 0.9.87 hat das Backend die Identität aus den Request-Headern `x-koreki-user-id` und `x-koreki-user-roles` übernommen. Diese Header wurden clientseitig aus dem `localStorage` befüllt und **serverseitig nicht geprüft** — das Keycloak-Token wurde nie verifiziert.

Praktische Folge: Wer die API erreichen konnte, konnte sich mit einem selbst gesetzten Header als beliebige Lehrkraft oder als Admin ausgeben. Damit waren sowohl fremde Grading-Memories (inkl. Schülertexte) lesbar als auch die globalen KI-Einstellungen änderbar — inklusive der Provider-URL, über die anschließend alle Korrekturanfragen laufen.

Ab dieser Version verifiziert der Server jedes Token kryptografisch (Signatur via JWKS, Issuer, Client-Bindung, Ablauf). Die alten Header werden ignoriert.

## 2. Was das Update automatisch erledigt

- Umstellung auf `Authorization: Bearer` im Frontend
- Serverseitige Verifikation aller API-Requests
- Rollen werden aus `realm_access.roles` gelesen (kein Realm-Mapper mehr nötig)

## 3. Was manuell nachgezogen werden muss

> [!IMPORTANT]
> Keycloak importiert die Realm-Datei **nur beim allerersten Start**. Bestehende Installationen übernehmen Änderungen an `keycloak/koreki-realm.json` daher **nicht** automatisch.

### 3.1 Standard-Zugang `koreki` / `koreki` entfernen (dringend)

Ältere Realm-Dateien enthielten einen vorkonfigurierten Admin-Benutzer mit dem Passwort `koreki` und ohne erzwungenen Wechsel. Dieser Zugang existiert in bestehenden Installationen weiterhin.

1. Keycloak Admin UI öffnen: `<APP_URL>/auth/admin`, Login als `admin`
2. Realm `koreki` → *Users* → `koreki`
3. Entweder den Benutzer löschen (falls ungenutzt), **oder** unter *Credentials* ein neues, starkes Passwort setzen (*Temporary* = An)

Prüfe bei der Gelegenheit unter *Users*, ob weitere unbekannte Konten existieren.

### 3.2 Umgebungsvariablen ergänzen

In der `.env` bzw. im Compose-File:

```bash
# Nur für den mitgelieferten Full-Stack nötig (Keycloak hinter dem Nginx-Gateway):
OIDC_ISSUER_INTERNAL=http://gateway/auth/realms/koreki
OIDC_CLIENT_ID=koreki-app
```

Bei einem externen Keycloak bleibt `OIDC_ISSUER_INTERNAL` leer — dann wird `NEXT_PUBLIC_OIDC_ISSUER` für den Schlüsselabruf verwendet.

Die Variable `ENVIRONMENT` wird nicht mehr benötigt und kann entfernt werden.

### 3.3 Rollen prüfen

Admin-Rechte hängen an der Realm-Rolle `koreki-admin`. Unter *Users* → *Role mapping* prüfen, dass mindestens eine Lehrkraft diese Rolle hat — sonst kommt nach dem Update niemand mehr an die KI-Einstellungen.

Führt das Schulnetz bereits eine eigene Admin-Rolle (LDAP/AD), kann diese über `NEXT_PUBLIC_ADMIN_ROLE_NAME` zusätzlich akzeptiert werden.

## 4. Verifikation nach dem Update

```bash
# 1. Normaler Login im Browser muss funktionieren.

# 2. Der alte Bypass muss geschlossen sein -> erwartet wird 401:
curl -i -H "x-koreki-user-id: pruefung" \
        -H 'x-koreki-user-roles: ["ADMIN"]' \
        <APP_URL>/api/admin/global-ai-settings

# 3. Erreichbarkeit der Signaturschlüssel aus dem App-Container.
#    Läuft auch schon VOR dem Update und ist als Vorab-Prüfung empfohlen:
docker compose -f docker-compose.community-multi-full.yml exec -T koreki \
  node -e "fetch('http://gateway/auth/realms/koreki/protocol/openid-connect/certs').then(r=>r.json()).then(j=>console.log('sig-Keys:',j.keys.filter(k=>k.use==='sig').map(k=>k.alg)))"
```

Erwartet wird `sig-Keys: [ 'RS256' ]`. Zusätzlich muss der Issuer übereinstimmen — dieser Wert muss exakt `NEXT_PUBLIC_OIDC_ISSUER` entsprechen:

```bash
curl -s <APP_URL>/auth/realms/koreki/.well-known/openid-configuration | grep -o '"issuer":"[^"]*"'
```

Liefert Schritt 2 etwas anderes als `401`, ist das Update nicht aktiv — Container mit `--build` neu bauen.

Schlägt Schritt 3 fehl, ist `OIDC_ISSUER_INTERNAL` falsch gesetzt; dann melden alle Requests „Nicht angemeldet".

## 5. Rollback

Die Änderung erfordert keine Datenmigration und berührt die JSON-Persistenz nicht. Ein Rollback auf die Vorversion ist jederzeit möglich — stellt allerdings den ungeprüften Header-Pfad wieder her und wird ausdrücklich nicht empfohlen.
