# Compliance — KI-Verordnung (VO (EU) 2024/1689)

**Diese Seite ist die Landkarte.** Sie sagt für jede Anforderung, wo die Antwort steht und wie es darum steht — mehr nicht. Die Antworten selbst stehen in den verlinkten Dokumenten.

Wer wissen will, was noch fehlt, liest diese Seite. Wer wissen will, warum etwas so ist, folgt dem Link.

*Stand: 03.09.2026*

> **Was hier öffentlich ist und was nicht.** Diese Seite ist öffentlich. Die dahinterliegenden Unterlagen — technische Dokumentation nach Anhang IV, Risikoregister, Selbsteinschätzung, Entscheidungsprotokoll und die Nachweis-Läufe — sind es **nicht**.
>
> Das ist kein Versäumnis, sondern die vorgesehene Form: Artikel 11 verlangt, die technische Dokumentation zu **erstellen** und aktuell zu halten, Artikel 18 verlangt, sie zehn Jahre lang für die zuständigen Behörden **bereitzuhalten**. Eine Veröffentlichungspflicht besteht nicht. Die Unterlagen enthalten offene Punkte, interne Abwägungen und eine ungeschönte Liste eigener Fehler; sie sind für Behörden und Betreiber gedacht, nicht für die allgemeine Öffentlichkeit.
>
> **Behörden und Betreiber erhalten sie auf Anfrage.** Die Kontaktangabe steht in der Betriebsanleitung, die mit der Anwendung ausgeliefert wird.

---

## Die Anforderungen

| Artikel | Was verlangt wird | Wo die Antwort steht | Stand |
|---|---|---|---|
| **Art. 4** | KI-Kompetenz bei Anbieter und Betreiber | [betriebsanleitung_v1.3.md](../src/legal/betriebsanleitung_v1.3.md) §5 | erfüllt |
| **Art. 5** | Verbotene Praktiken | `selbsteinschaetzung.md` | erfüllt — keine Emotionserkennung, kein Social Scoring |
| **Art. 6 Abs. 3** | Einstufung als Hochrisiko | `selbsteinschaetzung.md` | Entwurf |
| **Art. 9** | Risikomanagement | `risikomanagement.md` | erfüllt — 16 Risiken, 3 offene Punkte |
| **Art. 10 Abs. 6** | Daten-Governance (nur Testdaten) | `anhang-iv.md` §2.4 | Entwurf — Referenzsatz vorhanden, aber dünn |
| **Art. 11 + Anhang IV** | Technische Dokumentation | `anhang-iv.md` | Entwurf — 22 offene Punkte |
| **Art. 12** | Protokollierung der Läufe | [ai-protocol.ts](../src/lib/ai-protocol.ts) · `anhang-iv.md` §3.4 | erfüllt |
| **Art. 13** | Betriebsanleitung | [betriebsanleitung_v1.3.md](../src/legal/betriebsanleitung_v1.3.md) | erfüllt |
| **Art. 14** | Menschliche Aufsicht | `anhang-iv.md` §3.3 | erfüllt — Bestätigung vor Export |
| **Art. 15** | Genauigkeit, Robustheit, Sicherheit | `anhang-iv.md` §4 | erfüllt — gemessen, Schwellen festgelegt |
| **Art. 16** | Pflichten des Anbieters | `anhang-iv.md` §1.2 | **blockiert** — Anbieter nicht benannt |
| **Art. 17** | Qualitätsmanagementsystem | `qualitaetsmanagement.md` | Entwurf — zwölf von dreizehn Punkten belegt |
| **Art. 25** | Rollenverteilung in der Wertschöpfungskette | `anhang-iv.md` §1.2 | erfüllt |
| **Art. 26** | Pflichten der Betreiber | [betriebsanleitung_v1.3.md](../src/legal/betriebsanleitung_v1.3.md) | erfüllt |
| **Art. 43 + Anhang VI** | Konformitätsbewertung (interne Kontrolle) | `anhang-iv.md` §8 | **blockiert** — braucht Anbieter |
| **Art. 47** | EU-Konformitätserklärung | — | **blockiert** — braucht Anbieter |
| **Art. 49** | Registrierung in der EU-Datenbank | `selbsteinschaetzung.md` | **blockiert** — braucht Anbieter |
| **Art. 50** | Kennzeichnung KI-erzeugter Inhalte | [ai-disclosure.ts](../src/lib/ai-disclosure.ts) · `anhang-iv.md` §3.6 | erfüllt |
| **Art. 72** | Beobachtung nach Inverkehrbringen | `anhang-iv.md` §9 | Entwurf |
| **Art. 73** | Meldung schwerwiegender Vorfälle | `anhang-iv.md` §9.6 | Entwurf — Eingangsweg steht, Meldung an die Behörde braucht den Anbieter |
| **Art. 111 Abs. 2** | Bestandsschutz für Altsysteme | `selbsteinschaetzung.md` | erfüllt |

## Was das zusammenfasst

**Vier Zeilen hängen an einer einzigen Sache:** Art. 16, 43, 47 und 49 sind mit *„braucht Anbieter"* blockiert. Art. 73 nur zur Hälfte — der Weg, auf dem eine Schule einen Vorfall meldet, steht; die Meldung an die Marktaufsicht setzt den benannten Anbieter voraus. Solange Rechtsform und Anschrift nicht feststehen, ist keine davon zu schließen — und mit der Angabe fallen alle fünf auf einmal.

Das ist bewusst vertagt: Ein Inverkehrbringen im Sinne der Verordnung findet derzeit nicht statt, und die Hochrisiko-Pflichten gelten erst ab dem **02.12.2027** (Digital Omnibus, VO (EU) 2026/1744). Die Transparenzpflicht aus Art. 50 gilt dagegen seit dem **02.08.2026** — sie ist erfüllt.

**Keine Zeile ist mehr unbearbeitet.** Art. 4 (KI-Kompetenz) und Art. 17 (Qualitätsmanagementsystem) waren am 03.09.2026 die letzten beiden Lücken und wurden geschlossen: Die Betriebsanleitung erklärt jetzt in fünf Punkten, was eine Lehrkraft über das System wissen muss; das Qualitätsmanagement beschreibt das Verfahren, das ohnehin lief — nichts davon wurde für die Verordnung erfunden.

---

## Die Dokumente (nicht öffentlich)

| Datei | Inhalt |
|---|---|
| `anhang-iv.md` | Technische Dokumentation nach Anhang IV. **Autark** — verweist für inhaltliche Angaben auf keine anderen Dokumente. |
| `risikomanagement.md` | Risikomanagement nach Art. 9. Register mit 16 Einträgen, Maßnahmenhierarchie, Metriken, Schwellenwerte. |
| `selbsteinschaetzung.md` | Einstufung: Warum Koreki unter Anhang III Nr. 3 fällt und was daraus folgt. |
| `entscheidungen.md` | Was der Anbieter wann festgelegt hat, mit Begründung. |
| `leitlinien.md` | Auszüge und Auslegungshilfen zur Verordnung. |
| `qualitaetsmanagement.md` | Qualitätsmanagementsystem nach Art. 17, verhältnismäßig zur Ein-Personen-Organisation. |
| `betriebsanleitung-entwurf.md` | Arbeitsfassung. Die **ausgelieferte** Betriebsanleitung liegt unter [`src/legal/`](../src/legal/) und wird mit der Anwendung versioniert. |

## Die Nachweise

Alles unter `nachweise/` ist **ausführbar** — kein Ergebnis darin ist von Hand getippt. Die Verzeichnisse selbst sind nicht öffentlich; die Aufrufe stehen hier, damit nachvollziehbar ist, wie die Zahlen entstehen.

| Verzeichnis | Was es prüft | Aufruf |
|---|---|---|
| `nachweise/genauigkeit/` | Trifft Koreki die Sollpunktzahl? 12 Referenzfälle aus 12 Fächern. | `npm run genauigkeit:messen` |
| `nachweise/bias/` | Hängt die Punktzahl am Sprachregister? | `npm run test:bias` |
| `nachweise/robustheit/` | Kann Schülertext die Bewertung beeinflussen? | `npm run test:injection` |
| `nachweise/modellwechsel/` | Darf eine neue Modellversion in Produktion? | `npm run test:modellwechsel` |
| `nachweise/determinismus/` | Liefert dieselbe Eingabe dieselbe Punktzahl? Fallsammlung und Berichte; der Lauf selbst liegt in `tests/integration/`. | `npm run test:determinism` |

Die Läufe kosten echte Modellaufrufe und sind deshalb nicht Teil der Standard-Testsuite. Gegen ein lokales Ollama kosten sie kein Geld.

---

## Vertragsunterlagen

Nicht Teil der KI-Verordnung, aber im selben Verzeichnis, weil sie zur selben Sache gehören — ebenfalls nicht öffentlich:

| Datei | Inhalt |
|---|---|
| `agb-draft.md` | Allgemeine Geschäftsbedingungen |
| `avv-draft.md` | Auftragsverarbeitungsvertrag nach Artikel 28 DSGVO |
| `dynamic-legal-system.md` | Wie die Rechtsdokumente versioniert und ausgeliefert werden |
| `anfrage-ki-service-desk.md` | Anfrage an den KI-Service-Desk der Bundesnetzagentur zur Einordnung |

---

## Regeln für dieses Verzeichnis

1. **Anhang IV bleibt autark.** Es verweist für inhaltliche Angaben nicht auf `docs/` — regulatorische Dokumentation darf nicht davon abhängen, dass eine technische Doku aktuell ist.
2. **Diese Landkarte wird bei jeder Änderung mitgezogen.** Ein Dokument, das eine Anforderung erfüllt, ohne dass die Tabelle es weiß, ist für einen Prüfer nicht auffindbar.
3. **`[OFFEN]` heißt offen, nicht vergessen.** Jede Markierung nennt den Grund. Ist der Grund weggefallen, gehört die Markierung weg — am 03.09.2026 standen fünf Markierungen in Anhang IV, deren Gegenstand längst erledigt war.
4. **Nachweise werden erzeugt, nicht behauptet.** Steht eine Zahl in einem Dokument, muss ein Lauf unter `nachweise/` sie hervorbringen können.
