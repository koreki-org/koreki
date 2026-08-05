---
id: "skill-math-isolated-grading"
name: "Rechenweg- & Ergebnis-Trennung (Einsetzen & Einheiten)"
category: "math-science"
description: "Weist die KI an, das Einsetzen korrekter Zahlenwerte und Einheiten unabhängig von nachgelagerten Rechen- oder Formelfehlern mit vollen Punkten zu bewerten."
---

EINSETZUNGS- & RECHNUNGS-BEWERTUNG (MINT):
- **Fehler-Isolation:** Bewerte den logischen Rechenweg (Formel/Ansatz), das Einsetzen der Werte und das Endergebnis völlig isoliert voneinander.
- **Keine Punkte für Bemühung beim Einsetzen:** Das Einsetzen von Werten muss physikalisch und numerisch korrekt sein. Wenn falsche Zahlenwerte eingesetzt werden, muss das Einsetzungs-Kriterium zwingend **0 Punkte** erhalten.
  * *Trennung von Einsetzen und Ergebnis:* Einsetzungs-Kriterien (z. B. `*_werte` oder `*_einsetzen`) dürfen **NIEMALS** wegen eines Fehlers im darauffolgenden Ergebnis oder wegen der im Ergebnis verwendeten Einheit abgewertet werden. Solange die eingesetzten Größen (die Werte vor dem Gleichheitszeichen) korrekt sind, muss das Einsetzungs-Kriterium die **vollen Punkte** erhalten.
  * *Unabhängigkeit:* Wenn die eingesetzten Zahlenwerte numerisch korrekt sind (oder dem Folgefehler-Prinzip entsprechen), erhält das Einsetzungs-Kriterium die **vollen Punkte**, selbst wenn die zuvor geschriebene Formel eine falsche Variablenbezeichnung enthielt. Ein Fehler im Formelsymbol darf nicht automatisch zu 0 Punkten beim Einsetzen führen.
- **Umfang des Einheiten-Abzugs:** Ein Einheiten-Fehler am Ende einer Rechnung betrifft AUSSCHLIESSLICH das Ergebnis-Kriterium (oder ein explizites Einheiten-Kriterium). Die Kriterien für Formel/Ansatz und Einsetzen bleiben davon unberührt und dürfen wegen der falschen Einheit unter keinen Umständen abgewertet werden. Ziehe für einen Einheitenfehler höchstens die Punkte ab, die der Erwartungshorizont für das Ergebnis vorsieht.
  * *Wann überhaupt abziehen:* Nur wenn der Schüler am Ende eine Zahl notiert und eine sachlich falsche Dimension oder Größenordnung dahinterschreibt (z. B. `cm` statt `m`). Eine Umrechnung in eine physikalisch gleichwertige Einheit ist niemals ein Fehler, solange der Umrechnungsfaktor stimmt. Erfinde keine Regeln wie "die Ausgangseinheit muss beibehalten werden".
- **Zulässige Einheiten beim Einsetzen & Präfix-Ausgleich:** Alle physikalisch korrekten Einheiten und Präfixe (z. B. `1,5 kg` oder `1,5 * 10^3 g` für eine Masse von 1.5 kg, oder `2,5 km` statt `2500 m`) sind beim Einsetzen absolut korrekt. Beim Einsetzen sind zusammenpassende Präfixe (z. B. `km/h` und `s` zur Umrechnung, oder `kg` und `cm` für Dichte) absolut korrekt, solange sie sich mathematisch ausgleichen. Solche physikalisch korrekten Einsetzungen müssen zwingend als **erfüllt** (volle Punkte) gewertet werden.
