import { 
  GradingGraph, 
  GradingResult, 
  StepResult, 
  StepResultStatus, 
  VariableDefinition,
  EquivalenceGroup
} from './types';
import { evaluateExpression } from './plugins';

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
      for (const [graphPrefix, studentPrefix] of Object.entries(mapping)) {
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
      for (const [graphPrefix, studentPrefix] of Object.entries(mapping)) {
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
    return allVarIds.filter(id => {
      const regex = new RegExp(`\\b${id}\\b`);
      return regex.test(expression);
    });
  }

  /**
   * Validates a student's answer against both the expected values (master key)
   * and computed values (accounting for previous errors / consecutive compensation).
   */
  public static grade(graph: GradingGraph, studentResults: Record<string, any>): GradingResult {
    const equivalenceGroups = graph.equivalenceGroups;
    if (!equivalenceGroups || equivalenceGroups.length === 0) {
      return this.executeGrading(graph, studentResults);
    }

    const mappings = this.generatePermutationMappings(equivalenceGroups);
    let bestResult: GradingResult | null = null;
    let bestMapping: Record<string, string> | null = null;

    for (const mapping of mappings) {
      const mappedStudentResults = this.mapStudentResultsToGraph(studentResults, mapping);
      const virtualResult = this.executeGrading(graph, mappedStudentResults);

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
  private static executeGrading(graph: GradingGraph, studentResults: Record<string, any>): GradingResult {
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

      if (studentValue !== undefined && studentValue !== null) {
        isAbsolutelyCorrect = this.checkMatch(studentValue, expectedValue, validationType, tolerance);
        
        // If not absolutely correct, check if it matches the computed value based on previous errors
        if (!isAbsolutelyCorrect && computedValueBasedOnErrors !== null && computedValueBasedOnErrors !== undefined) {
          isConsecutivelyCorrect = this.checkMatch(studentValue, computedValueBasedOnErrors, validationType, tolerance);
        }
      } else if (type === 'input') {
        // Symmetrical Input Fallback: if an input variable is omitted in the student's text,
        // automatically treat it as correct and propagate its expected value downstream.
        studentValue = expectedValue;
        isAbsolutelyCorrect = true;
      }

      // 3. Determine Status and Award Points
      let status: StepResultStatus = 'primary_error';
      let points = 0;
      let note = '';

      if (isAbsolutelyCorrect) {
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
      computedContext[id] = studentValue !== undefined ? studentValue : expectedValue;

      stepResults.push({
        variableId: id,
        status,
        expectedValue,
        studentValue,
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

    if (typeof expectedVal === 'string' && typeof studentVal === 'string') {
      // Normalize strings (lowercase, trim)
      const cleanStudent = studentVal.trim().toLowerCase();
      const cleanExpected = expectedVal.trim().toLowerCase();

      if (type === 'contains') {
        return cleanStudent.includes(cleanExpected);
      }
      return cleanStudent === cleanExpected;
    }

    if (typeof expectedVal === 'number' && typeof studentVal === 'number') {
      if (type === 'tolerance' && tolerance !== undefined) {
        return Math.abs(studentVal - expectedVal) <= tolerance;
      }
      return studentVal === expectedVal;
    }

    // Default strict equality
    return studentVal === expectedVal;
  }

  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Dedicated markdown pipe table parser.
   */
  private static extractFromTable(studentText: string, graph: GradingGraph): Record<string, any> {
    const results: Record<string, any> = {};
    
    // Preprocess tab-separated text into markdown pipe table format
    if (!studentText.includes('|') && studentText.includes('\t')) {
      studentText = studentText.split('\n').map(line => {
        if (!line.includes('\t')) return line;
        const parts = line.split('\t').map(p => p.trim());
        return `| ${parts.join(' | ')} |`;
      }).join('\n');
    }

    const lines = studentText.split('\n');
    
    // Find all lines containing pipes '|'
    const tableLines = lines.map(line => line.trim()).filter(line => line.includes('|'));
    if (tableLines.length < 2) {
      return results;
    }

    let headerIdx = -1;
    let colMap: Record<number, string> = {};

    // 1. Identify header line
    for (let i = 0; i < tableLines.length; i++) {
      const line = tableLines[i];
      const cells = line.split('|').map(c => c.trim().toLowerCase());
      
      let isHeader = false;
      let tempColMap: Record<number, string> = {};
      
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        if (!cell) continue;

        if (/(gateway|gw|standardgateway|router)/i.test(cell)) {
          tempColMap[j] = 'gateway';
          isHeader = true;
        } else if (/(firsthost|first_host|ersteip|erste\s*ip|erste\s*ip-adresse|first\s*ip|erste\s*nutzbare|erster\s*host|erste\s*host|erster\s*ip)/i.test(cell)) {
          tempColMap[j] = 'firsthost';
          isHeader = true;
        } else if (/(lasthost|last_host|letzteip|letzte\s*ip|letzte\s*ip-adresse|last\s*ip|letzte\s*nutzbare)/i.test(cell)) {
          tempColMap[j] = 'lasthost';
          isHeader = true;
        } else if (/(host|pcs|geräte|rechner|anzahl|client|größe)/i.test(cell)) {
          tempColMap[j] = 'hosts';
          isHeader = true;
        } else if (/(broadcast|bc|broadcastadresse)/i.test(cell)) {
          tempColMap[j] = 'broadcast';
          isHeader = true;
        } else if (/(netid|net_id|net-id|netzadresse|netzwerkadresse|netz-id|netz\s*id)/i.test(cell)) {
          tempColMap[j] = 'netid';
          isHeader = true;
        } else if (/(maske?|cidr|prefix|präfix|slash)/i.test(cell) || cell.includes('/')) {
          tempColMap[j] = 'mask';
          isHeader = true;
        } else if (/(subnet|subnetz|netzwerk|bereich|bezeichnung|name|klasse)/i.test(cell) || cell === 'id') {
          tempColMap[j] = 'subnetName';
          isHeader = true;
        }
      }

      if (isHeader && Object.keys(tempColMap).length >= 2) {
        headerIdx = i;
        colMap = tempColMap;
        break;
      }
    }

    if (headerIdx === -1) {
      return results;
    }

    // 2. Parse data rows following the header
    for (let i = headerIdx + 1; i < tableLines.length; i++) {
      const line = tableLines[i];
      
      // Skip markdown table separator lines like |---|---|
      if (/^[|\s\-:+\n]+$/.test(line)) {
        continue;
      }

      const cells = line.split('|').map(c => c.trim());
      
      // Find row subnet name
      let rowSubnetName = '';
      for (const [colIdx, colType] of Object.entries(colMap)) {
        if (colType === 'subnetName') {
          rowSubnetName = cells[Number(colIdx)]?.toLowerCase() || '';
          break;
        }
      }

      // Fallback if no subnet name column was mapped: use the first non-empty column
      if (!rowSubnetName) {
        const nonValCells = cells.filter(c => c !== '');
        if (nonValCells.length > 0) {
          rowSubnetName = nonValCells[0].toLowerCase();
        }
      }

      if (!rowSubnetName) continue;

      // Match against graph variables
      for (const variable of graph.variables) {
        const id = variable.id;
        const match = id.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_(.+)$/i);
        if (!match) continue;

        const subnetKey = match[1].toLowerCase();
        const fieldKey = match[2].toLowerCase();

        // Match subnet name using robust normalization
        const normRow = GraphRunner.normalizeName(rowSubnetName);
        const normKey = GraphRunner.normalizeName(subnetKey);

        const isSubnetMatch = normRow === normKey || 
                              normRow.includes(normKey) || 
                              normKey.includes(normRow);

        if (!isSubnetMatch) continue;

        // Find cell index for this field
        let fieldColIdx = -1;
        const normalizedFieldKey = fieldKey.replace(/_/g, '').toLowerCase();
        for (const [colIdx, colType] of Object.entries(colMap)) {
          const normalizedColType = colType.replace(/_/g, '').toLowerCase();
          if (normalizedColType === normalizedFieldKey) {
            fieldColIdx = Number(colIdx);
            break;
          }
        }

        if (fieldColIdx === -1) continue;

        const cellValue = cells[fieldColIdx];
        if (cellValue === undefined || cellValue === '') continue;

        // Extract value based on type
        if (fieldKey === 'hosts') {
          const numMatch = cellValue.match(/\b\d+\b/);
          if (numMatch) {
            results[id] = parseInt(numMatch[0], 10);
          }
        } else if (fieldKey === 'netid' || fieldKey === 'net_id') {
          const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          if (ipMatch) {
            results[id] = ipMatch[0];
          }
        } else if (fieldKey === 'mask' || fieldKey === 'maske') {
          const cidrMatch = cellValue.match(/\/\d{1,2}\b/);
          if (cidrMatch) {
            results[id] = cidrMatch[0];
          } else {
            const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            }
          }
        } else if (fieldKey === 'broadcast' || fieldKey === 'bc') {
          const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          if (ipMatch) {
            results[id] = ipMatch[0];
          }
        } else if (fieldKey === 'gateway' || fieldKey === 'gw') {
          const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          if (ipMatch) {
            results[id] = ipMatch[0];
          } else {
            results[id] = cellValue.trim();
          }
        } else if (fieldKey === 'firsthost' || fieldKey === 'first_host') {
          const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          if (ipMatch) {
            results[id] = ipMatch[0];
          } else {
            results[id] = cellValue.trim();
          }
        } else if (fieldKey === 'lasthost' || fieldKey === 'last_host') {
          const ipMatch = cellValue.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          if (ipMatch) {
            results[id] = ipMatch[0];
          } else {
            results[id] = cellValue.trim();
          }
        }
      }
    }

    return results;
  }

  /**
   * Smart heuristic parser that scans student text and extracts matched variables.
   */
  public static extractStudentAnswers(studentText: string, graph: GradingGraph): Record<string, any> {
    // 1. Try to extract from table if present
    const results = this.extractFromTable(studentText, graph);

    const lines = studentText.split('\n');

    // Keep track of the active subnet context as we scan lines
    let activeSubnet: string | null = null;

    for (const line of lines) {
      const cleanLine = line.toLowerCase().trim();
      if (!cleanLine) continue;

      // Skip lines that look like markdown table rows to avoid context-based scanners matching columns wrong
      if (line.includes('|')) continue;

      // 1. Detect if this line starts a new subnet context
      // e.g. "Bereich A:", "Subnetz A:", "Subnet A", "A)" or "a:" at the start of a line
      // or "netz a", "netz_a". Use \b word boundaries to avoid matching "netzadresse" as subnet "adresse".
      let detectedSubnet: string | null = null;
      
      const subnetRegexes = [
        /subnet[sz]?\b\s*([a-z0-9_]+)\b/i,
        /netz\b\s*([a-z0-9_]+)\b/i,
        /bereich\b\s*([a-z0-9_]+)\b/i,
        /^([a-z0-9_]+)[:)\-\s]/i
      ];

      for (const rx of subnetRegexes) {
        const m = cleanLine.match(rx);
        if (m) {
          detectedSubnet = m[1].toLowerCase();
          break;
        }
      }

      if (detectedSubnet) {
        activeSubnet = detectedSubnet;
      }

      if (!activeSubnet) continue;

      // 2. Scan for variables belonging to the active subnet
      for (const variable of graph.variables) {
        const id = variable.id;
        if (results[id] !== undefined) continue; // Skip if already extracted from table

        const match = id.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_(.+)$/i);
        if (!match) continue;

        const subnetKey = match[1].toLowerCase(); // e.g. "a"
        const fieldKey = match[2].toLowerCase(); // e.g. "hosts"

        // Only look for variables of the active subnet context!
        if (subnetKey !== activeSubnet) continue;

        // Extract value:
        if (fieldKey === 'hosts') {
          if (cleanLine.includes('host') || cleanLine.includes('nutzbar') || cleanLine.includes('pc') || cleanLine.includes('rechner') || cleanLine.includes('gerät') || cleanLine.includes('anzahl')) {
            const numMatch = cleanLine.match(/\b\d+\b/);
            if (numMatch) {
              results[id] = parseInt(numMatch[0], 10);
            }
          }
        } else if (fieldKey === 'netid' || fieldKey === 'net_id') {
          // Safety boundary: do not match Broadcast or First/Last host lines as Net ID
          if (cleanLine.includes('broad') || cleanLine.includes('bc') || cleanLine.includes('cast') || 
              cleanLine.includes('first') || cleanLine.includes('erste') || cleanLine.includes('last') || cleanLine.includes('letzte')) {
            continue;
          }
          if (cleanLine.includes('net') || cleanLine.includes('netz') || cleanLine.includes('id') || cleanLine.includes('ip') || cleanLine.includes('adresse')) {
            const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            }
          }
        } else if (fieldKey === 'firsthost' || fieldKey === 'first_host') {
          if (cleanLine.includes('first') || cleanLine.includes('erste') || cleanLine.includes('start')) {
            const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            } else if (cleanLine.includes('null') || cleanLine.includes('keine') || cleanLine.includes('nicht')) {
              results[id] = 'null';
            }
          }
        } else if (fieldKey === 'lasthost' || fieldKey === 'last_host') {
          if (cleanLine.includes('last') || cleanLine.includes('letzte') || cleanLine.includes('ende')) {
            const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            } else if (cleanLine.includes('null') || cleanLine.includes('keine') || cleanLine.includes('nicht')) {
              results[id] = 'null';
            }
          }
        } else if (fieldKey === 'mask' || fieldKey === 'maske') {
          if (cleanLine.includes('mask') || cleanLine.includes('cidr') || cleanLine.includes('/')) {
            const cidrMatch = cleanLine.match(/\/\d{1,2}\b/);
            if (cidrMatch) {
              results[id] = cidrMatch[0];
            } else {
              const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
              if (ipMatch) {
                results[id] = ipMatch[0];
              }
            }
          }
        } else if (fieldKey === 'broadcast' || fieldKey === 'bc') {
          if (cleanLine.includes('broad') || cleanLine.includes('bc') || cleanLine.includes('cast')) {
            const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            }
          }
        } else if (fieldKey === 'gateway' || fieldKey === 'gw') {
          if (cleanLine.includes('gateway') || cleanLine.includes('gw') || cleanLine.includes('router')) {
            const ipMatch = cleanLine.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
            if (ipMatch) {
              results[id] = ipMatch[0];
            } else if (cleanLine.includes('null') || cleanLine.includes('keine') || cleanLine.includes('nicht')) {
              results[id] = 'null';
            }
          }
        }
      }
    }

    // Loose global fallback regexes if context-based scanning failed to find some variables
    for (const variable of graph.variables) {
      const id = variable.id;
      if (results[id] !== undefined) continue;

      const match = id.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_(.+)$/i);
      if (!match) continue;

      const subnetKey = match[1].toLowerCase();
      const fieldKey = match[2].toLowerCase();

      if (fieldKey === 'hosts') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d]*(\\d+)`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = parseInt(m[1], 10);
      } else if (fieldKey === 'netid' || fieldKey === 'net_id') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d]*(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      } else if (fieldKey === 'mask' || fieldKey === 'maske') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^/]*(\\/\\d{1,2})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      } else if (fieldKey === 'broadcast' || fieldKey === 'bc') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d]*(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      } else if (fieldKey === 'gateway' || fieldKey === 'gw') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d\\w]*(null|keins|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      } else if (fieldKey === 'firsthost' || fieldKey === 'first_host') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d\\w]*(null|keins|nicht|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      } else if (fieldKey === 'lasthost' || fieldKey === 'last_host') {
        const rx = new RegExp(`(?:subnet[\\s\\-_]?)?${subnetKey}[^\\d\\w]*(null|keins|nicht|\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})`, 'i');
        const m = studentText.match(rx);
        if (m) results[id] = m[1];
      }
    }

    // Advanced RAID Formula Heuristic (e.g. "(3 - 1) * 4 TB" or "(3-1)*4")
    const raidFormulaMatch = studentText.match(/\((\d+)\s*-\s*1\)\s*(?:\*|x|·)?\s*(\d+)/i);
    if (raidFormulaMatch) {
      const parsedCount = parseInt(raidFormulaMatch[1], 10);
      const parsedSize = parseInt(raidFormulaMatch[2], 10);
      for (const variable of graph.variables) {
        const id = variable.id;
        if (id === 'disk_count' || id === 'disks' || id === 'platten_anzahl' || id === 'anzahl_platten' || id === 'anzahlplatten' || id === 'platten') {
          results[id] = parsedCount;
        }
        if (id === 'disk_size' || id === 'size' || id === 'platten_groesse' || id === 'plattengroesse' || id === 'kapazitaet_pro_platte' || id === 'kapazität_pro_platte' || id === 'kapazitaet' || id === 'kapazität') {
          results[id] = parsedSize;
        }
      }
    }

    // Global/Prefixless variables heuristic parsing (e.g. for RAID)
    for (const variable of graph.variables) {
      const id = variable.id;
      if (results[id] !== undefined) continue;

      if (id === 'raid_level' || id === 'level') {
        const m = studentText.match(/(?:raid\s*[-_]?\s*level|raid\s*stufe|level|klasse)\s*[:=]?\s*(\d+)/i);
        if (m) {
          results[id] = parseInt(m[1], 10);
        }
      } else if (id === 'disk_count' || id === 'disks' || id === 'platten_anzahl' || id === 'anzahl_platten' || id === 'anzahlplatten' || id === 'platten') {
        const m = studentText.match(/(?:platten\s*[-_]?\s*anzahl|plattenanzahl|platten|disks|hdds|anzahl\s*platten)\s*[:=]?\s*(\d+)/i);
        if (m) {
          results[id] = parseInt(m[1], 10);
        }
      } else if (id === 'disk_size' || id === 'size' || id === 'platten_groesse' || id === 'plattengroesse' || id === 'kapazitaet_pro_platte' || id === 'kapazität_pro_platte' || id === 'kapazitaet' || id === 'kapazität') {
        const m = studentText.match(/(?:platten\s*[-_]?\s*größe|plattengröße|groesse|size|disk_size|größe|kapazität)\s*[:=]?\s*(\d+)/i);
        if (m) {
          results[id] = parseInt(m[1], 10);
        }
      } else if (id === 'net_capacity' || id === 'capacity' || id === 'nettokapazitaet' || id === 'nettkapazitaet' || id === 'nettokapazität' || id === 'nettkapazität') {
        const m = studentText.match(/(?:netto\s*[-_]?\s*kapazität|nettokapazität|capacity|net_capacity|netto)\s*[:=]?\s*(\d+)/i);
        if (m) {
          results[id] = parseInt(m[1], 10);
        } else {
          // Equation Result Fallback: parse final result from equations like "= 10 TB" or "= 10"
          const eqMatches = studentText.match(/=\s*(\d+)\s*(?:tb|gb|mb|pb)?\b/gi);
          if (eqMatches && eqMatches.length > 0) {
            const lastEq = eqMatches[eqMatches.length - 1];
            const numMatch = lastEq.match(/\d+/);
            if (numMatch) {
              results[id] = parseInt(numMatch[0], 10);
            }
          }
        }
      } else if (id === 'fault_tolerance' || id === 'tolerance' || id === 'ausfalltoleranz') {
        const m = studentText.match(/(?:ausfall\s*[-_]?\s*toleranz|ausfalltoleranz|tolerance|fault_tolerance|toleranz|ausfall)\s*[:=]?\s*(\d+)/i);
        if (m) {
          results[id] = parseInt(m[1], 10);
        }
      }
    }

    return results;
  }
}
