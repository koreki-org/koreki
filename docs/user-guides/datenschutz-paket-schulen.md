---
title: "Datenschutz für Schulen: Koreki mit Mittwald"
description: "Was eine Schule wissen und tun muss, bevor ihre Lehrkräfte Koreki Desktop oder Koreki Community mit der KI von Mittwald nutzen. Mit Vorlage fürs Verarbeitungsverzeichnis und Bausteinen für die Datenschutz-Folgenabschätzung."
author: "@security_officer"
date: "2026-11-11"
last_updated: "2026-11-11"
status: "Draft"
domain: "user-guide"
security_classification: "Public"
---

# Datenschutz für Schulen: Koreki mit Mittwald

Für Schulleitung und Datenschutzbeauftragte. Gilt für **Koreki Desktop** (auf dem Rechner der Lehrkraft) und **Koreki Community** (auf einem Server der Schule), jeweils mit einem KI-Zugang, den die Schule bei Mittwald bucht.

## Das Wichtigste

* **Ihre Schule bucht den KI-Zugang bei Mittwald** und schließt dort den Auftragsverarbeitungsvertrag (AVV) ab.
* **Schülerarbeiten gehen nur an Mittwald.** Mittwald speichert die Inhalte nach eigener Angabe nicht und trainiert nicht damit.
* **Koreki selbst bekommt keine Schülerdaten.** Ein Vertrag mit Koreki ist deshalb nicht nötig.
* **Die Note setzt immer die Lehrkraft.** Koreki macht Vorschläge; vor jedem Export bestätigt die Lehrkraft, dass sie geprüft hat.

## Wohin gehen die Daten?

| | Koreki Desktop | Koreki Community |
|---|---|---|
| **Wo läuft Koreki?** | auf dem Rechner der Lehrkraft | auf einem Server der Schule |
| **Anmeldung** | am Rechner (Benutzerkonto des Betriebssystems) | über Keycloak, ein Konto je Lehrkraft |
| **Wo liegt der Mittwald-Schlüssel?** | im Tresor des Betriebssystems | in der Server-Konfiguration, hinterlegt von der Administration |
| **Was geht zu Mittwald?** | Scans und Text der Arbeiten, Musterlösung | dasselbe, über den Server der Schule |
| **Was geht nicht zu Mittwald?** | Dateinamen (werden zu „Schüler #1“, „Schüler #2“ …), Noten, Klassenlisten | dasselbe |
| **Wo bleiben Arbeiten und Ergebnisse?** | im Arbeitsspeicher, bis die Sitzung endet; Exporte dort, wo die Lehrkraft sie speichert | dasselbe |
| **Erfahrungsschatz** (nur wenn die Lehrkraft Fälle ausdrücklich übernimmt) | auf dem Rechner | auf dem Server der Schule, getrennt je Lehrkraft |

**Mittwald protokolliert** IP-Adresse, Schlüssel, Zeitpunkt und Anzahl der verarbeiteten Wörter (Tokens), aber keine Inhalte. Die Modelle laufen auf Mittwalds eigener Infrastruktur.

**Namen auf dem Blatt** gehen mit, wenn sie nicht geschwärzt sind. Koreki bietet dafür eine Schwärzung an. Einfacher ist es, Arbeiten mit Nummern statt Namen schreiben zu lassen.

## Was die Schule tun muss

1. **KI-Zugang bei Mittwald buchen** und den AVV im Kundenportal abschließen. Darin prüfen, ob das KI-Hosting, Schülerarbeiten und Schülerinnen und Schüler erfasst sind; falls nicht, ergänzen lassen.
2. **Verarbeitungsverzeichnis ergänzen** (Vorlage unten).
3. **Datenschutzbeauftragte fragen**, ob eine Datenschutz-Folgenabschätzung nötig ist. Wir empfehlen sie (KI, Minderjährige, Leistungsbewertung); die Bausteine unten decken das Meiste ab.
4. **Landesvorgaben prüfen:** Verlangt das Land oder der Schulträger eine Freigabe? Ist der Personalrat zu beteiligen?
5. **Eltern und Schüler informieren**, zum Beispiel in den Datenschutzhinweisen der Schule.
6. **Lehrkräfte einweisen:** Betriebsanleitung lesen (in Koreki unten verlinkt), Namen schwärzen oder vermeiden.
7. **Technik absichern:**
   * *Desktop:* nur Geräte mit eigener Anmeldung und verschlüsselter Festplatte.
   * *Community:* Anmeldung über Keycloak einschalten; den Betrieb ohne Anmeldung nicht für mehrere Lehrkräfte nutzen.

## Vorlage: Eintrag ins Verarbeitungsverzeichnis

| | |
|---|---|
| **Bezeichnung** | KI-gestützte Unterstützung bei der Korrektur von Leistungsnachweisen (Koreki) |
| **Verantwortlich** | `[Schule, Anschrift, Schulleitung]` |
| **Zweck** | Punktvorschläge und Feedback-Entwürfe, die die Lehrkraft prüft und ändert. Die Note setzt die Lehrkraft. |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. e DSGVO i. V. m. `[Schulgesetz / Schuldatenschutzverordnung des Landes]` |
| **Betroffene** | Schülerinnen und Schüler; Lehrkräfte als Nutzer |
| **Daten** | Inhalt der Arbeit (Text, Bild, Handschrift), ggf. Name auf dem Blatt; Punktvorschläge, Feedback |
| **Empfänger** | Mittwald CM Service GmbH & Co. KG, Espelkamp (Auftragsverarbeiter) |
| **Drittland** | keines vorgesehen `[im AVV mit Mittwald bestätigen]` |
| **Löschung** | Arbeitsspeicher: mit Sitzungsende. Exporte: nach Aufbewahrungsfrist für Leistungsnachweise `[Frist]`. Erfahrungsschatz: spätestens `[z. B. Schuljahresende]`. Mittwald-Protokolle: `[Frist bei Mittwald erfragen]` |
| **Schutzmaßnahmen** | siehe nächster Abschnitt |

## Bausteine für die Datenschutz-Folgenabschätzung

| Risiko | Was dagegen hilft |
|---|---|
| **Falsche Bewertung** geht unbemerkt in die Note ein | Lehrkraft prüft jeden Vorschlag; Begründung und Vertrauenswert je Aufgabe; Bestätigung vor dem Export |
| **Handschrift falsch gelesen**, auch flüssig klingender Text, der nicht auf dem Blatt steht | Abgleich von erkanntem Text und Bild in der Ansicht „OCR Verifizierung“ |
| **Ungleichbehandlung** wegen Sprachstil oder Herkunft | Stichproben des Herstellers; Lehrkraft prüft; Meldeweg bei Verdacht |
| **Name gelangt an Mittwald** | Schwärzung; Nummern statt Namen; AVV mit Mittwald |
| **Unbefugter Zugriff** auf Rechner oder Server | Anmeldung, Verschlüsselung, ein Konto je Lehrkraft |
| **Beeinflussung** durch Anweisungen im Schülertext | abgesicherte Bewertungsanweisung, geprüft gegen sechs Angriffsarten |

**Was Koreki mitbringt:** verschlüsselte Übertragung; kein Server des Herstellers; Inhalte nur im Arbeitsspeicher; Dateinamen automatisch ersetzt; KI-Ergebnisse als maschinell erzeugt gekennzeichnet; feste Modellversionen; keine Profilbildung über Schülerinnen und Schüler; keine Note ohne Freigabe der Lehrkraft.

Die ausführliche Beschreibung von Zweck, Grenzen und Genauigkeit steht in der **Betriebsanleitung**, die jeder Koreki-Installation beiliegt.

---

*Entwurf, keine Rechtsberatung. Schulrecht ist Landesrecht; die Prüfung durch die Datenschutzbeauftragten der Schule ersetzt dieses Blatt nicht.*

## Quellen (für die Pflege dieses Dokuments)

* Betriebsanleitung und TOM: [`src/legal/betriebsanleitung_v1.7.md`](../../src/legal/betriebsanleitung_v1.7.md), [`src/legal/tom_v1.1.md`](../../src/legal/tom_v1.1.md)
* Schlüssel: Desktop [`src/lib/ai/vault-service.ts`](../../src/lib/ai/vault-service.ts); Community [`src/lib/ai/provider-connection.ts`](../../src/lib/ai/provider-connection.ts) (`MITTWALD_API_KEY`) und [`src/lib/ai/client-settings-gate.ts`](../../src/lib/ai/client-settings-gate.ts)
* Speicherorte Community: [Community Edition Persistence](../technical/community-edition-persistence.md)
* Mittwald: [Data protection (AI Hosting)](https://developer.mittwald.de/docs/v2/platform/aihosting/access-and-usage/data-protection/), [Dienstleisterliste](https://www.mittwald.de/unsere-dienstleister), Stand 11.11.2026
