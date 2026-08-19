---
description: Führt die lokale Test-Kette (Layer 2 + Layer 3) gegen den eigenen Rechner aus — mit gestubbtem KI-Anbieter, ohne Credits.
---

Dieser Workflow verifiziert die Kette von der Musterlösung bis zur Note.

> **Geändert am 19.08.2026.** Vorher startete dieser Befehl den
> Golden-Thread-Test **gegen die Produktion** (`koreki.org`). Der begann mit
> einem Aufräumschritt, der dort jeden gefundenen „Löschen"-Knopf klickte und
> bestätigte, verbrauchte echte Credits und konnte ungetaggte Änderungen gar
> nicht prüfen.
>
> Er ist gelöscht, zusammen mit der produktionsgebundenen Playwright-Konfiguration
> und dem Login-Setup, das sich bei jedem Lauf mit echten Zugangsdaten in der
> Produktion anmeldete. `npm run test:e2e` läuft jetzt von sich aus lokal — die
> sichere Variante ist die bequeme.

## Ausführung

```bash
npm run test:e2e
```

Playwright startet dabei selbst, was es braucht:

- den **Stub-Anbieter** (`tests/e2e/stub-provider.mjs`) auf Port 4010 — er
  antwortet, was der jeweilige Test vorgibt, statt ein echtes Modell zu fragen;
- den **Dev-Server** auf Port 3000, mit eigenem Datenverzeichnis unter
  `tests/reports/appdata-local`, damit der Lauf nicht auf den echten Profilen
  der Lehrkraft arbeitet.

Es braucht keinen Login, keine Datenbank und keine Credits.

## Was geprüft wird

**Layer 2** (`tests/e2e/local/korrektur-kette.spec.ts`) — die Rechnung hinter
der HTTP-Schnittstelle, mit gezielt bösartigen Modell-Antworten: unlesbare
Einzelwertung, abgeschnittenes JSON, Zoll-Zeichen im Feedback, untippbare
Maximalpunktzahl, Denkblock vor der Antwort. Dazu die Sampling-Disziplin
(Extraktion bei Temperatur 0.0) und die wörtliche Einsetzung des Schülertexts
in den Prompt.

**Layer 3** (`tests/e2e/local/nutzerreise.spec.ts`) — die Reise durch die
Oberfläche: Upload der Musterlösung, Dokumentart wählen, Schülerarbeit
hochladen, korrigieren, Datenschutz bestätigen, Note ablesen.

## Was dieser Befehl NICHT mehr tut

Er prüft **nicht die ausgelieferte Instanz**. Ein Rauchtest gegen die
Produktion existiert derzeit nicht — der alte war dafür ungeeignet (er
schrieb und löschte dort), und ein neuer ist nicht gebaut. Wer wissen will,
ob `koreki.org` läuft, muss dort nachsehen.

## Bekannte Lücke

Ob eine **gescheiterte** Korrektur in der Liste sichtbar scheitert, ist nicht
abgesichert. Der Server weist eine unlesbare Antwort korrekt ab; was die
Oberfläche danach zeigt, ist ungeprüft. Der Haken dafür
(`data-testid="fehler"`) ist gesetzt, die offene Stelle steht im Kopf von
`nutzerreise.spec.ts`.
