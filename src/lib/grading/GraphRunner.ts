import { 
  GradingGraph, 
  GradingResult, 
  StepResult, 
  StepResultStatus, 
  VariableDefinition,
  EquivalenceGroup
} from './types';
import { evaluateExpression } from './plugins';
import { collectReferencedVariables } from './variable-references';

export class GraphRunner {
  /**
   * Generates all permutations of a list.
   */
  private static permute<T>(list: T[]): T[][] {
    if (list.length === 0) return [[]];
    const result: T[][] = [];
    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      const remaining = list.slice(0, i).concat(list.slice(i + 1));
      const remainingPermutations = this.permute(remaining);
      for (const p of remainingPermutations) {
        result.push([current].concat(p));
      }
    }
    return result;
  }

  /**
   * Generates all prefix mapping combinations for equivalence groups.
   */
  private static generatePermutationMappings(groups: EquivalenceGroup[]): Record<string, string>[] {
    // Start with a single empty mapping
    let currentMappings: Record<string, string>[] = [{}];

    for (const group of groups) {
      const originalPrefixes = group.prefixes;
      const permutations = this.permute(originalPrefixes);
      
      const nextMappings: Record<string, string>[] = [];
      for (const mapping of currentMappings) {
        for (const perm of permutations) {
          const newMapping = { ...mapping };
          for (let i = 0; i < originalPrefixes.length; i++) {
            newMapping[originalPrefixes[i]] = perm[i] as string;
          }
          nextMappings.push(newMapping);
        }
      }
      currentMappings = nextMappings;
    }

    return currentMappings;
  }

  /**
   * Maps student result keys to graph expected keys.
   */
  private static mapStudentResultsToGraph(studentResults: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [studentId, val] of Object.entries(studentResults)) {
      let graphId = studentId;
      for (const [graphPrefixRaw, studentPrefixRaw] of Object.entries(mapping)) {
        const graphPrefix = graphPrefixRaw.replace(/_$/, '');
        const studentPrefix = studentPrefixRaw.replace(/_$/, '');
        if (studentId.startsWith(studentPrefix + '_')) {
          graphId = studentId.replace(studentPrefix + '_', graphPrefix + '_');
          break;
        }
      }
      mapped[graphId] = val;
    }
    return mapped;
  }

  /**
   * Restores original student IDs in grading result steps.
   */
  private static restoreStudentIdsInResult(result: GradingResult, mapping: Record<string, string>): GradingResult {
    const restoredStepResults = result.stepResults.map(step => {
      let studentId = step.variableId;
      for (const [graphPrefixRaw, studentPrefixRaw] of Object.entries(mapping)) {
        const graphPrefix = graphPrefixRaw.replace(/_$/, '');
        const studentPrefix = studentPrefixRaw.replace(/_$/, '');
        if (step.variableId.startsWith(graphPrefix + '_')) {
          studentId = step.variableId.replace(graphPrefix + '_', studentPrefix + '_');
          break;
        }
      }
      return {
        ...step,
        variableId: studentId
      };
    });

    return {
      ...result,
      stepResults: restoredStepResults
    };
  }

  /**
   * Helper to extract variable dependencies in an expression.
   */
  private static getReferencedVariables(expression: string, allVarIds: string[]): string[] {
    // Maskiert die ID, statt sie roh ins Muster zu setzen: Variablen-IDs sind
    // frei eingebbar, und ein `(` darin hat die Engine sonst zum Absturz
    // gebracht (siehe lib/grading/variable-references.ts).
    return collectReferencedVariables(expression, allVarIds);
  }

  /**
   * Validates a student's answer against both the expected values (master key)
   * and computed values (accounting for previous errors / consecutive compensation).
   */
  public static grade(graph: GradingGraph, studentResults: Record<string, any>): GradingResult {
    const equivalenceGroups = graph.equivalenceGroups;
    if (!equivalenceGroups || equivalenceGroups.length === 0) {
      return this.executeGrading(graph, studentResults, studentResults);
    }

    const mappings = this.generatePermutationMappings(equivalenceGroups);
    let bestResult: GradingResult | null = null;
    let bestMapping: Record<string, string> | null = null;

    for (const mapping of mappings) {
      const mappedStudentResults = this.mapStudentResultsToGraph(studentResults, mapping);
      const virtualResult = this.executeGrading(graph, mappedStudentResults, studentResults);

      if (!bestResult || virtualResult.totalPoints > bestResult.totalPoints) {
        bestResult = virtualResult;
        bestMapping = mapping;
      }
    }

    return this.restoreStudentIdsInResult(bestResult!, bestMapping!);
  }

  /**
   * Internal grading runner logic.
   */
  private static executeGrading(
    graph: GradingGraph, 
    studentResults: Record<string, any>, 
    originalStudentResults?: Record<string, any>
  ): GradingResult {
    const stepResults: StepResult[] = [];
    let totalPoints = 0;
    let maxPoints = 0;

    // Context for computing absolute mathematical truth
    const expectedContext: Record<string, any> = {};
    
    // Context for computing follow-through values based on student's actual inputs
    const computedContext: Record<string, any> = {};

    for (const variable of graph.variables) {
      const { id, type, defaultValue, expression, validationType, tolerance } = variable;
      const stepMaxPoints = variable.maxPoints ?? 1;
      maxPoints += stepMaxPoints;

      let expectedValue: any;
      let computedValueBasedOnErrors: any;

      // 1. Calculate the values
      if (type === 'input') {
        // Input variables have fixed static values
        expectedValue = defaultValue;
        computedValueBasedOnErrors = defaultValue;
      } else if (type === 'formula' && expression) {
        try {
          // Expected value based on absolute truth context
          expectedValue = evaluateExpression(expression, expectedContext);
        } catch (err: any) {
          expectedValue = null;
        }

        try {
          // Computed value based on the student's actual (potentially erroneous) inputs
          computedValueBasedOnErrors = evaluateExpression(expression, computedContext);
        } catch (err: any) {
          computedValueBasedOnErrors = null;
        }
      }

      // Populate expected context for subsequent nodes (defaulting to the first alternative if array)
      expectedContext[id] = Array.isArray(expectedValue) ? expectedValue[0] : expectedValue;

      // Get student input
      let studentValue = studentResults[id];

      // 2. Perform Validation
      let isAbsolutelyCorrect = false;
      let isConsecutivelyCorrect = false;

      let isInputFallback = false;

      if (studentValue !== undefined && studentValue !== null) {
        isAbsolutelyCorrect = this.checkMatch(studentValue, expectedValue, validationType, tolerance);
        
        // Symmetrical Input Fallback: If it's a static input variable and mapped incorrectly due to prefix permutations,
        // check if the student explicitly wrote the original unmapped default value (respecting physical constraints).
        if (!isAbsolutelyCorrect && type === 'input' && originalStudentResults) {
          const originalValue = originalStudentResults[id];
          if (originalValue !== undefined && originalValue !== null) {
            isAbsolutelyCorrect = this.checkMatch(originalValue, expectedValue, validationType, tolerance);
          }
        }

        // If not absolutely correct, check if it matches the computed value based on previous errors
        if (!isAbsolutelyCorrect && computedValueBasedOnErrors !== null && computedValueBasedOnErrors !== undefined) {
          isConsecutivelyCorrect = this.checkMatch(studentValue, computedValueBasedOnErrors, validationType, tolerance);
        }
      } else if (type === 'input') {
        // Symmetrical Input Fallback: if an input variable is omitted in the student's text,
        // treat it as a fallback omission (0 points, primary_error) but propagate its expected value downstream.
        isInputFallback = true;
        isAbsolutelyCorrect = false;
      }

      // 3. Determine Status and Award Points
      let status: StepResultStatus = 'primary_error';
      let points = 0;
      let note = '';

      if (isInputFallback) {
        status = 'primary_error';
        points = 0;
        note = `Wert nicht explizit angegeben (als Vorgabe vorausgesetzt).`;
      } else if (isAbsolutelyCorrect) {
        status = 'correct';
        points = stepMaxPoints;
        note = `Schritt korrekt gelöst.`;
      } else if (isConsecutivelyCorrect) {
        // Path-based Alternative Promotion:
        // If all referenced predecessor variables in the expression were correct,
        // promote this to 'correct' (since it is a valid alternative path).
        const referencedVars = this.getReferencedVariables(expression || '', graph.variables.map(v => v.id));
        const hasErrorsInPredecessors = referencedVars.some(depId => {
          const depResult = stepResults.find(r => r.variableId === depId);
          return depResult && depResult.status !== 'correct';
        });

        if (!hasErrorsInPredecessors && referencedVars.length > 0) {
          status = 'correct';
          points = stepMaxPoints;
          note = `Schritt korrekt gelöst (Alternativlösung).`;
        } else {
          status = 'consecutive_correct';
          points = stepMaxPoints;
          note = `Folgeschritt mathematisch korrekt fortgeführt basierend auf vorherigem Fehler.`;
        }
      } else {
        status = 'primary_error';
        points = 0;
        note = `Fehlerhafter Rechenschritt. Erwartet wurde: "${expectedValue}"`;
        if (computedValueBasedOnErrors !== expectedValue && computedValueBasedOnErrors !== null) {
          note += ` (Auch basierend auf deinem vorherigen Fehler wäre "${computedValueBasedOnErrors}" korrekt gewesen).`;
        }
      }

      totalPoints += points;

      // 4. Update the computed context with the STUDENT'S value
      // This propagates their error downstream so we can check consecutive errors!
      computedContext[id] = studentValue !== undefined
        ? studentValue
        : (computedValueBasedOnErrors !== null && computedValueBasedOnErrors !== undefined
           ? computedValueBasedOnErrors
           : expectedValue);

      stepResults.push({
        variableId: id,
        status,
        expectedValue,
        studentValue: isInputFallback ? null : studentValue,
        computedValueBasedOnErrors,
        points,
        maxPoints: stepMaxPoints,
        note
      });
    }

    return {
      taskId: graph.taskId,
      stepResults,
      totalPoints,
      maxPoints
    };
  }

  /**
   * Helper to compare values based on validation types
   */
  private static checkMatch(studentVal: any, expectedVal: any, type: string, tolerance?: number): boolean {
    if (Array.isArray(expectedVal)) {
      return expectedVal.some(val => this.checkMatch(studentVal, val, type, tolerance));
    }

    // Robust normalization: Convert string to number if expected value is a number
    let cleanStudentVal = studentVal;
    if (typeof expectedVal === 'number' && typeof studentVal === 'string') {
      const parsed = parseFloat(studentVal.trim());
      if (!isNaN(parsed)) {
        cleanStudentVal = parsed;
      }
    }

    if (typeof expectedVal === 'string' && typeof cleanStudentVal === 'string') {
      // Normalize strings (lowercase, trim)
      const cleanStudent = cleanStudentVal.trim().toLowerCase();
      const cleanExpected = expectedVal.trim().toLowerCase();

      if (type === 'contains') {
        return cleanStudent.includes(cleanExpected);
      }
      return cleanStudent === cleanExpected;
    }

    if (typeof expectedVal === 'number' && typeof cleanStudentVal === 'number') {
      if (type === 'tolerance' && tolerance !== undefined) {
        const isAbsoluteMatch = Math.abs(cleanStudentVal - expectedVal) <= tolerance;
        
        // If tolerance is specified as a fraction (< 1.0, e.g., 0.05 for 5%),
        // also check it as a relative percentage tolerance based on the expected value.
        const isRelativeMatch = tolerance < 1.0 && Math.abs(cleanStudentVal - expectedVal) <= (tolerance * Math.abs(expectedVal));
        
        return isAbsoluteMatch || isRelativeMatch;
      }
      return cleanStudentVal === expectedVal;
    }

    // Default strict equality
    return cleanStudentVal === expectedVal;
  }
}
