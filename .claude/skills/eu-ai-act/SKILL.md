---
name: eu-ai-act
description: Arbeitsweise mit den Unterlagen zur KI-Verordnung — wo was liegt, wer entscheidet, und warum keine Zahl von Hand eingetragen wird
---

# Skill: KI-Verordnung (VO (EU) 2024/1689)

Dieses Dokument beschreibt, **wie** an den Compliance-Unterlagen gearbeitet wird. Es ist die Referenz für den **Product Manager**, der die regulatorische Verantwortung trägt.

> **Dieser Skill enthält bewusst keine Zahlen, keine Fristen und keinen Sachstand.**
>
> Genau daran ist das Projekt schon einmal gescheitert: Am 03.09.2026 standen in der technischen Dokumentation fünf `[OFFEN]`-Markierungen, deren Gegenstand am selben Tag erledigt worden war. Dieselbe Tatsache stand an drei Stellen ohne Verbindung, und keine wusste von den anderen. Ein Skill, der Messwerte oder Zählstände wiederholt, ist am Tag der nächsten Messung falsch — und niemand merkt es.
>
> Was hier steht, sind Verfahren. Was gilt, steht in `compliance/README.md`.

---

## 1. Die Landkarte ist der Einstieg

`compliance/README.md` bildet jede Anforderung der Verordnung auf ihre Fundstelle ab und nennt den Stand. **Wer wissen will, was fehlt, liest diese Seite — nicht die Dokumente.**

Vor jeder Aussage zum Stand der Compliance wird die Landkarte gelesen. Aussagen aus dem Gedächtnis oder aus einem einzelnen Dokument sind unzulässig: Ein Dokument kennt seinen eigenen Abschnitt, nicht die Lage.

**Pflicht bei jeder Änderung:** Wer eine Anforderung erfüllt, zieht die Landkarte mit. Ein Dokument, das eine Anforderung beantwortet, ohne dass die Tabelle es weiß, ist für einen Prüfer nicht auffindbar. Erzwungen durch `tests/unit/compliance-landkarte.test.ts` — tote Verweise und nicht aufgeführte Dokumente lassen den Test fallen.

## 2. Wer entscheidet

**Fachliche Festlegungen gehören dem Anbieter, nicht dem Agenten.** Dazu zählen: Schwellenwerte, Prüfrhythmus, Gesamtbeurteilung des Restrisikos, Zweckbestimmung und ihre Grenzen, Anbieterangabe, Umgang mit Sicherheitsmeldungen, Umfang des Referenzsatzes.

Bei solchen Punkten wird **vorgeschlagen und gefragt**, nicht entschieden. Ein fertig formulierter Vorschlag ist hilfreich; ihn eigenmächtig einzutragen ist es nicht — die Verordnung schreibt diese Beurteilungen ausdrücklich dem Anbieter zu, und eine Entscheidung ohne ihn wäre eine Fälschung.

Jede getroffene Entscheidung wird in `compliance/entscheidungen.md` festgehalten: **was, wann, warum — und wann sie wegfällt.** Die Wegfall-Bedingung ist der wichtigste Teil. Ohne sie weiß später niemand, wovon die Entscheidung ausging.

## 3. Nachweise werden erzeugt, nicht behauptet

**Steht eine Zahl in einem regulatorischen Dokument, muss ein Lauf unter `compliance/nachweise/` sie hervorbringen können.** Kein Ergebnis wird getippt.

Die Läufe kosten echte Modellaufrufe und sind deshalb nicht Teil der Standard-Testsuite; gegen ein lokales Ollama kosten sie kein Geld. Welche es gibt und wie sie heißen, steht in der Landkarte.

**Nach jeder Messung** werden die Zahlen in allen betroffenen Dokumenten nachgezogen — technische Dokumentation, Risikoregister und die ausgelieferte Betriebsanleitung. Eine Zahl, die an einer Stelle steht und an zwei anderen veraltet ist, ist schlimmer als keine.

**Vor dem Übernehmen einer Zahl:** Prüfe, ob der Messaufbau dem entspricht, was Lehrkräfte tatsächlich auslösen. Am 02.09.2026 lief eine vollständige Messung ohne die standardmäßig aktiven Bewertungs-Skills und maß damit eine Konfiguration, die es in der Oberfläche nicht gibt. Die Nutzlast der Messung gehört Feld für Feld gegen `useCorrectionRun.ts` geprüft.

## 4. Regulatorische Dokumente bleiben autark

Die technische Dokumentation nach Anhang IV und das Risikoregister verweisen für **inhaltliche Angaben** nicht auf `docs/`. Sie nennen Quelldateien und ausführbare Befehle, keine Beschreibungen anderer Dokumente.

Der Grund: Regulatorische Unterlagen dürfen nicht davon abhängen, dass eine technische Dokumentation aktuell ist. Die `docs/` werden **nach** den Compliance-Unterlagen nachgezogen, nie umgekehrt.

## 5. `[OFFEN]` heißt offen, nicht vergessen

Jede Markierung nennt den Grund, warum die Angabe heute nicht belegbar ist. Drei Sorten sind zu unterscheiden — und die Landkarte hält sie auseinander:

* **offen** — noch nicht bearbeitet.
* **vertagt** — bewusst zurückgestellt, mit Begründung und Bedingung für die Wiedervorlage.
* **blockiert** — hängt an einer Angabe, die noch nicht feststeht.

**Ist der Grund weggefallen, muss die Markierung weg.** Das ist keine Kosmetik: Eine Markierung, die etwas als fehlend nennt, was vorhanden ist, macht das ganze Dokument unglaubwürdig — ein Prüfer weiß dann bei keiner Angabe, ob sie noch stimmt.

Vor jeder Durchsicht: Alle `[OFFEN]`-Stellen gegen den tatsächlichen Stand prüfen, nicht nur die neu hinzugekommenen.

## 6. Was öffentlich ist

**Öffentlich ist allein die Landkarte** (`compliance/README.md`). Die Unterlagen dahinter sind es nicht — die `.gitignore` schließt `compliance/*` aus und nimmt allein die Landkarte wieder auf.

Das ist die vorgesehene Form: Artikel 11 verlangt, die technische Dokumentation zu **erstellen** und aktuell zu halten, Artikel 18, sie zehn Jahre für Behörden **bereitzuhalten**. Eine Veröffentlichungspflicht besteht nicht.

Die Unterlagen enthalten offene Punkte, interne Abwägungen und eine ungeschönte Liste eigener Fehler. Einzelne Einträge lesen sich aus dem Zusammenhang gerissen anders, als sie gemeint sind. Sie gehören Behörden und Betreibern.

**Wer etwas veröffentlichen will, fragt vorher.** Und prüft, dass die öffentliche Seite auf nichts Nicht-Öffentliches verlinkt — ein toter Link ist schlimmer als kein Link, weil man ihm glaubt.

## 7. Die Anbieterangabe ist der große Hebel

Mehrere Anforderungen hängen an einer einzigen Sache: der Rechtsform mit Anschrift. Welche das sind, zeigt die Landkarte.

**Nicht ins Repository.** Name und Anschrift kommen zur Laufzeit aus `NEXT_PUBLIC_LEGAL_*` (`src/config/legal-contact.ts`); die ausgelieferten Rechtsdokumente enthalten nur Platzhalter, die beim Ausliefern ersetzt werden (`setzeAnbieterEin` in `src/lib/legal.ts`). Der Hash wird über die **Vorlage** gebildet, nicht über den eingesetzten Text — sonst hätte jede Instanz einen anderen Hash für dasselbe Dokument. Erzwungen durch `tests/unit/anbieteridentitaet-governance.test.ts`.

## 8. Was ausgeliefert wird, muss auffindbar sein

Artikel 13 verlangt, dass die Betriebsanleitung dem System **beiliegt**. Eine Seite, zu der kein Link führt, liegt nicht bei.

Am 03.09.2026 war die Betriebsanleitung zwar in jeder Betriebsart ausgeliefert, aber allein aus dem AVV-Ablauf verlinkt — den es nur im gehosteten Dienst gibt. Wer selbst betrieb, fand sie nie.

**Bei jeder Änderung an ausgelieferten Rechtsdokumenten:** Prüfe, ob sie in **allen** Betriebsarten erreichbar sind — Desktop, Community und gehosteter Dienst. Die Betriebsart erkennt `isLocalInstance()` in `src/lib/env-context.ts`.

## 9. Rollen nicht vermischen

Die Verordnung kennt **Anbieter** und **Betreiber** mit sehr unterschiedlichen Pflichten. Selbstbetrieb macht eine Schule **nicht** zum Anbieter; die Rolle geht nur über bei eigenem Namen oder eigener Marke, wesentlicher Veränderung oder geänderter Zweckbestimmung (Artikel 25).

Daraus folgt für die Arbeit: Pflichten des Anbieters (Risikomanagement, technische Dokumentation, Qualitätsmanagement) gelten **einmal**, nicht je Betriebsart. Wer ein Dokument je Deployment aufteilt, hat die Rollen vermischt.

## 10. Einen Befund findet man nicht durch Nachdenken

Bei jeder Aussage über das Verhalten des Systems gilt: **prüfen, nicht schließen.**

Diese Regel steht hier, weil sie an einem einzigen Tag dreimal verletzt wurde — jedes Mal klang die Erklärung plausibel, jedes Mal war sie falsch, und jedes Mal fiel es erst durch Nachfragen auf.

* Ein Befund im Quelltext ist ein Befund. Eine Erklärung dafür ist eine Vermutung, bis sie geprüft ist.
* Wo eine Ursache nicht geprüft wurde, gehört das in das Dokument — „liegt nahe" statt „ist".
* Ein Messergebnis, das zu gut aussieht, ist zuerst ein Verdacht gegen den Messaufbau.
* Eine Korrektur am Referenzsatz **zugunsten des eigenen Systems** ist nur zulässig, wenn sie aus einem Widerspruch im Prüfsatz selbst folgt — nicht daraus, dass das System abgewichen ist. Sie wird ausdrücklich als solche benannt.

## Weitere Referenzen

* [Security Standards Skill](../security-standards/SKILL.md) — Datenschutz und Sicherheitsrichtlinien
* [Prompt Engineering Skill](../prompt-engineering/SKILL.md) — Änderungen an Bewertungsanweisungen
* [Industrial Testing Skill](../industrial-testing/SKILL.md) — Wächter-Tests und Teststufen

---
*Status: Approved (V1)*
