---
title: "Koreki Schnellanleitung: Von der Landung bis zum Schülerfeedback"
description: "Koreki Dokumentation: Koreki Schnellanleitung: Von der Landung bis zum Schülerfeedback"
author: "@product_manager"
date: "2026-04-05"
last_updated: "2026-04-07"
status: "Approved"
domain: "user-guide"
security_classification: "Public"
---

# Koreki Schnellanleitung: Von der Landung bis zum Schülerfeedback

## 1. Executive Summary & Kontext

Willkommen bei Koreki! Diese Anleitung führt dich Schritt für Schritt durch den gesamten Workflow – exakt so, wie du ihn in der Anwendung erlebst. 

> [!NOTE]
> Koreki ist flexibel einsetzbar: Ob am **Einzelplatz (Lokal)**, als **Schul-Instanz (On-Prem)** oder über unsere **SaaS-Cloud**. Die Kernfunktionen bleiben identisch, wobei die technische Infrastruktur (Datenbank & Auth) je nach Tier variiert. Details findest du in der [Architektur](../technical/architecture.md).
> 
> **Deployment Tiers:**
> 1. **SaaS-Cloud (Public Trial):** Sofort einsatzbereit zum Testen mit anonymisierten Demo-Daten. Keine Installation nötig.
> 2. **On-Premise (Schul-Instanz):** Volle Kontrolle über Daten und Hosting innerhalb der Schulinfrastruktur. Empfohlen für den Schuleinsatz.
> 3. **Local-First (Einzelplatz):** Maximale Privatsphäre, läuft direkt auf deinem Gerät. Ideal für die private Korrektur.

> [!IMPORTANT]
> **DATENSCHUTZ-HINWEIS (SaaS-Trial):** In der aktuellen SaaS-Version dürfen aus rechtlichen Gründen **KEINE ECHTEN SCHÜLERDATEN** verarbeitet werden. Bitte nutzen Sie für die Evaluation der SaaS-Cloud ausschließlich fiktive Testdaten oder geschwärzte Muster. Der produktive Einsatz mit realen Namen ist ausschließlich in der **Desktop Edition** oder der **On-Premise Edition** (Community) gestattet.

---

### 1. Der Einstieg (Landing Page)
Auf der Landing Page erhältst du einen Überblick über die Vorteile von Koreki. Klicke auf **"Jetzt starten"**, um zum Login-Bereich zu gelangen.

---

### 2. Registrierung & Anmeldung
Koreki nutzt **Logto** für eine sichere Authentifizierung. Erstelle ein neues Konto (**Sign Up**) oder melde dich mit deinen bestehenden Zugangsdaten an. Nach der ersten Registrierung erhältst du automatisch **20 Start-Credits**, um die Funktionen in der Trial-Umgebung zu testen. Während wir höchste Sicherheitsstandards für die Infrastruktur nutzen, dient die SaaS-Cloud aktuell primär der Demonstration und Evaluation.

---

### 3a. Die Wahl des Modus (STANDARD vs. PURE)
Ein entscheidender Schritt für deinen Workflow:
*   **STANDARD-Modus:** Die Verarbeitung erfolgt über unsere optimierte Cloud-Infrastruktur.
*   **PURE-Modus:** Maximale Privatsphäre. Die Inhaltsdaten werden direkt von deinem Browser an die KI-Schnittstelle gesendet, ohne das Koreki-Backend zu berühren.

---

### 4. App-Übersicht (Dashboard)
Nach dem Login landest du im Dashboard. Hier siehst du deine letzten Sitzungen, deinen Credit-Stand und gelangst zu den zentralen Funktionen wie dem **Expert Center**.

---

### 4a. Das Expert Center: Expertise, Erfahrungsschatz & Intelligenz
Im **Expert Center** (oben rechts in der Menüleiste) stellst du die drei tragenden Säulen deiner KI-Korrektur ein:

1. **Expertise (Fachprofile):** Hier definierst du deine fachlichen und pädagogischen Leitplanken (z. B. Fokus auf Fachsprache, Strenge der Bewertung), die die KI bei jeder Korrektur berücksichtigen soll.
2. **Erfahrungsschatz (GradingMemory):** Hier kalibrierst du das fallbasierte Gedächtnis deiner KI. Hinterlege reale oder beispielhafte Korrekturfälle, damit die KI aus deinen früheren Bewertungen lernt und Folgefehler oder mathematische Äquivalenzen absolut konsistent nach deinen eigenen Maßstäben bewertet.
3. **Intelligenz (KI-Parameter):** Steuere die Leistungskraft und Denkweise der KI. Aktiviere hier das **Deep Thinking (Hohe Genauigkeit)** für komplexe mathematische oder logische Prüfungen, oder passe Parameter wie die *Kreativität (Temperature)* an.
   > [!TIP]
   > **Modell-Empfehlung:** Für die beste Bilderkennung (OCR/Handschriften), das Layout-Mapping und die anschließende Korrektur empfehlen wir dringend die Nutzung von **Qwen 3.6** (speziell `qwen3.6:35b`). Dieses Modell liefert derzeit mit Abstand die präzisesten Ergebnisse und vermeidet strukturelle Parsing-Fehler.

---

### 5. Musterlösung hinterlegen
Erstelle eine neue Sitzung und lade deine **Musterlösung** hoch (PDF, Bild oder Text). Dies ist die absolute Referenz, an der die KI alle Schülerarbeiten misst.

> [!TIP]
> **Rechengraphen für mathematische Aufgaben:** Nach dem Upload der Musterlösung kannst du für Rechenaufgaben optional Rechengraphen erstellen lassen. Dies erlaubt es, den Rechenweg deterministisch nachzurechnen, um Folgefehler exakt zu erkennen.

---

### 6. Klassenarbeitsstapel hochladen
Lade den gesamten Stapel der Schülerarbeiten hoch. Koreki unterstützt:
*   **Scans & PDFs:** Multi-Uploads von Bildern (z.B. Scan-Fotos) oder mehrseitigen PDF-Dokumenten.
*   **Moodle-Exporte (XLSX/CSV):** Digitale Quiz-Exporte können direkt hochgeladen werden. Koreki liest den Text ein und weist ihn automatisch den Aufgaben zu (kein OCR nötig).

---

### 7. Ausgangspunkt für die Vorbereitung
Nach dem Upload befinden sich deine Dokumente im **Vorbereitungs-Status**. Dies ist deine Arbeitsübersicht ("Start"), von der aus du nun die notwendigen Schritte (Aufteilen, Anonymisieren und OCR) einleitest. Die eigentliche KI-Korrektur erfolgt erst nach Abschluss dieser Vorbereitungen.

---

### 8. Klassenarbeitsstapel aufteilen (PDF-Schnitt)
Hast du ein großes PDF mit allen Arbeiten hochgeladen? Im Split-Dialog kannst du:
1.  Eine **Excel-Klassenliste** importieren, um Namen automatisch zuzuordnen.
2.  Die Seiten manuell den Schülern zuweisen.
3.  Die "Aufteilung starten", um die Dokumente für die nächsten Schritte vorzubereiten.

*Nach dem Aufteilen siehst du die fertige Liste der zu korrigierenden Schüler.*

---

### 9. Namen schwärzen (Anonymisierung)
Sicherheit geht vor: Nutze das integrierte **Redaktions-Tool**, um Namen oder sensible Schülerdaten direkt im Browser zu schwärzen. Diese Daten verlassen deinen Rechner niemals im Klartext.

---

### 10. OCR-Endergebnis & Plausibilitätsprüfung
Koreki extrahiert den Text per OCR. Anhand der **Plausibilitätsprüfung** (OCR-Confidence) erkennst du sofort, ob die KI den Text sicher lesen konnte. Bei geringer Sicherheit (z.B. durch unleserliche Handschrift) solltest du den Text kurz manuell validieren.

---

### 11. KI-Korrektur abschließen
Nachdem alle Dokumente aufgeteilt, geschwärzt und per OCR erkannt wurden, startest du die eigentliche **KI-Korrektur**. Nach der fachlichen Analyse zeigt dir das **KI-Vertrauen** (Correction Confidence) an, wie sicher sich die KI bei der Punktevergabe war. Werte unter 90% werden markiert, damit du hier gezielt "nachkorrigieren" kannst.

---

### 12. Die Einschätzungsliste
In der **Einschätzungsliste** erhältst du die Gesamtübersicht: Punkte, Fehler-Feedback und ein vorläufiger Notenvorschlag basierend auf deinem Notenschlüssel sind hier auf einen Blick einsehbar.

---

### 13. Schülerfeedback & Export
Der finale Schritt: Exportiere die Ergebnisse als **Notenliste (Excel)** für dein Klassenbuch oder generiere ein **Feedback-ZIP** mit individuellen PDFs für jeden Schüler.

---

> [!TIP]
> Hast du Fragen zu den Credits oder dem PURE-Mode? Schau in unsere [Technischen Dokumente](../technical/architecture.md) oder kontaktiere das Koreki-Team direkt über das Portal.
