/**
 * CalcTrace Engine V7 — Unit-Aware Grading
 *
 * Based on industry best practices from STACK/Maxima, WeBWorK, Numbas:
 * Physical quantity = Tuple(value, unit). Both dimensions checked separately.
 *
 * Uses mathjs unit() API for deterministic SI normalization.
 * No custom prefix tables — mathjs handles all SI prefixes and compound units.
 *
 * Der Auswerter selbst steht hier am Stück. Zwei geschlossene Teilgebiete, die
 * er nur BENUTZT, stehen daneben: `./units` (Einheiten normalisieren, umrechnen,
 * vergleichen) und `./numeric-tolerance` (Zahlenvergleich mit Spielraum).
 *
 * @module CalcTrace
 */

import { math } from './mathjs-instance';
import { TOLERANCE, isWithinTolerance, roundSig } from './numeric-tolerance';
import {
  compareWithUnit,
  convertBetweenUnits,
  normalizeExpressionFormula,
  normalizeUnitString,
  parseTargetValues,
  parseUnitsPerValue
} from './units';
import { logger } from '@/lib/logger';
import { stepHasSandboxError, istRechenschritt } from './criterion-source';
import type {
  StudentASTStep,
  TargetGoal,
  CalcTraceResult,
  PerTargetResult,
  UnitComparisonDetail
} from './calc-trace-types';
import { toErrorMessage } from '../error-message';

const ALLOWED_NODE_TYPES = new Set([
  'SymbolNode',
  'ConstantNode',
  'OperatorNode',
  'ParenthesisNode',
  'FunctionNode',
]);

const ALLOWED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'log', 'log10', 'ln', 'exp',
  'sqrt', 'cbrt', 'abs', 'sign', 'round', 'floor', 'ceil',
  'min', 'max', 'pow', 'sum',
]);


function validateAST(formula: string): void {
  const node = math.parse(formula);
  node.traverse((n) => {
    if (!ALLOWED_NODE_TYPES.has(n.type)) {
      throw new Error(`Forbidden expression syntax: ${n.type}`);
    }
    if (n.type === 'FunctionNode') {
      // eslint-disable-next-line
      const funcNode = n as any;
      const name = typeof funcNode.name === 'string' ? funcNode.name : funcNode.name?.name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new Error(`Forbidden function call: ${name}`);
      }
    }
  });
}

/**
 * Evaluiert den extrahierten AST in der Sandbox.
 *
 * Proof A: Interne Rechenkonsistenz (jeder Schritt mathematisch korrekt?)
 * Proof B: Zielerreichung (Endziel erreicht? Unit-aware!)
 *
 * @param ast - Der vom LLM extrahierte Rechenweg
 * @param target - Das Ziel (Erwartungshorizont)
 * @returns CalcTraceResult
 */
export function evaluateCalcTrace(
  ast: StudentASTStep[],
  target: TargetGoal,
): CalcTraceResult {
  const sandboxErrors: string[] = [];
  const context: Record<string, number> = {};
  const computedValues: Record<string, any> = {};

  // ── Proof A: Internal consistency ──────────────────────────────────────────
  for (const step of ast) {
    try {
      const normalizedFormula = normalizeExpressionFormula(step.formula);
      validateAST(normalizedFormula);
      const computed = math.evaluate(normalizedFormula, context);
      computedValues[step.id] = computed;

      const isNumber = typeof computed === 'number' && isFinite(computed);
      const isUnit = computed && typeof computed === 'object' && math.typeOf(computed) === 'Unit';

      if (!isNumber && !isUnit) {
        sandboxErrors.push(`Schritt ${step.id}: Resultat ist keine gültige Zahl oder physikalische Einheit.`);
      } else {
        let comparisonValue = NaN;
        const studentValue = step.result;

        if (isUnit) {
          if (step.unit) {
            const expectedUnitNormalized = normalizeUnitString(step.unit);
            try {
              const convertedUnit = computed.to(expectedUnitNormalized);
              comparisonValue = convertedUnit.toNumber();
            } catch {
              comparisonValue = NaN;
            }
          } else {
            try {
              comparisonValue = computed.toNumber();
            } catch {
              comparisonValue = NaN;
            }
          }
        } else {
          comparisonValue = computed as number;
          if (step.formulaUnit && step.unit && step.formulaUnit !== step.unit) {
            const converted = convertBetweenUnits(comparisonValue, step.formulaUnit, step.unit);
            if (converted !== null) {
              comparisonValue = converted;
            }
          }
        }

        if (!isWithinTolerance(studentValue, comparisonValue, TOLERANCE)) {
          let formulaResultDisplay = isUnit
            ? `${math.format(computed, { precision: 6 })}`
            : `${math.format(computed, { precision: 6 })}`;
          if (step.unit) {
            try {
              formulaResultDisplay = isUnit
                ? `${math.format(computed.to(normalizeUnitString(step.unit)), { precision: 6 })}`
                : `${math.format(computed, { precision: 6 })} ${step.unit}`;
            } catch {
              // Ignore conversion display error, use raw value
            }
          }
          sandboxErrors.push(`Rechenfehler in ${step.id}: Formel ergibt ${formulaResultDisplay}, aber Schüler notierte ${step.result} ${step.unit ?? ''}`.trim());
        }
        // Save the explicitly stated student result in context, so subsequent formulas use the scaled value
        context[step.id] = step.result;
      }
    } catch (e) {
      sandboxErrors.push(`Syntax-Fehler in ${step.id} (${step.formula}): ${toErrorMessage(e)}`);
      context[step.id] = step.result;
    }
  }

  // ── Proof B: Goal reached? (Unit-aware) ────────────────────────────────────
  let isGoalReached = false;
  let hasUnitMismatch = false;

  const naturalValues = parseTargetValues(target.targetValue);
  const unitsPerValue = parseUnitsPerValue(target.unit, naturalValues.length);

  const reachedTargets: number[] = [];
  const missedTargets: number[] = [];
  const unitDetails: UnitComparisonDetail[] = [];
  const perTargetResult: PerTargetResult[] = [];

  logger.debug(`[CalcTrace] naturalValues: ${JSON.stringify(naturalValues)}`);
  logger.debug(`[CalcTrace] unitsPerValue: ${JSON.stringify(unitsPerValue)}`);
  logger.debug(`[CalcTrace] AST steps: ${JSON.stringify(ast)}`);

  if (naturalValues.length > 0 && ast.length > 0) {
    naturalValues.forEach((expected, i) => {
      const expectedUnit = unitsPerValue[i];
      let bestMatch: UnitComparisonDetail | null = null;

      if (expectedUnit) {
        // 0a. Ein Schritt, der den Zielwert in der ERWARTETEN Einheit nennt, ist immer die
        //     aussagekraeftigste Fundstelle — unabhaengig von seiner Position im Rechenweg.
        for (const step of ast) {
          if (!step.unit || normalizeUnitString(step.unit) !== normalizeUnitString(expectedUnit)) continue;
          const treffer = compareWithUnit(step.result, step.unit, expected, expectedUnit, TOLERANCE);
          if (treffer.isExactMatch) {
            bestMatch = { ...treffer, stepId: step.id };
            break;
          }
        }

        // 0b. Sonst entscheidet die Endantwort — der letzte Schritt —, sofern sie den Zielwert
        //     zahlenmaessig trifft. Ohne diesen Vorrang rettet ein gleichwertiger
        //     Zwischenschritt eine unvollstaendige Endantwort: Bei
        //     "... = 750000 KiB / 1024 = 732,42" (ohne Einheit) wuerde das physikalisch
        //     gleichwertige "750000 KiB" als Treffer gelten und der fehlende Einheiten-Zusatz
        //     am Endergebnis nie auffallen.
        if (!bestMatch) {
          const letzterSchritt = ast[ast.length - 1];
          const endAntwort = compareWithUnit(
            letzterSchritt.result, letzterSchritt.unit, expected, expectedUnit, TOLERANCE
          );
          if (endAntwort.isValueMatch) {
            bestMatch = { ...endAntwort, stepId: letzterSchritt.id };
          }
        }
      }

      // 1. Nur wenn die Endantwort nichts geliefert hat: alle Schritte durchsuchen.
      const zuDurchsuchen = bestMatch ? [] : ast;
      for (const step of zuDurchsuchen) {
        if (!expectedUnit) {
          const isMatch = isWithinTolerance(step.result, expected, TOLERANCE);
          if (isMatch) {
            bestMatch = {
              targetValue: expected,
              expectedUnit: '',
              studentUnit: step.unit,
              isValueMatch: true,
              isExactMatch: true,
              isUnitMismatch: false,
              stepId: step.id
            };
            break;
          }
        } else {
          const comparison = compareWithUnit(step.result, step.unit, expected, expectedUnit, TOLERANCE);
          const detail: UnitComparisonDetail = { ...comparison, stepId: step.id };

          // Treffer in der erwarteten Einheit und die Endantwort sind oben (0a/0b) bereits
          // abgehandelt. Hier bleiben nur noch Zwischenschritte:
          //   1. physikalisch gleichwertig in anderer Einheit (z. B. 750000 KiB statt 732,42 MiB)
          //   2. Zahlenwert stimmt, Einheit falsch oder fehlend
          if (comparison.isExactMatch) {
            if (!bestMatch || !bestMatch.isExactMatch) {
              bestMatch = detail;
            }
            continue;
          }

          // Zahlenwert stimmt, aber die Einheit traegt nicht. Kein Treffer — die Fundstelle wird
          // trotzdem gemerkt, damit der Beweistext melden kann, dass richtig gerechnet wurde.
          if (comparison.isValueMatch && (!bestMatch || (!bestMatch.isExactMatch && !bestMatch.isValueMatch))) {
            bestMatch = detail;
          }
        }
      }

      // 2. Fallback: If student result didn't match, check computed values to find intended step
      let targetStepId = bestMatch?.stepId;
      if (!targetStepId) {
        for (const step of ast) {
          const computed = computedValues[step.id];
          if (computed === undefined) continue;

          let isMatch = false;
          const isUnit = computed && typeof computed === 'object' && math.typeOf(computed) === 'Unit';
          const numericVal = isUnit ? computed.toNumber() : computed;

          if (!expectedUnit) {
            isMatch = isWithinTolerance(numericVal, expected, TOLERANCE);
          } else {
            const comp = compareWithUnit(numericVal, isUnit ? step.unit : undefined, expected, expectedUnit, TOLERANCE);
            isMatch = comp.isValueMatch;
          }

          if (isMatch) {
            targetStepId = step.id;
            break;
          }
        }
      }

      // 3. Trace calculation chain and check for errors
      let reached = false;
      let hasCalculationError = false;
      let associatedStepIds: string[] = [];

      if (targetStepId) {
        const chain = traceStepChain(targetStepId, ast);
        associatedStepIds = Array.from(chain);
        hasCalculationError = associatedStepIds.some(id => stepHasSandboxError(id, sandboxErrors));
      }

      if (bestMatch) {
        // Der Befund wird IMMER gemeldet, auch wenn er kein Treffer ist. Sonst ginge die
        // Tatsache "der Zahlenwert stimmte" verloren und der Beweistext koennte nur
        // "nicht erreicht" melden, ohne den Einheitenfehler zu benennen.
        unitDetails.push(bestMatch);
        if (bestMatch.isUnitMismatch) {
          hasUnitMismatch = true;
        }
      }

      // Zielerreichung setzt Zahlenwert UND tragfaehige Einheit voraus. Eine fehlende Einheit
      // wird dabei genauso behandelt wie eine falsche.
      if (bestMatch && bestMatch.isExactMatch) {
        reached = true;
        reachedTargets.push(roundSig(expected));
      } else {
        missedTargets.push(roundSig(expected));
      }

      perTargetResult.push({
        targetIndex: i,
        reached,
        hasCalculationError,
        associatedStepIds
      });
    });

    // Goal is reached if ALL natural values were found
    isGoalReached = missedTargets.length === 0 && reachedTargets.length > 0;
  } else if (ast.length === 0) {
    missedTargets.push(...naturalValues.map(v => roundSig(v)));
  }

  return {
    isGoalReached,
    sandboxErrors,
    reachedTargets,
    missedTargets,
    ast,
    maxPoints: target.maxPoints,
    unitMismatch: hasUnitMismatch || undefined,
    unitDetails: unitDetails.length > 0 ? unitDetails : undefined,
    perTargetResult
  };
}

export function traceStepChain(targetStepId: string, ast: StudentASTStep[]): Set<string> {
  const chain = new Set<string>([targetStepId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of ast) {
      if (chain.has(step.id)) continue;
      const isReferenced = Array.from(chain).some(id => {
        const referencingStep = ast.find(s => s.id === id);
        return referencingStep?.formula.includes(step.id);
      });
      if (isReferenced) {
        chain.add(step.id);
        changed = true;
      }
    }
  }
  return chain;
}

// ─── Prompt Formatter ────────────────────────────────────────────────────────

/**
 * Formatiert das Evaluierungsergebnis in einen robusten Prompt für das Hybrid-Grading LLM.
 */
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
export function formatCalcTraceFeedback(result: CalcTraceResult, target: TargetGoal): string {
  const ast = result.ast || [];
  const sandboxErrors = result.sandboxErrors || [];
  const lines: string[] = [];

  let targetDisplay = `${target.targetValue} ${target.unit || ''}`;
  if (Array.isArray(target.targetValue) && target.unit && target.unit.includes(',')) {
    const units = target.unit.split(',').map(u => u.trim());
    if (units.length === target.targetValue.length) {
      targetDisplay = target.targetValue.map((v, i) => `${v} ${units[i]}`).join(', ');
    }
  }
  lines.push(`**Ihr Zielwert:** \`${targetDisplay.trim()}\``);

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

  // ── Proof A ────────────────────────────────────────────────────────────────
  lines.push(`\n**Stimmt die Rechnung in sich? (Proof A)**\n`);

  if (ast.length === 0) {
    lines.push(`✗ Aus der Schülerantwort liess sich kein Rechenweg lesen.`);
  } else if (!ast.some(step => istRechenschritt(step.formula))) {
    // Kein einziger Schritt traegt einen Rechenausdruck — die Sandbox hat nichts
    // nachgerechnet. Hier stand bis zum 04.09.2026 der Satz "jeder Schritt ergibt
    // genau das, was daneben steht": Wo nichts gerechnet wurde, entsteht auch kein
    // Widerspruch, und das Ausbleiben eines Fehlers las sich als Bestaetigung. Die
    // Lehrkraft bekam eine Zusicherung, die niemand geprueft hatte.
    lines.push(`${NICHT_NACHGERECHNET} Kein Schritt enthält einen Rechenausdruck, den die `
      + `Sandbox nachvollziehen könnte. Das heißt NICHT, dass nicht gerechnet wurde — eine `
      + `Rechnung kann auch in Worten dastehen ("2 ml in 30 min, das sind 4 ml/h"). Die Punkte `
      + `dieser Aufgabe hat das Sprachmodell vergeben, nicht die Nachrechnung.`);
  } else if (sandboxErrors.length === 0) {
    lines.push(`✓ Ja — jeder Schritt ergibt genau das, was daneben steht.`);
  } else {
    // Ein Schritt, den die Sandbox nicht PARSEN konnte, ist kein Rechenfehler des Schuelers,
    // sondern eine Grenze unserer Auswertung (z. B. eine symbolische Formelzeile ohne Zahlen).
    // Beides zusammen als "Verrechner im Weg des Schuelers" zu melden, hat das Modell
    // veranlasst, korrekt gerechnete Wege als fehlerhaft zu bewerten.
    const rechenfehler = sandboxErrors.filter(err => err.startsWith('Rechenfehler'));
    const nichtAuswertbar = sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));

    if (rechenfehler.length > 0) {
      lines.push(`✗ Nein — die Nachrechnung fand einen Verrechner:\n`);
      rechenfehler.forEach(err => lines.push(`* ${err}`));
    } else {
      lines.push(`✓ Ja — in allen nachrechenbaren Schritten geht die Rechnung auf.`);
    }

    if (nichtAuswertbar.length > 0) {
      lines.push(`\nNicht nachrechenbar (**kein** Fehler der Schülerin — die Sandbox konnte diese Schritte nur nicht auswerten, etwa reine Formelzeilen ohne eingesetzte Zahlen):\n`);
      nichtAuswertbar.forEach(err => lines.push(`* ${err}`));
      lines.push(`\n→ Diese Schritte hat die Rechenkette nicht bewertet. Bitte sehen Sie sie selbst durch.`);
    }
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
