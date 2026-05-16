---
title: "Digital Feedback Slips"
description: "Sichere und DSGVO-konforme Verteilung von Schülerfeedback via QR-Codes (Zero-Knowledge)."
author: "@principal_architect"
date: "2026-05-16"
last_updated: "2026-05-16"
version: "1.1.0" (Added PDF Export & QR Hardening)
status: "Approved"
domain: "user-guide"
security_classification: "Public"
---

# Digital Feedback Slips

## 1. Executive Summary & Kontext
> [!NOTE]
> **Zusammenfassung:** Ermöglicht Lehrern die Verteilung von detailliertem Schülerfeedback über physische Rückgabe-Slips mit QR-Codes. Die Daten werden client-seitig verschlüsselt und niemals auf Koreki-Servern gespeichert.
> **Zielgruppe:** Lehrer (Nutzer), Administratoren, Datenschutzbeauftragte.

In vielen Schulen ist die Verteilung von digitalem Feedback aufgrund strenger Datenschutzauflagen (keine Cloud-Speicherung von Schülerdaten) schwierig. Die Digital Feedback Slips lösen dieses Problem durch eine „Offline-First“ Distribution, bei der das Feedback direkt im URL-Anker des QR-Codes transportiert wird.

---

## 2. Architektur & Systemdesign
> [!TIP]
> Die Lösung basiert auf dem **Zero-Knowledge-Prinzip**. Der Server liefert lediglich den statischen Viewer aus, sieht aber niemals den Inhalt des Feedbacks.

```mermaid
sequenceDiagram
    participant T as Lehrer (Browser/Desktop)
    participant S as Koreki Server
    participant ST as Schüler (Handy)

    T->>T: Korrektur & Feedback-Erstellung
    T->>T: Kompression & Verschlüsselung (LZString)
    T->>T: Generierung von QR-Code & PIN
    T->>T: Druck der Slips & Verteilung
    ST->>ST: Scan QR-Code
    ST->>S: Request Viewer Shell (/view)
    S-->>ST: Response HTML/JS (Viewer)
    ST->>ST: Eingabe PIN
    ST->>ST: Dekomprimierung & Entschlüsselung im Browser-Cache (#)
    ST->>ST: Anzeige des Premium-Feedbacks
```

---

## 3. Implementierung & Nutzung
Das Feature ist nahtlos in den **BatchProcessor** integriert.

### Nutzung für Lehrer:
1. Nach Abschluss der Korrekturen in der **ExportToolbar** auf „Digitale Slips“ klicken.
2. Im Export-System stehen zwei Optionen zur Verfügung:
   * **PDF Export (Empfohlen):** Generiert ein hochauflösendes PDF-Dokument mit optimiertem Layout und großen Namen für den Direktdruck.
   * **Direktdruck:** Browserbasierte Druckansicht der Slips.
3. Jeder Slip enthält:
   * **Name des Schülers** (Extra groß für die Zuordnung)
   * **Punkteübersicht** (Erreichte Punkte / Gesamtpunkte)
   * **QR-Code** (Optimierte Kapazität durch Level L)
   * **4-stelliger PIN** (Deterministisch & Sicher)
4. Die Slips ausdrucken, an den gestrichelten Linien ausschneiden und verteilen.

### Nutzung für Schüler:
1. QR-Code scannen.
2. PIN vom Slip eingeben.
3. Detailliertes Feedback (Aufgaben-Punkte, Korrekturen, Folgefehler) einsehen.

---

## 4. Security & Compliance
> [!IMPORTANT]
> Dies ist das sicherste Distributions-Verfahren in Koreki, da es die DSGVO-Anforderungen durch technische Isolation (Privacy by Design) übererfüllt.

* **Datenverarbeitung:** Es werden **keine personenbezogenen Daten** (PII) auf Koreki-Servern gespeichert. Das Feedback existiert nur auf dem Gerät des Lehrers und temporär im Browser-RAM des Schülers.
* **Authentifizierung:** Ein 4-stelliger PIN schützt vor neugierigen Blicken (Sicherheitsfaktor „Wissen“).
* **Transport:** Die Datenübertragung zum Schüler erfolgt verschlüsselt (TLS) und die Daten selbst sind im URL-Hash verpackt, der niemals an den Webserver gesendet wird.

---

## 5. Technische Kapazitäten & Limits
> [!CAUTION]
> Obwohl QR-Codes sehr effizient sind, gibt es physikalische Limits für die Datenmenge.

* **Kapazität:** Durch den Wechsel auf **Error Correction Level L** wurde die Kapazität auf ca. **2.900 komprimierte Zeichen** (~5.000-6.000 Zeichen Reintext) erhöht. Dies entspricht etwa 1.5 bis 2 vollen DIN-A4-Seiten Feedback.
* **Safety-Checks:** Das System prüft die Datenmenge vor der Generierung. Bei Überschreitung wird eine Warnung ausgegeben, um fehlerhafte QR-Codes oder Browser-Crashes zu verhindern.

---

## 6. Testing & Referenzen
* **Unit-Tests:** `tests/unit/distribution.test.ts` (Encoding/Decoding Logic)
* **Integration-Tests:** `tests/integration/DigitalSlipsModal.test.tsx`
* **Technologien:** LZ-String (Kompression), jsPDF (PDF-Generierung), qrcode.react (QR-Generierung).
