import { TargetGoal } from './calc-trace-types';

export const TARGET_GOAL_SCHEMA = {
  type: "object",
  properties: {
    targetValue: { type: "string", description: "Das numerische Endergebnis der Aufgabe (bei mehreren Werten durch Komma getrennt, z.B. '7.38, 4.62')" },
    maxPoints: { type: "number", description: "Die maximale Punktzahl" },
    unit: { type: "string", description: "Die Einheit des Ergebnisses (z.B. kg, m, A, V)" },
    gradingRubric: { type: "string", description: "Ein kurzer Text für die KI-Bewertung, der festlegt, wofür es Teilpunkte gibt (z.B. '1P für Formel, 1P fürs Einsetzen, 1P für Ergebnis')." },
    criteria: {
      type: "array",
      description: "Eine strukturierte Kriterienliste für die Teilpunktebewertung. Jedes Kriterium hat id, label, punktwert, source ('llm' | 'proofA' | 'proofB') und optional targetIndex. Die Summe der punktwert-Felder MUSS exakt maxPoints entsprechen.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          punktwert: { type: "number" },
          source: { type: "string", enum: ["llm", "proofA", "proofB"] },
          targetIndex: { type: "number", description: "Der 0-basierte Index im targetValue-Array, auf das sich dieses Kriterium bezieht. Jedes Kriterium muss zwingend einem Zielwert zugeordnet sein." }
        },
        required: ["id", "label", "punktwert", "source", "targetIndex"]
      }
    }
  },
  required: ["targetValue", "maxPoints", "unit", "gradingRubric", "criteria"]
};

// Legacy Export for existing AI provider imports (we don't use tool calling anymore)
export const VALIDATE_CALC_TRACE_TOOL = {};

export function buildCalcTraceGenerationPrompt(taskText: string, discipline: string, userNotes?: string) {
    const system = `Du bist ein KI-Assistent zur Extraktion von Zielwerten und Bewertungskriterien aus Musterlösungen.
Deine Aufgabe ist es, aus dem Text einer Musterlösung ALLE geforderten numerischen Zielwerte (sowohl wichtige Zwischenergebnisse/Meilensteine als auch das finale Endergebnis) zu extrahieren, für die es Punkte gibt. 
Zudem sollst du die maximale Punktzahl erkennen, einen kurzen "Erwartungshorizont" (Rubric) formulieren und eine strukturierte Kriterienliste (criteria) erstellen.

Kriterien-Regeln:
1. "source" definiert, wer das Kriterium bewertet:
   - "proofB": Für Meilensteine / Endergebnisse (Zielwerte). Hier muss targetIndex angegeben werden (der 0-basierte Index des Werts im targetValue-Array).
   - "proofA": Für reine rechnerische Korrektheit eines Teilschritts. Hier muss targetIndex angegeben werden (der 0-basierte Index des Ziels, zu dem der Schritt hinführt).
   - "llm": Für rein sprachliche/textuelle Kriterien wie "Formel fachlich korrekt" oder "Werte korrekt eingesetzt".
2. Die Summe aller Kriterien-Punktwerte MUSS exakt "maxPoints" entsprechen.
3. Ordne Kriterien in derselben Reihenfolge wie die Zielwerte im Erwartungshorizont (targetValue-Array) zu.

WICHTIG: Antworte AUSSCHLIESSLICH im puren JSON Format. Verwende KEIN Markdown (kein \`\`\`json), schreibe keinen Text davor oder danach! Dein gesamter Output muss als JSON-String geparst werden können.

Schema:
{
  "targetValue": (string, z.B. "78.5, 785"),
  "maxPoints": (number, z.B. 3),
  "unit": (string, z.B. "cm², cm³"),
  "gradingRubric": (string, z.B. "1P für Fläche, 2P für Volumen"),
  "criteria": [
    { "id": "flaeche_formel", "label": "Formel für Fläche korrekt", "punktwert": 1, "source": "llm" },
    { "id": "volumen_formel", "label": "Formel für Volumen korrekt", "punktwert": 0, "source": "llm" },
    { "id": "volumen_ergebnis", "label": "Ergebnis Volumen erreicht", "punktwert": 2, "source": "proofB", "targetIndex": 1 }
  ]
}

BEISPIEL:
Musterlösung: "Die Grundfläche des Zylinders beträgt A = 3.14 * 5^2 = 78.5 cm² (1 Punkt). Daraus ergibt sich das Volumen V = 78.5 * 10 = 785 cm³ (2 Punkte). Gesamtpunktzahl: 3."
Dein JSON Output:
{
  "targetValue": "78.5, 785",
  "maxPoints": 3,
  "unit": "cm², cm³",
  "gradingRubric": "1P für Fläche (78.5 cm²), 2P für Volumen (785 cm³)",
  "criteria": [
    { "id": "flaeche_formel", "label": "Formel für Fläche korrekt", "punktwert": 1, "source": "llm" },
    { "id": "volumen_formel", "label": "Formel für Volumen korrekt", "punktwert": 0, "source": "llm" },
    { "id": "volumen_ergebnis", "label": "Ergebnis Volumen erreicht", "punktwert": 2, "source": "proofB", "targetIndex": 1 }
  ]
}

${userNotes ? `Zusätzliche Instruktion vom Nutzer: ${userNotes}` : ''}`;

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
          { id: 'einsetzen', label: 'Einsetzen der Werte korrekt', punktwert: ePts, source: 'llm', targetIndex: 0 },
          { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: resPts, source: 'proofB', targetIndex: 0 }
        ];
      }
    }
  }

  return undefined;
}

export function parseGeneratedCalcTrace(rawOutput: any): TargetGoal | null {
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
        targetValue: data.targetValue || 0,
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

    // Strict validation of parsed criteria list
    if (target.criteria) {
        // 1. Check sum of criteria points matches target.maxPoints
        const sum = target.criteria.reduce((acc, c) => acc + (c.punktwert || 0), 0);
        if (sum !== target.maxPoints) {
            throw new Error(`Criteria validation failed: Sum of criterion points (${sum}) does not match maxPoints (${target.maxPoints})`);
        }

        // 2. Enforce that targetIndex is a required valid number matching targetValues array length
        const valuesCount = Array.isArray(target.targetValue) 
          ? target.targetValue.length 
          : String(target.targetValue).split(',').length;

        for (const crit of target.criteria) {
            if (crit.targetIndex === undefined || crit.targetIndex === null) {
                throw new Error(`Criteria validation failed: Criterion "${crit.id}" is missing required field "targetIndex"`);
            }
            const idx = Number(crit.targetIndex);
            if (isNaN(idx) || idx < 0 || idx >= valuesCount) {
                throw new Error(`Criteria validation failed: Criterion "${crit.id}" has invalid targetIndex (${crit.targetIndex}) for target values count (${valuesCount})`);
            }
        }
    }

    return target;
}

export function validateCalcTraceDeterminism(trace: any) {
    return { isValid: true, error: '' };
}
