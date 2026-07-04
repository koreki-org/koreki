import { TargetGoal } from './calc-trace-types';

export const TARGET_GOAL_SCHEMA = {
  type: "object",
  properties: {
    targetValue: { type: "string", description: "Das numerische Endergebnis der Aufgabe (bei mehreren Werten durch Komma getrennt, z.B. '7.38, 4.62')" },
    maxPoints: { type: "number", description: "Die maximale Punktzahl" },
    unit: { type: "string", description: "Die Einheit des Ergebnisses (z.B. kg, m, A, V)" },
    gradingRubric: { type: "string", description: "Ein kurzer Text für die KI-Bewertung, der festlegt, wofür es Teilpunkte gibt (z.B. '1P für Formel, 1P fürs Einsetzen, 1P für Ergebnis')." }
  },
  required: ["targetValue", "maxPoints", "unit", "gradingRubric"]
};

// Legacy Export for existing AI provider imports (we don't use tool calling anymore)
export const VALIDATE_CALC_TRACE_TOOL = {};

export function buildCalcTraceGenerationPrompt(taskText: string, discipline: string, userNotes?: string) {
    const system = `Du bist ein KI-Assistent zur Extraktion von Zielwerten und Bewertungskriterien aus Musterlösungen.
Deine Aufgabe ist es, aus dem Text einer Musterlösung ALLE geforderten numerischen Zielwerte (sowohl wichtige Zwischenergebnisse/Meilensteine als auch das finale Endergebnis) zu extrahieren, für die es Punkte gibt. 
Zudem sollst du die maximale Punktzahl erkennen und einen kurzen, prägnanten "Erwartungshorizont" (Rubric) formulieren, der auflistet, wie sich die Punkte zusammensetzen (Teilpunkte).

WICHTIG: Antworte AUSSCHLIESSLICH im puren JSON Format. Verwende KEIN Markdown (kein \`\`\`json), schreibe keinen Text davor oder danach! Dein gesamter Output muss als JSON-String geparst werden können.

Schema:
{
  "targetValue": (string, ALLE relevanten Meilensteine und das Endergebnis durch Komma getrennt. NUR nackte Zahlen, KEINE Einheiten! z.B. "6.5, 1.846"),
  "maxPoints": (number),
  "unit": (string, alle zugehörigen Einheiten kommagetrennt in exakt derselben Reihenfolge wie targetValue, z.B. "kOhm, mA"),
  "gradingRubric": (string)
}

${userNotes ? `Zusätzliche Instruktion vom Nutzer: ${userNotes}` : ''}`;

    const user = `Analysiere folgenden Text der Aufgabe/Musterlösung und extrahiere das 'TargetGoal':\n\n${taskText}`;
    
    return { system, user };
}

export function buildCalcTraceRefinementPrompt(taskText: string, currentTrace: any, userInstruction: string, discipline: string) {
    return { system: '', user: '' };
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
    
    return {
        targetValue: data.targetValue || 0,
        maxPoints: data.maxPoints || 0,
        unit: data.unit || '',
        gradingRubric: data.gradingRubric || ''
    };
}

export function validateCalcTraceDeterminism(trace: any) {
    return { isValid: true, error: '' };
}
