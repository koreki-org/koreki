import { TargetGoal } from './calc-trace-types';
import { isEngineOwned, normalizeCriterionSource } from './criterion-source';
import calcTraceGenSystemDefault from '../../prompts/core/default/calc-trace-generation/system.md';
import { logger } from '../logger';

export const TARGET_GOAL_SCHEMA = {
  type: "object",
  properties: {
    targetValue: { type: "string", description: "Das numerische Endergebnis der Aufgabe (bei mehreren Werten durch Komma getrennt, z.B. '7.38, 4.62')" },
    maxPoints: { type: "number", description: "Die maximale Punktzahl" },
    unit: { type: "string", description: "Die Einheit des Ergebnisses (z.B. kg, m, A, V)" },
    gradingRubric: { type: "string", description: "Ein kurzer Text für die KI-Bewertung, der festlegt, wofür es Teilpunkte gibt (z.B. '1P für Formel, 1P fürs Einsetzen, 1P für Ergebnis')." },
    criteria: {
      type: "array",
      description: "Eine strukturierte Kriterienliste für die Teilpunktebewertung. Jedes Kriterium hat id, label, punktwert, source ('llm' | 'proofA' | 'proofB' | 'proofValues') und optional targetIndex. Die Summe der punktwert-Felder MUSS exakt maxPoints entsprechen.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          punktwert: { type: "number" },
          source: { type: "string", enum: ["llm", "proofA", "proofB", "proofValues"] },
          targetIndex: { type: "number", description: "Der 0-basierte Index im targetValue-Array, auf das sich dieses Kriterium bezieht. Jedes Kriterium muss zwingend einem Zielwert zugeordnet sein." }
        },
        required: ["id", "label", "punktwert", "source"]
      }
    }
  },
  required: ["targetValue", "maxPoints", "unit", "gradingRubric", "criteria"]
};

// Legacy Export for existing AI provider imports (we don't use tool calling anymore)
export const VALIDATE_CALC_TRACE_TOOL = {};

export function buildCalcTraceGenerationPrompt(taskText: string, discipline: string, userNotes?: string, maxPoints?: number) {
    let system = calcTraceGenSystemDefault;

    // Die Punktzahl der Aufgabe ist in der App bekannt. Wird sie nicht mitgegeben, muss das Modell
    // sie aus dem Fliesstext raten — und eine falsch geratene Gesamtsumme verzerrt anschliessend
    // jeden einzelnen Kriterien-Punktwert, weil die Summe zwingend passen muss.
    if (typeof maxPoints === 'number' && maxPoints > 0) {
        system += `\n\nVERBINDLICHE GESAMTPUNKTZAHL: Diese Aufgabe hat exakt ${maxPoints} Punkte.
- Setze "maxPoints" auf genau ${maxPoints}. Rate die Gesamtpunktzahl NICHT aus dem Text.
- Die Summe aller Kriterien-Punktwerte muss exakt ${maxPoints} ergeben.
- Formulierungen wie "jeweils 1 P Rechenweg, 1 P Ergebnis" beschreiben die Aufteilung INNERHALB dieser ${maxPoints} Punkte, niemals eine höhere Gesamtsumme.
- Übernimm die im Text genannten Einzelpunktwerte unverändert. Erhöhe niemals einen einzelnen Kriterien-Punktwert, nur damit die Summe aufgeht — wenn sie nicht aufgeht, fehlt dir ein Kriterium.`;
    }

    system += (userNotes ? `\n\nZusätzliche Instruktion vom Nutzer: ${userNotes}` : '');
    const user = `Analysiere folgenden Text der Aufgabe/Musterlösung und extrahiere das 'TargetGoal':\n\n${taskText}`;

    return { system, user };
}

export function buildCalcTraceRefinementPrompt(taskText: string, currentTrace: any, userInstruction: string, discipline: string) {
    return { system: '', user: '' };
}

export function compileRubricRegex(rubric: string, target: Omit<TargetGoal, 'criteria'>): any[] | undefined {
  if (!rubric || typeof rubric !== 'string') return undefined;

  const cleanRubric = rubric.trim().toLowerCase();
  const valuesCount = Array.isArray(target.targetValue) 
    ? target.targetValue.length 
    : String(target.targetValue).split(',').length;

  // Pattern A: "XP pro Meilenstein" / "XP pro Ergebnis"
  const proMatch = cleanRubric.match(/(\d+)\s*p(?:unkte)?\s+pro\s+(?:meilenstein|ergebnis|wert|zielwert)/i);
  if (proMatch) {
    const pts = parseInt(proMatch[1], 10);
    if (!isNaN(pts) && pts * valuesCount === target.maxPoints) {
      const criteria: any[] = [];
      for (let i = 0; i < valuesCount; i++) {
        criteria.push({
          id: `ergebnis_${i}`,
          label: `Zielwert ${i + 1} erreicht`,
          punktwert: pts,
          source: 'proofB',
          targetIndex: i
        });
      }
      return criteria;
    }
  }

  // Pattern B: "1P Formel, 1P Einsetzen, X P Ergebnis" (for 1 target value tasks)
  if (valuesCount === 1) {
    const formelMatch = cleanRubric.match(/(\d+)\s*p(?:unkte)?\s+(?:für\s+)?formel/i);
    const einsetzenMatch = cleanRubric.match(/(\d+)\s*p(?:unkte)?\s+(?:für\s+)?einsetzen/i);
    const ergebnisMatch = cleanRubric.match(/(\d+)\s*p(?:unkte)?\s+(?:für\s+)?ergebnis/i);

    if (formelMatch && einsetzenMatch && ergebnisMatch) {
      const fPts = parseInt(formelMatch[1], 10);
      const ePts = parseInt(einsetzenMatch[1], 10);
      const resPts = parseInt(ergebnisMatch[1], 10);

      if (fPts + ePts + resPts === target.maxPoints) {
        return [
          { id: 'formel', label: 'Formel fachlich korrekt', punktwert: fPts, source: 'llm', targetIndex: 0 },
          // Ob die richtigen Zahlen eingesetzt wurden, weiss die Sandbox (hasCorrectValues).
          { id: 'einsetzen', label: 'Einsetzen der Werte korrekt', punktwert: ePts, source: 'proofValues', targetIndex: 0 },
          { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: resPts, source: 'proofB', targetIndex: 0 }
        ];
      }
    }
  }

  return undefined;
}

function normalizeTargetValue(targetVal: any): string {
    if (targetVal === undefined || targetVal === null) return '0';
    if (typeof targetVal === 'number') return String(targetVal);
    if (Array.isArray(targetVal)) return targetVal.map(String).join(', ');
    if (typeof targetVal === 'string') {
        const matches = targetVal.match(/-?\d+(?:[\.,]\d+)?(?:[eE][-+]?\d+)?/g);
        if (matches) {
            return matches.map(m => m.replace(',', '.')).join(', ');
        }
        return targetVal;
    }
    return String(targetVal);
}

export function parseGeneratedCalcTrace(rawOutput: any, expectedMaxPoints?: number): TargetGoal | null {
    if (!rawOutput) return null;
    let data = rawOutput;
    if (typeof data === 'string') {
        try { 
            data = JSON.parse(data); 
        } catch (e) {
            // Robust extraction: Extract the first JSON object found using regex
            const match = data.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    data = JSON.parse(match[0]);
                } catch (e2) {
                    return null;
                }
            } else {
                return null;
            }
        }
    }
    
    const target: TargetGoal = {
        targetValue: normalizeTargetValue(data.targetValue),
        maxPoints: data.maxPoints || 0,
        unit: data.unit || '',
        gradingRubric: data.gradingRubric || '',
        criteria: Array.isArray(data.criteria) ? data.criteria : undefined
    };

    // If criteria is missing but gradingRubric exists, try regex compiler fast-path
    if (!target.criteria && target.gradingRubric) {
        const regexCriteria = compileRubricRegex(target.gradingRubric, target);
        if (regexCriteria) {
            target.criteria = regexCriteria;
        }
    }

    const hasExpectedPoints = typeof expectedMaxPoints === 'number' && expectedMaxPoints > 0;
    if (hasExpectedPoints) {
        // Die Punktzahl der Aufgabe ist gesetzt — sie ist die Wahrheit, nicht die Schaetzung des Modells.
        target.maxPoints = expectedMaxPoints!;
    }

    // Resilient validation of parsed criteria list
    if (target.criteria && target.criteria.length > 0) {
        const sum = target.criteria.reduce((acc, c) => acc + (c.punktwert || 0), 0);

        if (hasExpectedPoints) {
            if (sum !== expectedMaxPoints) {
                // Nicht stillschweigend uebernehmen: Eine falsche Gesamtsumme entsteht dadurch, dass
                // das Modell einzelne Kriterien aufblaeht, um auf eine geratene Summe zu kommen.
                // Der Aufrufer faengt das ab und laesst neu generieren.
                throw new Error(
                    `Die Summe der Kriterien-Punkte (${sum}) weicht von der Punktzahl der Aufgabe (${expectedMaxPoints}) ab. ` +
                    `Verteile die Punkte so, dass sie exakt ${expectedMaxPoints} ergeben, und erhöhe dafür keinen einzelnen Kriterien-Punktwert über den im Erwartungshorizont genannten Wert hinaus.`
                );
            }
        } else if (sum !== target.maxPoints) {
            // 1. Align maxPoints dynamically with the sum of generated criteria points
            // to prevent pedagogical distortion caused by arbitrary scaling or rounding.
            logger.warn(`[Resilience] Updating maxPoints from ${target.maxPoints} to match sum of criteria points ${sum}`);
            target.maxPoints = sum;
        }

        // 2. Enforce that targetIndex is a required valid number matching targetValues array length
        const valuesCount = Array.isArray(target.targetValue) 
          ? target.targetValue.length 
          : String(target.targetValue).split(',').length;

        for (const crit of target.criteria) {
            // Zustaendigkeit EINMAL hier festschreiben. Danach lesen Prompt-Aufbau und
            // Punktevergabe nur noch dieses Feld — sie leiten nichts mehr aus id/label ab.
            const normalizedSource = normalizeCriterionSource(crit);
            if (normalizedSource !== crit.source) {
                logger.warn(`[Resilience] Criterion "${crit.id}" carried an unusable source (${JSON.stringify(crit.source)}); resolved to "${normalizedSource}".`);
                crit.source = normalizedSource;
            }

            const isProof = isEngineOwned(crit.source);
            if (isProof) {
                if (crit.targetIndex === undefined || crit.targetIndex === null) {
                    logger.warn(`[Resilience] Criterion "${crit.id}" (source: ${crit.source}) is missing targetIndex. Defaulting to final goal (0).`);
                    crit.targetIndex = 0;
                }
                let idx = Number(crit.targetIndex);
                if (isNaN(idx) || idx < 0 || idx >= valuesCount) {
                    const clampedIdx = Math.max(0, valuesCount - 1);
                    logger.warn(`[Resilience] Adjusting invalid targetIndex ${crit.targetIndex} on criterion "${crit.id}" to maximum valid index ${clampedIdx}`);
                    crit.targetIndex = clampedIdx;
                }
            } else {
                // llm source criteria: targetIndex is optional. If present, clamp if out of bounds.
                if (crit.targetIndex !== undefined && crit.targetIndex !== null) {
                    let idx = Number(crit.targetIndex);
                    if (isNaN(idx) || idx < 0 || idx >= valuesCount) {
                        const clampedIdx = Math.max(0, valuesCount - 1);
                        logger.warn(`[Resilience] Adjusting out-of-bounds targetIndex ${crit.targetIndex} on qualitative criterion "${crit.id}" to ${clampedIdx}`);
                        crit.targetIndex = clampedIdx;
                    }
                }
            }
        }
    }

    return target;
}

export function validateCalcTraceDeterminism(trace: any) {
    return { isValid: true, error: '' };
}
