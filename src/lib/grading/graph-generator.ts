/**
 * Graph Generator — AI-Assisted GradingGraph Synthesis
 * 
 * Pure logic module (no React, no State).
 * Builds LLM prompts from task text, parses and validates the generated
 * GradingGraph JSON against the PANG Engine schema.
 * 
 * Architecture: src/lib/ (Pure Logic Layer)
 * @see GraphRunner.ts for the execution engine
 * @see plugins.ts for available domain functions
 */

import { GradingGraph, VariableDefinition } from './types';
import { plugins } from './plugins';
import { StructuredPrompt } from '../ai/prompt-builder';
import graphGenSystemDefault from '../../prompts/graph-generation/system.md';
import graphGenUserDefault from '../../prompts/graph-generation/user.md';

// ──────────────────────────────────────────────────────────────────────────
// 1. Plugin Manifest — Dynamic introspection of available domain functions
// ──────────────────────────────────────────────────────────────────────────

const PLUGIN_DETAILS: Record<string, Record<string, { signature: string; description: string }>> = {
  network: {
    calculateMask: {
      signature: "network.calculateMask(hosts)",
      description: "Berechnet das CIDR-Präfix (z. B. '/24') basierend auf der benötigten Host-Anzahl."
    },
    calculateSize: {
      signature: "network.calculateSize(mask)",
      description: "Gibt die Gesamtanzahl an IP-Adressen für eine Maske zurück (z. B. '/24' -> 256)."
    },
    calculateNetId: {
      signature: "network.calculateNetId(prevNetId, prevMask)",
      description: "Berechnet die nächste Netz-ID basierend auf der vorherigen Netz-ID und Maske."
    },
    calculateBroadcast: {
      signature: "network.calculateBroadcast(netId, mask)",
      description: "Berechnet die Broadcast-IP für eine Netz-ID und Maske."
    },
    calculateFirstHost: {
      signature: "network.calculateFirstHost(netId)",
      description: "Berechnet die erste nutzbare Host-IP (Net-ID + 1)."
    },
    calculateLastHost: {
      signature: "network.calculateLastHost(netId, mask)",
      description: "Berechnet die letzte nutzbare Host-IP (Broadcast-IP - 1)."
    },
    calculateGateway: {
      signature: "network.calculateGateway(netId, mask)",
      description: "Berechnet die Gateway-IP (standardmäßig die letzte nutzbare IP)."
    }
  },
  raid: {
    calculateNetCapacity: {
      signature: "raid.calculateNetCapacity(level, disks, size)",
      description: "Berechnet die Netto-Kapazität in TB. Parameter: level (RAID-Level: 0, 1, 5, 6, 10), disks (Anzahl Platten), size (Kapazität einer Platte)."
    },
    calculateFaultTolerance: {
      signature: "raid.calculateFaultTolerance(level, disks)",
      description: "Berechnet die Anzahl der verkraftbaren Plattenausfälle. Parameter: level (RAID-Level: 0, 1, 5, 6, 10), disks (Anzahl Platten)."
    }
  },
  math: {
    add: {
      signature: "math.add(a, b)",
      description: "Addiert a und b."
    },
    subtract: {
      signature: "math.subtract(a, b)",
      description: "Subtrahiert b von a."
    },
    multiply: {
      signature: "math.multiply(a, b)",
      description: "Multipliziert a mit b."
    },
    divide: {
      signature: "math.divide(a, b)",
      description: "Dividiert a durch b (Sicher vor Division durch Null)."
    },
    power: {
      signature: "math.power(base, exponent)",
      description: "Berechnet base hoch exponent."
    },
    percentage: {
      signature: "math.percentage(part, total)",
      description: "Berechnet den prozentualen Anteil von part an total."
    }
  }
};

interface PluginFunctionSignature {
  domain: string;
  functionName: string;
  expression: string;
}

/**
 * Reads the registered plugins from plugins.ts and generates a
 * human-readable function signature list for the LLM prompt.
 */
export function getAvailablePluginManifest(): PluginFunctionSignature[] {
  const manifest: PluginFunctionSignature[] = [];

  for (const [domainName, domainFunctions] of Object.entries(plugins)) {
    for (const functionName of Object.keys(domainFunctions)) {
      manifest.push({
        domain: domainName,
        functionName,
        expression: `${domainName}.${functionName}(...)`
      });
    }
  }

  return manifest;
}

/**
 * Formats the plugin manifest into a string block suitable for LLM prompts.
 */
function formatPluginManifestForPrompt(): string {
  const manifest = getAvailablePluginManifest();
  const byDomain: Record<string, string[]> = {};

  for (const entry of manifest) {
    if (!byDomain[entry.domain]) byDomain[entry.domain] = [];
    
    // Find rich signature/description if available
    const details = PLUGIN_DETAILS[entry.domain]?.[entry.functionName];
    if (details) {
      byDomain[entry.domain].push(`  - ${details.signature} : ${details.description}`);
    } else {
      byDomain[entry.domain].push(`  - ${entry.domain}.${entry.functionName}(...)`);
    }
  }

  return Object.entries(byDomain)
    .map(([domain, fns]) => `Domain "${domain}":\n${fns.join('\n')}`)
    .join('\n\n');
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Prompt Builder — Constructs the system + user prompts for the LLM
// ──────────────────────────────────────────────────────────────────────────

const GRAPH_GENERATION_SYSTEM_PROMPT = graphGenSystemDefault;

const GRAPH_GENERATION_USER_PROMPT = graphGenUserDefault;

/**
 * Builds the structured prompt for AI-assisted graph generation.
 * 
 * @param taskText - The model solution text for the specific task
 * @param discipline - Optional hint for the discipline (e.g., 'computer-science-networking')
 */
export function buildGraphGenerationPrompt(
  taskText: string,
  discipline?: string
): StructuredPrompt {
  const pluginManifest = formatPluginManifestForPrompt();

  const system = GRAPH_GENERATION_SYSTEM_PROMPT
    .replace('{{PLUGIN_MANIFEST}}', pluginManifest);

  const disciplineHint = discipline
    ? `Hinweis: Diese Aufgabe gehört zum Fachgebiet "${discipline}". Bevorzuge Plugin-Funktionen aus der passenden Domain.`
    : '';

  const user = GRAPH_GENERATION_USER_PROMPT
    .replace('{{TASK_TEXT}}', taskText)
    .replace('{{DISCIPLINE_HINT}}', disciplineHint);

  return {
    system,
    user,
    options: {
      temperature: 0.2,
      topP: 0.9
    }
  };
}


// ──────────────────────────────────────────────────────────────────────────
// 3. Response Parser — Extracts and validates the generated GradingGraph
// ──────────────────────────────────────────────────────────────────────────

/** Set of all valid plugin expressions for security validation */
function getValidPluginExpressionPrefixes(): string[] {
  const manifest = getAvailablePluginManifest();
  return manifest.map(m => `${m.domain}.${m.functionName}(`);
}

/**
 * Parses the raw LLM response string into a validated GradingGraph.
 * Handles Markdown code fences, thinking blocks, and trailing commas.
 * 
 * @returns A validated GradingGraph or null if parsing/validation fails
 */
export function parseGeneratedGraph(llmResponse: string): GradingGraph | null {
  if (!llmResponse || !llmResponse.trim()) return null;

  let cleaned = llmResponse.trim();

  // Strip Markdown code fences
  if (cleaned.includes('```json')) {
    const parts = cleaned.split('```json');
    if (parts.length > 1) cleaned = parts[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    const parts = cleaned.split('```');
    if (parts.length > 1) cleaned = parts[1].split('```')[0].trim();
  }

  // Strip thinking/reasoning blocks (common with Qwen, Mistral Medium)
  cleaned = cleaned
    .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '')
    .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
    .replace(/\[thought\][\s\S]*?(\[\/thought\]|$)/gi, '')
    .trim();

  // Greedy JSON extraction
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let jsonStr = jsonMatch[0];

  // Repair trailing commas (common LLM failure)
  jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  // Schema validation
  if (!parsed.taskId || typeof parsed.taskId !== 'string') {
    parsed.taskId = `generated-graph-${Date.now()}`;
  }

  if (!parsed.discipline || typeof parsed.discipline !== 'string') {
    parsed.discipline = 'general-science';
  }

  if (!Array.isArray(parsed.variables) || parsed.variables.length === 0) {
    return null;
  }

  // Validate and sanitize each variable
  const validPrefixes = getValidPluginExpressionPrefixes();
  const validatedVariables: VariableDefinition[] = [];

  for (const v of parsed.variables as Record<string, unknown>[]) {
    if (!v.id || typeof v.id !== 'string') continue;
    if (v.type !== 'input' && v.type !== 'formula') continue;

    const variable: VariableDefinition = {
      id: v.id as string,
      type: v.type as 'input' | 'formula',
      validationType: (v.validationType === 'tolerance' || v.validationType === 'contains')
        ? v.validationType
        : 'exact',
      maxPoints: typeof v.maxPoints === 'number' ? v.maxPoints : 1
    };

    if (v.type === 'input' && v.defaultValue !== undefined) {
      variable.defaultValue = v.defaultValue;
    }

    let shouldKeep = true;
    if (v.type === 'formula') {
      if (typeof v.expression === 'string') {
        // Security: Validate that expression uses only registered plugin functions
        const expr = v.expression as string;
        const isValidExpression = validPrefixes.some(prefix => expr.startsWith(prefix));

        if (isValidExpression) {
          variable.expression = expr;
        } else {
          // Skip invalid formula variables to prevent runtime crashes!
          console.warn(`Skipping invalid formula variable "${v.id}" with expression: "${expr}"`);
          shouldKeep = false;
        }
      } else {
        shouldKeep = false;
      }
    }

    if (v.validationType === 'tolerance' && typeof v.tolerance === 'number') {
      variable.tolerance = v.tolerance as number;
    }

    if (shouldKeep) {
      validatedVariables.push(variable);
    }
  }

  if (validatedVariables.length === 0) return null;

  // Smart Post-Processing: Prevent the Follow-Through Paradoxon by ensuring robust points distribution
  sanitizePointsDistribution(validatedVariables);

  return {
    taskId: parsed.taskId as string,
    discipline: parsed.discipline as string,
    variables: validatedVariables
  };
}

/**
 * Smart Post-Processing Hygienization for GradingGraph Points Distribution.
 * 
 * Prevents the "Follow-Through Paradoxon" where all input variables receive 0 points 
 * and only the final formula variable receives points, resulting in a student receiving
 * 100% points despite making primary errors (due to consecutive error compensation).
 */
function sanitizePointsDistribution(variables: VariableDefinition[]): void {
  const totalPoints = variables.reduce((sum, v) => sum + (v.maxPoints || 0), 0);
  if (totalPoints === 0) return;

  const inputVars = variables.filter(v => v.type === 'input');
  const formulaVars = variables.filter(v => v.type === 'formula');

  // Trigger hygienization if:
  // 1. There is at least one input variable and at least one formula variable.
  // 2. ALL input variables have 0 (or undefined) points.
  // 3. At least one formula variable has > 0 points.
  // This is the classic "Follow-Through Paradoxon" pattern produced by unhygienic LLM graph generation.
  const hasOnlyZeroPointsInputs = inputVars.length > 0 && inputVars.every(v => !v.maxPoints || v.maxPoints === 0);
  const hasFormulaWithPoints = formulaVars.some(v => v.maxPoints && v.maxPoints > 0);

  if (hasOnlyZeroPointsInputs && hasFormulaWithPoints) {
    const varCount = variables.length;

    if (totalPoints >= varCount) {
      // 1. Every variable receives at least 1 point
      for (const v of variables) {
        v.maxPoints = 1;
      }

      // 2. Distribute the remaining points onto the final formula variable (the main result)
      const remaining = totalPoints - varCount;
      if (formulaVars.length > 0) {
        const lastFormula = formulaVars[formulaVars.length - 1];
        lastFormula.maxPoints = (lastFormula.maxPoints || 1) + remaining;
      } else {
        const lastVar = variables[variables.length - 1];
        lastVar.maxPoints = (lastVar.maxPoints || 1) + remaining;
      }
    } else {
      // Fallback: If totalPoints < varCount, distribute as many points as possible (max 1 per variable)
      let pointsToDistribute = totalPoints;
      for (const v of variables) {
        v.maxPoints = 0;
      }
      
      // Prioritize formulas
      for (let i = formulaVars.length - 1; i >= 0 && pointsToDistribute > 0; i--) {
        formulaVars[i].maxPoints = 1;
        pointsToDistribute--;
      }
      
      // Then inputs
      for (let i = 0; i < inputVars.length && pointsToDistribute > 0; i++) {
        inputVars[i].maxPoints = 1;
        pointsToDistribute--;
      }
    }
  }
}
