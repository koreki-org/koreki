---
title: "Datenschutz für Schulen: Koreki Desktop und Community"
description: "Datenflüsse und Schritte für den Einsatz von Koreki Desktop oder Koreki Community mit einem lokalen Modell oder einem KI-Anbieter. Mit Vorlage fürs Verarbeitungsverzeichnis und Bausteinen für die Datenschutz-Folgenabschätzung."
author: "@security_officer"
date: "2026-11-11"
last_updated: "2026-11-23"
status: "Draft"
domain: "user-guide"
security_classification: "Public"
---

# Datenschutz für Schulen: Koreki Desktop und Community

Für Lehrkräfte, Schulleitung und Datenschutzbeauftragte. Gilt für **Koreki Desktop** (auf dem Rechner der Lehrkraft) und **Koreki Community** (auf einem Server der Schule).

## Das Wichtigste

* **Die Arbeiten gehen nur an die KI, die in Koreki eingestellt ist.** Vor dem Senden nennt Koreki den Empfänger.
* **Koreki selbst bekommt keine Schülerdaten.** Ein Vertrag mit Koreki ist deshalb nicht nötig.
* **Die Note setzt immer die Lehrkraft.** Koreki macht Vorschläge; vor jedem Export wird bestätigt, dass sie geprüft sind.

## Welche KI?

| KI | Wo sie läuft | Vertrag zur Auftragsverarbeitung |
|---|---|---|
| **Lokales Modell über Ollama** | auf dem Rechner der Lehrkraft bzw. im Schulnetz | nicht nötig, die Arbeiten verlassen das Gerät bzw. das Netz nicht |
| **Mittwald** (Mittwald CM Service GmbH & Co. KG, Espelkamp) | bei Mittwald in Deutschland | mit Mittwald |
| **Mistral** (Mistral AI, Paris) | bei Mistral in der EU | mit Mistral |

Was ein Anbieter speichert und protokolliert, steht in seinen eigenen Angaben zum Datenschutz (Links unter „Quellen“) und im Vertrag zur Auftragsverarbeitung.

## Wohin gehen die Daten?

| | Koreki Desktop | Koreki Community |
|---|---|---|
| **Wo läuft Koreki?** | auf dem Rechner der Lehrkraft | auf einem Server der Schule |
| **Anmeldung** | am Rechner (Benutzerkonto des Betriebssystems) | über Keycloak, ein Konto je Lehrkraft |
| **Wo liegt der Schlüssel zum KI-Anbieter?** | im Tresor des Betriebssystems | in der Server-Konfiguration, hinterlegt von der Administration |
| **Was geht an die KI?** | Scans und Text der Arbeiten, Musterlösung | dasselbe, über den Server der Schule |
| **Was geht nicht an die KI?** | Dateinamen (werden zu „Schüler #1“, „Schüler #2“ …), Noten, Klassenlisten | dasselbe |
| **Wo bleiben Arbeiten und Ergebnisse?** | im Arbeitsspeicher, bis die Sitzung endet; Exporte dort, wo die Lehrkraft sie speichert | dasselbe |
| **Erfahrungsschatz** (nur wenn die Lehrkraft Fälle ausdrücklich übernimmt) | auf dem Rechner | auf dem Server der Schule, getrennt je Lehrkraft |

**Namen auf dem Blatt** gehen mit, wenn sie nicht geschwärzt sind. Koreki bietet dafür eine Schwärzung an. Einfacher ist es, Arbeiten mit Nummern statt Namen schreiben zu lassen.

## In fünf Schritten startklar

1. **KI wählen:** lokal über Ollama oder ein Zugang bei Mittwald oder Mistral.
2. **Bei einem Anbieter:** Vertrag zur Auftragsverarbeitung abschließen.
3. **Verarbeitungsverzeichnis ergänzen** (Vorlage unten).
4. **Datenschutzbeauftragte einbeziehen** (Bausteine für die Folgenabschätzung unten).
5. **Eltern und Schüler informieren.**

Wie sich Namen auf dem Blatt schwärzen oder vermeiden lassen, steht im Handbuch unter hilfe.koreki.org.

## Vorlage: Eintrag ins Verarbeitungsverzeichnis

| | |
|---|---|
| **Bezeichnung** | KI-gestützte Unterstützung bei der Korrektur von Leistungsnachweisen (Koreki) |
| **Verantwortlich** | `[Schule, Anschrift, Schulleitung]` |
| **Zweck** | Punktvorschläge und Feedback-Entwürfe, die die Lehrkraft prüft und ändert. Die Note setzt die Lehrkraft. |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. e DSGVO i. V. m. `[Schulgesetz / Schuldatenschutzverordnung des Landes]` |
| **Betroffene** | Schülerinnen und Schüler; Lehrkräfte als Nutzer |
| **Daten** | Inhalt der Arbeit (Text, Bild, Handschrift), ggf. Name auf dem Blatt; Punktvorschläge, Feedback |
| **Empfänger** | `[gewählter KI-Anbieter, z. B. Mittwald CM Service GmbH & Co. KG, Espelkamp]` (Auftragsverarbeiter); bei einem lokalen Modell keiner |
| **Drittland** | keines vorgesehen `[im AVV mit dem Anbieter bestätigen]` |
| **Löschung** | Arbeitsspeicher: mit Sitzungsende. Exporte: nach Aufbewahrungsfrist für Leistungsnachweise `[Frist]`. Erfahrungsschatz: spätestens `[z. B. Schuljahresende]`. Protokolle des Anbieters: `[Frist beim Anbieter erfragen]` |
| **Schutzmaßnahmen** | siehe nächster Abschnitt |

## Bausteine für die Datenschutz-Folgenabschätzung

| Risiko | Was dagegen hilft |
|---|---|
| **Falsche Bewertung** geht unbemerkt in die Note ein | Lehrkraft prüft jeden Vorschlag; Begründung und Vertrauenswert je Aufgabe; Bestätigung vor dem Export |
| **Handschrift falsch gelesen**, auch flüssig klingender Text, der nicht auf dem Blatt steht | Abgleich von erkanntem Text und Bild in der Ansicht „OCR Verifizierung“ |
| **Ungleichbehandlung** wegen Sprachstil oder Herkunft | Stichproben des Herstellers; Lehrkraft prüft; Meldeweg bei Verdacht |
| **Name gelangt an den KI-Anbieter** | Schwärzung; Nummern statt Namen; lokales Modell; AVV mit dem Anbieter |
| **Unbefugter Zugriff** auf Rechner oder Server | eigene Anmeldung je Lehrkraft (am Rechner bzw. über Keycloak) |
| **Beeinflussung** durch Anweisungen im Schülertext | abgesicherte Bewertungsanweisung, geprüft gegen sechs Angriffsarten |

**Was Koreki mitbringt:** verschlüsselte Übertragung; kein Server des Herstellers; Inhalte nur im Arbeitsspeicher; Dateinamen automatisch ersetzt; KI-Ergebnisse als maschinell erzeugt gekennzeichnet; feste Modellversionen; keine Profilbildung über Schülerinnen und Schüler; keine Note ohne Freigabe der Lehrkraft.

Die ausführliche Beschreibung von Zweck, Grenzen und Genauigkeit steht in der **Betriebsanleitung**, die jeder Koreki-Installation beiliegt.

---

*Entwurf, keine Rechtsberatung. Schulrecht ist Landesrecht; die Prüfung durch die Datenschutzbeauftragten der Schule ersetzt dieses Blatt nicht.*

## Quellen (für die Pflege dieses Dokuments)

* Betriebsanleitung und TOM: [`src/legal/betriebsanleitung_v1.7.md`](../../src/legal/betriebsanleitung_v1.7.md), [`src/legal/tom_v1.1.md`](../../src/legal/tom_v1.1.md)
* Schlüssel: Desktop [`src/lib/ai/vault-service.ts`](../../src/lib/ai/vault-service.ts); Community [`src/lib/ai/provider-connection.ts`](../../src/lib/ai/provider-connection.ts) (`MITTWALD_API_KEY`) und [`src/lib/ai/client-settings-gate.ts`](../../src/lib/ai/client-settings-gate.ts)
* Speicherorte Community: [Community Edition Persistence](../technical/community-edition-persistence.md)
* Mittwald: [Data protection (AI Hosting)](https://developer.mittwald.de/docs/v2/platform/aihosting/access-and-usage/data-protection/), [Dienstleisterliste](https://www.mittwald.de/unsere-dienstleister)
* Mistral: [Rechtliches und Datenschutz](https://legal.mistral.ai/)
* Anbieter in Koreki: Desktop-Netzwerksperre [`src/lib/api-client.ts`](../../src/lib/api-client.ts), Empfänger-Satz [`src/lib/datenziel-hinweis.ts`](../../src/lib/datenziel-hinweis.ts), Stand 23.11.2026
* **Word-Fassung** (`public/downloads/koreki-datenschutz-schulen.docx`, Download-Knopf auf /security): wird aus dieser Datei erzeugt, nie von Hand bearbeitet. Nach jeder Änderung `npm run docs:datenschutz-word` und beide Dateien committen; `tests/unit/datenschutz-word-aktuell.test.ts` hält sie gleich. Dieser Abschnitt „Quellen“ kommt nicht in die Word-Datei.
