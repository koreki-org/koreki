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
import { pruefeAequivalenzgruppen } from './equivalence-groups';
import { plugins, PLUGIN_MANIFEST } from './plugins';
import { StructuredPrompt } from '../ai/prompt-builder';
import { GraphRunner } from './GraphRunner';
import graphGenSystemDefault from '../../prompts/graph-generation/system.md';
import graphGenUserDefault from '../../prompts/graph-generation/user.md';
import graphGenRefineSystemDefault from '../../prompts/graph-generation/refine-system.md';
import graphGenRefineUserDefault from '../../prompts/graph-generation/refine-user.md';
import { logger } from '../logger';
import { toErrorMessage } from '../error-message';
import { setzeEin } from '../prompt-placeholder';


// ──────────────────────────────────────────────────────────────────────────
// 1. Plugin Manifest — Dynamic introspection of available domain functions
// ──────────────────────────────────────────────────────────────────────────
// PLUGIN_MANIFEST is now imported directly from plugins.ts to adhere to SOLID principles.

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

  for (const [domain, methods] of Object.entries(PLUGIN_MANIFEST)) {
    for (const [funcName] of Object.entries(methods)) {
      manifest.push({
        domain: domain,
        functionName: funcName,
        expression: `${domain}.${funcName}(...)`
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
    const details = PLUGIN_MANIFEST[entry.domain]?.[entry.functionName];
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
  discipline?: string,
  userNotes?: string
): StructuredPrompt {
  const pluginManifest = formatPluginManifestForPrompt();

  const system = setzeEin(GRAPH_GENERATION_SYSTEM_PROMPT, '{{PLUGIN_MANIFEST}}', pluginManifest);

  const disciplineHint = discipline
    ? `Hinweis: Diese Aufgabe gehört zum Fachgebiet "${discipline}". Bevorzuge Plugin-Funktionen aus der passenden Domain.`
    : '';

  let user = setzeEin(
    setzeEin(GRAPH_GENERATION_USER_PROMPT, '{{TASK_TEXT}}', taskText),
    '{{DISCIPLINE_HINT}}', disciplineHint
  );

  if (userNotes && userNotes.trim()) {
    user += `\n\nZUSÄTZLICHE BEDIENER-ANMERKUNGEN UND SPEZIFISCHE ANFORDERUNGEN AN DEN GRAPHEN:\n${userNotes.trim()}\n\nBerücksichtige diese Anmerkungen strikt bei der Strukturierung des Graphen!`;
  }

  return {
    system,
    user,
    options: {
      temperature: 0.2,
      topP: 0.9
    }
  };
}

/**
 * Builds the structured prompt for AI-assisted graph refinement (conversational adjustments).
 * 
 * @param taskText - The model solution text
 * @param currentGraph - The existing GradingGraph to refine
 * @param userInstruction - The natural language instruction from the teacher
 * @param discipline - Optional discipline hint
 */
export function buildGraphRefinementPrompt(
  taskText: string,
  currentGraph: GradingGraph,
  userInstruction: string,
  discipline?: string
): StructuredPrompt {
  const system = graphGenRefineSystemDefault;

  const disciplineHint = discipline
    ? `Hinweis: Diese Aufgabe gehört zum Fachgebiet "${discipline}". Bevorzuge Plugin-Funktionen aus der passenden Domain.`
    : '';

  let user = setzeEin(graphGenRefineUserDefault, '{{TASK_TEXT}}', taskText);
  user = setzeEin(user, '{{CURRENT_GRAPH}}', JSON.stringify(currentGraph, null, 2));
  user = setzeEin(user, '{{USER_INSTRUCTION}}', userInstruction);
  user = setzeEin(user, '{{DISCIPLINE_HINT}}', disciplineHint);

  return {
    system,
    user,
    options: {
      temperature: 0.0, // Starke Parameter-Härtung (Keine Kreativität)
      topP: 1.0
    }
  };
}



// ──────────────────────────────────────────────────────────────────────────
// 3. Response Parser & Schema — Extracts and validates the generated GradingGraph
// ──────────────────────────────────────────────────────────────────────────

export const GRADING_GRAPH_SCHEMA = {
  type: "object",
  properties: {
    taskId: { type: "string" },
    discipline: { type: "string" },
    disablePoints: { type: ["boolean", "null"] },
    equivalenceGroups: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          prefixes: { type: "array", items: { type: "string" } }
        },
        required: ["id", "prefixes"],
        additionalProperties: false
      }
    },
    variables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["input", "formula"] },
          defaultValue: { type: ["string", "number", "boolean", "null"] },
          expression: { type: ["string", "null"] },
          validationType: { type: "string", enum: ["exact", "tolerance", "contains"] },
          tolerance: { type: ["number", "null"] },
          maxPoints: { type: ["number", "null"] }
        },
        required: ["id", "type", "defaultValue", "expression", "validationType", "tolerance", "maxPoints"],
        additionalProperties: false
      }
    }
  },
  required: ["taskId", "discipline", "disablePoints", "equivalenceGroups", "variables"],
  additionalProperties: false
};

export const VALIDATE_GRAPH_TOOL = {
  type: "function",
  function: {
    name: "validate_graph",
    description: "Validates a grading graph for mathematical determinism. Use this to test your graph before returning the final result. If the validation fails, you will receive an error message explaining what needs to be fixed. Once you are confident the graph is correct, just output the final graph as JSON.",
    parameters: {
      type: "object",
      properties: {
        graph: GRADING_GRAPH_SCHEMA
      },
      required: ["graph"],
      additionalProperties: false
    }
  }
};

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
export function parseGeneratedGraph(llmResponse: string, options?: { skipSanitization?: boolean }): GradingGraph | null {
  if (!llmResponse || !llmResponse.trim()) return null;

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(llmResponse.trim());
  } catch (e) {
    logger.warn("parseGeneratedGraph: JSON.parse failed. Expected structured JSON output.", e);
    return null;
  }

  // Smart recovery: If the LLM response is wrapped in { graph, explanation }
  let targetData = parsed;
  if (parsed.graph && typeof parsed.graph === 'object' && Array.isArray(parsed.graph.variables)) {
    targetData = parsed.graph;
  }

  // Schema validation
  if (!targetData.taskId || typeof targetData.taskId !== 'string') {
    targetData.taskId = `generated-graph-${Date.now()}`;
  }

  if (!targetData.discipline || typeof targetData.discipline !== 'string') {
    targetData.discipline = 'general-science';
  }

  if (!Array.isArray(targetData.variables) || targetData.variables.length === 0) {
    return null;
  }

  // Validate and sanitize each variable
  const validPrefixes = getValidPluginExpressionPrefixes();
  const validatedVariables: VariableDefinition[] = [];

  /**
   * Kennungen müssen eindeutig sein.
   *
   * Es gibt nur EINE Antwort je Kennung — `studentResults[id]`. Zwei Variablen
   * mit demselben Namen lesen also beide dieselbe Antwort und werden trotzdem
   * beide gezählt. Zwei Folgen, beide nachgestellt (18.08.2026):
   *
   * - Bei VERSCHIEDENEN Vorgabewerten bekam die Schülerin 1 von 2 Punkten für
   *   eine richtige Antwort — die zweite Variable prüfte dieselbe Eingabe gegen
   *   einen anderen Erwartungswert. Der Trockenlauf fängt diesen Fall ab.
   * - Bei GLEICHEN Vorgabewerten zählt derselbe Schritt doppelt. Der
   *   Trockenlauf sieht nichts, weil rechnerisch alles aufgeht — die Aufgabe
   *   ist danach nur anders gewichtet, als die Lehrkraft es wollte.
   *
   * Behalten wird das ERSTE Vorkommen: deterministisch und näher an dem, was
   * das Modell zuerst gemeint hat.
   */
  const vergebeneIds = new Set<string>();

  for (const v of targetData.variables as Record<string, unknown>[]) {
    if (!v.id || typeof v.id !== 'string') continue;
    if (v.type !== 'input' && v.type !== 'formula') continue;

    if (vergebeneIds.has(v.id)) {
      logger.warn(`Doppelte Variablen-Kennung "${v.id}" verworfen — es gibt nur eine Antwort je Kennung.`);
      continue;
    }
    vergebeneIds.add(v.id);

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
        const expr = v.expression as string;

        // 1. Check if expression uses a registered plugin function (e.g. network.calculateMask(...))
        const isPluginExpression = validPrefixes.some(prefix => expr.startsWith(prefix));

        // 2. Check if expression is a valid free algebraic formula (e.g. 'a * b + c', 'sqrt(x)')
        //    Security: Only allow safe mathematical characters – variable names, operators,
        //    numbers, parentheses, commas, dots, spaces, and known math functions.
        //    Block anything that looks like arbitrary code injection (semicolons, brackets, etc.)
        const isSafeAlgebra = !isPluginExpression && /^[a-zA-Z0-9_+\-*/^(). ,\t]+$/.test(expr);

        if (isPluginExpression || isSafeAlgebra) {
          variable.expression = expr;
        } else {
          // Skip truly invalid expressions to prevent runtime crashes
          logger.warn(`Skipping invalid formula variable "${v.id}" with expression: "${expr}"`);
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
  if (!options?.skipSanitization) {
    sanitizePointsDistribution(validatedVariables);
  }

  const result: GradingGraph = {
    taskId: targetData.taskId as string,
    discipline: targetData.discipline as string,
    variables: validatedVariables
  };

  if (typeof targetData.disablePoints === 'boolean') {
    result.disablePoints = targetData.disablePoints;
  }

  const gruppen = pruefeAequivalenzgruppen(targetData.equivalenceGroups);
  if (gruppen) {
    result.equivalenceGroups = gruppen;
  }

  return result;
}


/**
 * Smart Post-Processing Hygienization for GradingGraph Points Distribution.
 * 
 * Prevents the "Follow-Through Paradoxon" where all input variables receive 0 points 
 * and only the final formula variable receives points, resulting in a student receiving
 * 100% points despite making primary errors (due to consecutive error compensation).
 */
function sanitizePointsDistribution(variables: VariableDefinition[]): void {
  const initialTotal = variables.reduce((sum, v) => sum + (v.maxPoints || 0), 0);
  
  if (initialTotal === 0) {
      // Fallback: If LLM failed to assign any points, ensure the graph is valid and visible in UI
      const formulaVars = variables.filter(v => v.type === 'formula');
      if (formulaVars.length > 0) {
          formulaVars.forEach(v => v.maxPoints = 1);
      } else if (variables.length > 0) {
          variables[variables.length - 1].maxPoints = 1;
      }
  }

  const totalPoints = variables.reduce((sum, v) => sum + (v.maxPoints || 0), 0);
  if (totalPoints === 0) return;

  // Removed: The "Follow-Through Paradoxon" aggressive sanitization has been permanently
  // deleted because it violates the teacher's pedagogical autonomy to assign 0 points to inputs.
}

/**
 * Performs an automated mathematical plausibility dry-run on the generated GradingGraph.
 * Simulates graph execution using target default values for input variables and validates that
 * all formulas compile, evaluate, and yield results successfully without throwing runtime exceptions.
 */
export function validateGraphDeterminism(graph: GradingGraph): { isValid: boolean; error?: string } {
  if (!graph || !Array.isArray(graph.variables) || graph.variables.length === 0) {
    return { isValid: false, error: 'Der generierte Graph enthält keine Variablen.' };
  }

  // 1. Gather all input variables and check their default values
  const mockStudentAnswers: Record<string, any> = {};
  for (const v of graph.variables) {
    if (v.type === 'input') {
      if (v.defaultValue === undefined || v.defaultValue === null) {
        return { isValid: false, error: `Die Input-Variable "${v.id}" hat keinen Standardwert (defaultValue).` };
      }
      mockStudentAnswers[v.id] = v.defaultValue;
    }
  }

  // 2. Perform mock grading simulation using the perfect default answers
  try {
    const result = GraphRunner.grade(graph, mockStudentAnswers);

    // 3. Inspect results for mathematical errors and non-determinism
    for (const step of result.stepResults) {
      const variable = graph.variables.find(v => v.id === step.variableId);
      if (!variable) continue;

      if (variable.type === 'formula') {
        // If evaluation failed, the expectedValue is set to null in GraphRunner
        if (step.expectedValue === null || step.expectedValue === undefined || step.expectedValue === 'Error ⚠️') {
          return {
            isValid: false,
            error: `Mathematischer Auswertungsfehler bei Formel "${step.variableId}" mit Ausdruck: "${variable.expression || ''}". Bitte prüfe Syntax und Variablenreferenzen.`
          };
        }
      }

      if (variable.type === 'input') {
        // In a perfect master-key execution run, input variables should evaluate to 'correct'
        if (step.status !== 'correct') {
          return {
            isValid: false,
            error: `Plausibilitätsfehler beim Ausführen der Input-Variable "${step.variableId}". Der Standardwert ist inkonsistent.`
          };
        }
      }
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: `Unerwarteter Absturz während der Graphen-Simulation: ${toErrorMessage(err)}`
    };
  }
}
