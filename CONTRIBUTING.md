# Mitwirkung bei Koreki (Contributing Guidelines) 🏮

Vielen Dank für Ihr Interesse an der Verbesserung von Koreki! Wir freuen uns über Beiträge der Community, um das Tool für Lehrkräfte noch besser zu machen.

## 🏛️ Rechtlicher Rahmen (Contributor License Agreement)

Durch die Einreichung von Beiträgen (Code, Dokumentation, Grafiken, etc.) an dieses Repository erklären Sie sich mit den folgenden Bedingungen einverstanden:

1.  **Rechteeinräumung**: Sie gewähren dem Projektinhaber (Andreas Heid) ein unbefristetes, weltweites, nicht-exklusives, unentgeltliches, unwiderrufliches Urheberrechtsnutzungsrecht, Ihre Beiträge zu reproduzieren, zu modifizieren, abgeleitete Werke zu erstellen, öffentlich auszustellen, unterzulizenzieren und zu verbreiten.
2.  **Kommerzielle Verwertung**: Sie erkennen ausdrücklich an, dass der Projektinhaber das Recht hat, die Software (einschließlich Ihrer Beiträge) unter einem Dual-Licensing-Modell für kommerzielle Zwecke zu nutzen und an Dritte zu lizenzieren.
3.  **Verzicht auf Vergütung**: Sie bestätigen, dass Ihre Beiträge freiwillig erfolgen und dass Sie keinen Anspruch auf finanzielle Entschädigung oder Gewinnbeteiligung aus der aktuellen oder zukünftigen Nutzung der Software haben.
4.  **Urheberschaft**: Sie garantieren, dass Sie der Urheber der eingereichten Beiträge sind oder über die notwendigen Rechte verfügen, um diese Lizenz zu gewähren.

## 🛠️ Entwicklungsprozess

1.  **Issues**: Bitte suchen Sie zuerst nach bestehenden Issues, bevor Sie ein neues eröffnen.
2.  **Pull Requests & Pushes**:
    *   Erstellen Sie für jede Änderung einen eigenen Branch.
    *   **Pre-Push Hook**: Jeder `git push` löst automatisch einen lokalen Security-Audit (`npm run security-check`) und einen Type-Check (`npx tsc --noEmit`) aus. Ohne erfolgreichen Durchlauf wird der Push blockiert.
    *   Stellen Sie sicher, dass alle Tests (`npm test`) lokal erfolgreich durchlaufen.
    *   Beschreiben Sie Ihre Änderungen klar und präzise.

## 🧪 Qualitätsstandards

Koreki folgt einem **Industrial-Grade** Anspruch:
- Code muss den bestehenden Architektur-Mustern folgen.
- Neue Features müssen durch Unit- oder Integration-Tests abgesichert werden.
- Die Dokumentation muss bei Architektur-Änderungen aktualisiert werden.

---
*Durch das Absenden eines Pull Requests bestätigen Sie, dass Sie die oben genannten Bedingungen der Rechteeinräumung gelesen haben und akzeptieren.*
