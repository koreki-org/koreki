/**
 * Der Sandbox-Nachweis, wie ihn die LEHRKRAFT liest.
 *
 * Eigene Datei, weil es Darstellung ist und keine Auswertung: `CalcTrace.ts` rechnet,
 * dieses Modul formuliert. Zusammen rissen sie die Groessengrenze — und der Modulkopf
 * dort sagt ausdruecklich, dass nur der Auswerter am Stueck stehen soll.
 *
 * @module calc-trace-feedback
 */
import { TOLERANCE, isWithinTolerance } from './numeric-tolerance';
import { parseTargetValues, parseUnitsPerValue } from './units';
import { stepHasSandboxError, istRechenschritt } from './criterion-source';
import type { StudentASTStep, TargetGoal, CalcTraceResult } from './calc-trace-types';

/**
 * Die Zeichenkette, an der die Oberflaeche erkennt, dass die Sandbox NICHTS
 * nachgerechnet hat.
 *
 * Ein Vertrag zwischen genau zwei Stellen: `formatCalcTraceFeedback` schreibt sie,
 * `splitFeedback` sucht sie. Deshalb steht sie hier als Konstante und nicht zweimal
 * als Literal — sonst laufen Erzeuger und Leser auseinander.
 */
export const NICHT_NACHGERECHNET = '— **Nicht nachgerechnet.**';

/**
 * Wie ein einzelnes Kriterium ausgegangen ist — fuer die Anzeige.
 *
 * Die Punktzahl je Kriterium entsteht in `correction-mapping`, der Beweistext hier.
 * Ohne diese Bruecke sah die Lehrkraft nur die SUMME und konnte nicht pruefen, wie
 * sie zustande kommt. Gemessen am 04.09.2026 an einer Gleichung: Die Sandbox meldete
 * "Rechenfehler in step_2", und trotzdem trug ein Kriterium ueber genau diesen Schritt
 * einen Punkt — weil es auf den falschen Meilenstein zeigte. Im Block war der
 * Widerspruch nicht zu sehen, weil die Punktevergabe fehlte.
 */
export interface KriteriumErgebnis {
  label: string;
  punkte: number;
  max: number;
  /** `llm` oder `proofA`/`proofB` — bestimmt, was in der Spalte "Grundlage" steht. */
  quelle: string;
  begruendung: string;
}

/** Klartext fuer die Spalte "Grundlage" — mit dem Fachbegriff in Klammern. */
function grundlage(k: KriteriumErgebnis): string {
  if (k.quelle === 'proofA') return `${k.begruendung} (Proof A)`;
  if (k.quelle === 'proofB') return `${k.begruendung} (Proof B)`;
  return k.begruendung;
}

/**
 * Der Nachweis der Sandbox, wie ihn die LEHRKRAFT liest.
 *
 * Hiess bis zum 04.09.2026 `formatCalcTraceForPrompt` — und der Name war falsch.
 * Das Briefing fuer das Sprachmodell baut `engine-report.ts` vollstaendig selbst;
 * diese Funktion wird ausschliesslich von `correction-mapping.ts` benutzt, um den
 * aufklappbaren Block in der Korrekturansicht zu fuellen. Sie hat genau einen
 * Adressaten, und das ist ein Mensch.
 *
 * Die Namensluege hatte Folgen: Weil "ForPrompt" dastand, schrieb hier jeder fuer
 * die Maschine. Die Lehrkraft las deshalb einen rohen JSON-Auszug (`[DEBUG-AST]`),
 * ihre eigene Rubrik zurueckgespiegelt (`--- LEHRER-ERWARTUNGSHORIZONT ---`) und
 * Befehle, die nicht an sie gerichtet waren ("Werte diese Schritte fachlich selbst
 * und ziehe dafuer keine Punkte ab").
 *
 * REGEL FUER SPAETER: Was hier hinzukommt, liest eine Lehrkraft. Eine Anweisung an
 * das Modell gehoert nach `engine-report.ts`, nicht hierher.
 */
export function formatCalcTraceFeedback(
  result: CalcTraceResult,
  target: TargetGoal,
  kriterien?: KriteriumErgebnis[]
): string {
  const ast = result.ast || [];
  const sandboxErrors = result.sandboxErrors || [];
  const lines: string[] = [];

  // ── Der Rechenweg, wie die Sandbox ihn gelesen hat ──────────────────────────
  //
  // Frueher stand er nur als roher JSON-Auszug da (`[DEBUG-AST]`) oder gar nicht.
  // Dabei ist er die interessanteste Auskunft des ganzen Blocks: Er zeigt, WAS die
  // Sandbox nachgerechnet hat — und deckt damit auch Extraktionsfehler auf, die
  // sonst niemandem auffallen.
  if (ast.length > 0) {
    lines.push(`\n**Gelesener Rechenweg**\n`);
    lines.push(`| Schritt | Rechnung | Ergebnis | |`);
    lines.push(`|---|---|---|---|`);
    ast.forEach(step => {
      const ergebnis = `${step.result}${step.unit ? ` ${step.unit}` : ''}`;
      const status = stepHasSandboxError(step.id, sandboxErrors) ? '✗' : '✓';
      lines.push(`| \`${step.id}\` | \`${step.formula}\` | \`${ergebnis}\` | ${status} |`);
    });
  }

  // ── Was die Sandbox dabei gefunden hat ──────────────────────────────────
  //
  // Ohne eigene Ueberschrift, direkt unter der Tabelle: Die Befunde gehoeren zu den
  // Zeilen darueber. Hier stand bis zum 04.09.2026 ein Abschnitt "Stimmt die Rechnung
  // in sich? (Proof A)" mit derselben Aussage in Prosa — und darunter noch einmal
  // dasselbe in der Punktevergabe. Dreimal dieselbe Sache macht den Block zum Buch;
  // die Begriffe stehen weiterhin in der Legende und in der Spalte "Grundlage".
  if (ast.length === 0) {
    lines.push(`
✗ Aus der Schülerantwort liess sich kein Rechenweg lesen.`);
  } else if (!ast.some(step => istRechenschritt(step.formula))) {
    // Kein einziger Schritt traegt einen Rechenausdruck — die Sandbox hat nichts
    // nachgerechnet. Wo nichts gerechnet wird, entsteht auch kein Widerspruch, und das
    // Ausbleiben eines Fehlers laese sich sonst als Bestaetigung.
    lines.push(`
${NICHT_NACHGERECHNET} Kein Schritt enthält einen Rechenausdruck, den die `
      + `Sandbox nachvollziehen könnte. Das heißt NICHT, dass nicht gerechnet wurde — eine `
      + `Rechnung kann auch in Worten dastehen ("2 ml in 30 min, das sind 4 ml/h"). Die Punkte `
      + `dieser Aufgabe hat das Sprachmodell vergeben, nicht die Nachrechnung.`);
  } else if (sandboxErrors.length > 0) {
    // Ein Schritt, den die Sandbox nicht PARSEN konnte, ist kein Rechenfehler des
    // Schuelers, sondern eine Grenze unserer Auswertung (etwa eine symbolische
    // Formelzeile ohne Zahlen). Beides zusammen als "Verrechner" zu melden, hat das
    // Modell veranlasst, korrekt gerechnete Wege als fehlerhaft zu bewerten.
    const rechenfehler = sandboxErrors.filter(err => err.startsWith('Rechenfehler'));
    const nichtAuswertbar = sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));

    if (rechenfehler.length > 0) {
      lines.push(`
✗ Verrechner gefunden:
`);
      rechenfehler.forEach(err => lines.push(`* ${err}`));
    }
    if (nichtAuswertbar.length > 0) {
      lines.push(`
Nicht nachrechenbar — **kein** Fehler der Schülerin, die Sandbox konnte `
        + `diese Schritte nur nicht auswerten (etwa reine Formelzeilen ohne eingesetzte Zahlen). `
        + `Bitte selbst durchsehen:
`);
      nichtAuswertbar.forEach(err => lines.push(`* ${err}`));
    }
  }

  // ── Woraus sich die Punktzahl zusammensetzt ─────────────────────────
  //
  // Steht bewusst DIREKT unter dem gelesenen Rechenweg: Nur so stehen der Schritt mit
  // dem Kreuz und das Kriterium, das ihn bewertet, nebeneinander. Ein Widerspruch
  // zwischen beiden ist dann eine Zeile weit entfernt, nicht einen Absatz.
  if (kriterien && kriterien.length > 0) {
    lines.push(`
**Punktevergabe**
`);
    lines.push(`| Kriterium | | Grundlage |`);
    lines.push(`|---|---|---|`);
    kriterien.forEach(k => {
      lines.push(`| ${k.label} | ${k.punkte}/${k.max} | ${grundlage(k)} |`);
    });
  }


  // ── Proof B ────────────────────────────────────────────────────────────────
  lines.push(`\n**Steht Ihr Zielwert da? (Proof B)**\n`);
  const naturalValues = parseTargetValues(target.targetValue);
  const unitsPerValue = parseUnitsPerValue(target.unit, naturalValues.length);

  naturalValues.forEach((expected, idx) => {
    const expectedUnit = unitsPerValue[idx] || '';
    const targetStr = `${expected} ${expectedUnit}`.trim();
    const detail = result.unitDetails ? result.unitDetails.find(d => d.targetValue === expected && d.expectedUnit === expectedUnit) : null;

    if (detail) {
      const stepStr = detail.stepId ? ` in \`${detail.stepId}\`` : '';
      const notiert = detail.studentUnit ? ` (notiert als \`${detail.studentUnit}\`)` : (detail.isExactMatch ? '' : ' (ohne Einheit)');

      if (detail.isExactMatch) {
        lines.push(`✓ \`${targetStr}\` gefunden${stepStr} — Wert und Einheit stimmen.`);
      } else if (detail.isMissingUnit) {
        lines.push(`✗ \`${targetStr}\`: Die Zahl steht da${stepStr}, aber **ohne Einheit** — der Zielwert gilt als nicht erreicht.`);
        lines.push(`  → Gerechnet wurde richtig — nur die Einheit fehlt.`);
      } else if (detail.isPrefixError) {
        lines.push(`✗ \`${targetStr}\`: Die Zahl steht da${stepStr}${notiert}, aber in **falscher Größenordnung** — der Zielwert gilt als nicht erreicht.`);
        lines.push(`  → Gerechnet wurde richtig — nur die Größenordnung der Einheit passt nicht.`);
      } else if (detail.isUnitMismatch) {
        lines.push(`✗ \`${targetStr}\`: Die Zahl steht da${stepStr}${notiert}, aber die **Einheit weicht ab** — der Zielwert gilt als nicht erreicht.`);
        lines.push(`  → Gerechnet wurde richtig — nur die Einheitsbezeichnung stimmt nicht.`);
      } else {
        lines.push(`✗ \`${targetStr}\`: nicht erreicht oder übersprungen.`);
      }
    } else {
      // Reiner Zahlenwert, ohne erwartete Einheit.
      const matchingStep = ast.find(step => isWithinTolerance(step.result, expected, TOLERANCE));
      if (matchingStep) {
        lines.push(`✓ \`${targetStr}\` gefunden in \`${matchingStep.id}\`.`);
      } else {
        lines.push(`✗ \`${targetStr}\`: nicht erreicht oder übersprungen.`);
      }
    }
  });

  // Der Erwartungshorizont stand hier bis zum 04.09.2026. Er ist der Text, den die
  // Lehrkraft SELBST in die Musterloesung geschrieben hat — ihn ihr zurueckzuspiegeln
  // verlaengert den Block, ohne etwas mitzuteilen. Fuer das Modell steht er ohnehin
  // im Kriterienblock von `engine-report.ts`.

  return lines.join('\n');
}
