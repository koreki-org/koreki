# Technische und organisatorische Maßnahmen (TOM)
gemäß Art. 32 DSGVO für **Koreki**

Der Schutz personenbezogener Daten hat bei Koreki hohe Priorität. Die folgenden Maßnahmen beschreiben, wie die Sicherheit der Verarbeitung gewährleistet wird.

**Geltungsbereich.** Dieses Dokument beschreibt den vom Anbieter **gehosteten Betrieb**. Bei der Community Edition im Selbstbetrieb und bei der Desktop-Anwendung liegt die Umsetzung dieser Maßnahmen beim jeweiligen Betreiber; Abschnitt 6 benennt, was dort abweicht.

## 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)
*   **Zutrittskontrolle:** Physischer Schutz der Rechenzentren durch IONOS SE (Standort Deutschland, ISO 27001 zertifiziert). Kein physischer Zugang für Unbefugte.
*   **Zugangskontrolle:**
    *   Starke Authentifizierung via Logto, verschlüsselte Passwörter, Multi-Faktor-Authentifizierung (MFA) für administrative Zugänge. In der Community Edition im Mehrbenutzerbetrieb übernimmt Keycloak diese Rolle.
    *   **Datenbank-Schutz:** Der Zugriff auf die zentrale Datenbank ist strikt auf autorisierte Systemkomponenten beschränkt. Administrative Zugriffe erfolgen ausschließlich über gesicherte und verschlüsselte Verbindungen (**SSH-Keys**) und sind durch eine **IP-basierte Firewall** geschützt.
*   **Zugriffskontrolle:**
    *   Rollenbasiertes Rechtemanagement (RBAC).
    *   **Admin-Support-Prinzip:** Administratoren greifen auf Nutzerdaten ausschließlich dann zu, wenn dies für Support-Anfragen oder zur Sicherstellung der Systemintegrität zwingend erforderlich ist.
*   **Trennungsgebot (Mandantentrennung):** Daten unterschiedlicher Schulen oder Organisationen (Workspaces) werden logisch strikt getrennt verarbeitet. Jede Datenbankabfrage ist systemseitig mandantenspezifisch (mittels `workspaceId`) isoliert, um ein „Übersprechen" von Daten zwischen Nutzern zu verhindern.
*   **Verschlüsselung:** Durchgängige **SSL/TLS-Verschlüsselung** (HTTPS) für alle Datenübertragungen.

## 2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)
*   **Weitergabekontrolle:** Keine unbefugte Weitergabe von Daten an Dritte. Koreki kann drei Wege zu einem KI-Modell nutzen; welcher aktiv ist, entscheidet der Betreiber in den Einstellungen:
    *   **Mistral AI** über gesicherte, EU-basierte Endpunkte (Frankreich).
    *   **OpenAI-kompatible Endpunkte**, standardmäßig vorbelegt mit dem Angebot der Mittwald CM Service GmbH & Co. KG (Serverstandort Deutschland).
    *   **Ollama** auf einem Rechner des Betreibers. Auf diesem Weg verlassen die Inhaltsdaten die eigene Infrastruktur nicht.
*   **Eingabekontrolle (Logging):**
    *   Alle erfolgreichen Anmeldungen von Lehrkräften werden mit Zeitstempel und IP-Adresse im Audit-Log (**PrivacyLog**) protokolliert.
    *   Protokollierung aller datenschutzrelevanten Aktionen (z. B. AVV-Zustimmung) zur lückenlosen Nachverfolgbarkeit. Das Protokoll enthält keine Inhaltsdaten.

## 3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)
*   **Verfügbarkeit:** Redundante Auslegung der Hosting-Infrastruktur bei IONOS. Regelmäßige Backups der Metadaten.
*   **Wiederherstellbarkeit:** Definierte Prozesse zur schnellen Wiederherstellung der Systemverfügbarkeit nach technischen Störungen.

## 4. Verfahren zur regelmäßigen Bewertung (Art. 32 Abs. 1 lit. d DSGVO)
*   **Datenschutz-Management:** Regelmäßige Überprüfung der technischen Architektur durch den Principal Architect und den Security Officer.
*   **Security-First:** Automatisierte Sicherheitsprüfungen im CI/CD-Prozess, einschließlich einer Prüfung auf Beeinflussung über den Schülertext.

## 5. Umgang mit Inhaltsdaten
Inhaltsdaten sind Scans und Texte von Schülerinnen und Schülern sowie die daraus erzeugten Rückmeldungen.

**Regelfall: nur im Arbeitsspeicher.** Inhaltsdaten werden im flüchtigen Arbeitsspeicher gehalten und mit dem Ende der Sitzung verworfen. Eine Ablage in der Datenbank oder im Dateisystem findet für sie nicht statt.

**Eine Ausnahme, und sie ist gewollt: der Erfahrungsschatz.** Übernimmt die Lehrkraft einen Fall ausdrücklich in einen Erfahrungsschatz, um künftige Bewertungen daran auszurichten, wird dieser Fall **dauerhaft gespeichert** — mit dem Schülertext und der erwarteten Korrektur. Im gehosteten Betrieb geschieht das in der Datenbank, bei der Desktop-Anwendung und im lokalen Betrieb im Speicher des Browsers auf dem Gerät der Lehrkraft.

Dazu gilt:

*   Der Schritt erfolgt nie automatisch. Er verlangt eine ausdrückliche Handlung („In Erfahrungsschatz übernehmen").
*   Die Lehrkraft kann Fälle und ganze Erfahrungsschätze jederzeit löschen; damit sind die enthaltenen Inhaltsdaten entfernt.
*   Vor dem Übernehmen steht eine Anonymisierung zur Verfügung, mit der Namen aus dem Text entfernt werden können. Sie ist ein Angebot, keine automatische Vorstufe — wer sie nicht nutzt, speichert den Text unverändert.

**Hinweis für Betreiber.** Wer den Erfahrungsschatz in einer Klasse oder Schule einsetzt, sollte die Anonymisierung nutzen oder Schülernamen bereits auf dem Blatt vermeiden. Ein Erfahrungsschatz ist als fachliches Gedächtnis gedacht, nicht als Archiv von Prüfungsleistungen.

## 6. Abweichungen bei Selbstbetrieb und Desktop
*   **Desktop-Anwendung:** Es gibt keinen Server des Anbieters. Zugangsdaten liegen im Tresor des Betriebssystems, Inhaltsdaten verlassen das Gerät nur, wenn ein Cloud-Anbieter eingestellt ist.
*   **Community Edition (Selbstbetrieb):** Der Betreiber stellt Infrastruktur, Anmeldung und Sicherung selbst; die Maßnahmen der Abschnitte 1 und 3 beschreiben dann seine eigene Umgebung, nicht die des Anbieters.
*   In beiden Fällen erhält der Anbieter keinen Zugriff auf Inhaltsdaten.

***
**Stand: 05. September 2026 (v1.1)**
*Koreki Industrial Grade Security Measures*
