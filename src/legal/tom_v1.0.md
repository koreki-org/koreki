# Technische und organisatorische Maßnahmen (TOM)
gemäß Art. 32 DSGVO für **Koreki**

Der Schutz personenbezogener Daten hat bei Koreki höchste Priorität. Die folgenden Maßnahmen gewährleisten die Sicherheit der Verarbeitung:

## 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)
*   **Zutrittskontrolle:** Physischer Schutz der Rechenzentren durch IONOS SE (Standort Deutschland, ISO 27001 zertifiziert). Kein physischer Zugang für Unbefugte.
*   **Zugangskontrolle:** 
    *   Starke Authentifizierung via Logto, verschlüsselte Passwörter, Multi-Faktor-Authentifizierung (MFA) für administrative Zugänge.
    *   **IONOS Datenbank-Schutz:** Der Zugriff auf die zentrale Datenbank ist strikt auf autorisierte Systemkomponenten beschränkt. Administrative Zugriffe erfolgen ausschließlich über gesicherte und verschlüsselte Verbindungen (**SSH-Keys**) und sind durch eine **IP-basierte Firewall** geschützt.
*   **Zugriffskontrolle:** 
    *   Rollenbasiertes Rechtemanagement (RBAC). 
    *   **Admin-Support-Prinzip:** Administratoren greifen auf Nutzerdaten ausschließlich dann zu, wenn dies für Support-Anfragen oder zur Sicherstellung der Systemintegrität zwingend erforderlich ist.
*   **Trennungsgebot (Mandantentrennung):** Daten von unterschiedlichen Schulen oder Organisationen (Workspaces) werden logisch strikt getrennt verarbeitet. Jede Datenbankabfrage ist systemseitig mandantenspezifisch (mittels `workspaceId`) isoliert, um ein "Übersprechen" von Daten zwischen Nutzern zu verhindern.
*   **Verschlüsselung:** Durchgängige **SSL/TLS-Verschlüsselung** (HTTPS) für alle Datenübertragungen. Inhaltsdaten werden im RAM verarbeitet und nicht persistent auf Festplatten gespeichert.

## 2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)
*   **Weitergabekontrolle:** Keine unbefugte Weitergabe von Daten an Dritte. Schnittstellen zu Mistral AI erfolgen über gesicherte, EU-basierte Endpunkte.
*   **Eingabekontrolle (Logging):** 
    *   Alle erfolgreichen Anmeldungen von Lehrkräften am System werden mit Zeitstempel und IP-Adresse im Audit-Log (**PrivacyLog**) protokolliert.
    *   Protokollierung aller datenschutzrelevanten Aktionen (z.B. AVV-Zustimmung) zur lückenlosen Nachverfolgbarkeit.

## 3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b DSGVO)
*   **Verfügbarkeit:** Redundante Auslegung der Hosting-Infrastruktur bei IONOS. Regelmäßige Backups der Metadaten.
*   **Wiederherstellbarkeit:** Definierte Prozesse zur schnellen Wiederherstellung der Systemverfügbarkeit nach technischen Störungen.

## 4. Verfahren zur regelmäßigen Bewertung (Art. 32 Abs. 1 lit. d DSGVO)
*   **Datenschutz-Management:** Regelmäßige Überprüfung der technischen Architektur durch den Principal Architect und Security Officer.
*   **Security-First:** Automatisierte Security-Checks im CI/CD Build-Prozess.

## 5. Besonderheit der Verarbeitung (RAM-only Transit)
Die Inhaltsdaten (Scans und Texte von Schülern) werden ausschließlich im flüchtigen Arbeitsspeicher (RAM) gehalten. Nach Abschluss der KI-Analyse oder Beendigung der Sitzung werden diese Daten physikalisch gelöscht. Eine Speicherung in Datenbanken oder auf Dateisystemen findet für Inhaltsdaten nicht statt.

***
**Stand: 07. April 2026 (v1.1)**
*Koreki Industrial Grade Security Measures*
