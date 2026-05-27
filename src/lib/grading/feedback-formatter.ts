import { GradingResult, GradingGraph, StepResult } from './types';

/**
 * Modular feedback formatter that generates premium structured layouts
 * based on the task type and grading engine results.
 * 
 * Fits perfectly into the Koreki architecture: decoupled, pure logic,
 * and easily extendable without creating monoliths.
 */
export function formatPluginFeedback(
  taskType: string,
  gradingResult: GradingResult,
  gradingGraph?: GradingGraph
): string | null {
  if (!gradingResult || !Array.isArray(gradingResult.stepResults)) {
    return null;
  }

  const discipline = gradingGraph?.discipline;

  // 1. Plugin-Based Formula Detection:
  const usesNetworkPlugin = gradingGraph?.variables?.some(
    (v) => v.type === 'formula' && v.expression && v.expression.includes('network.')
  );

  // Fallback: Check if variables match subnet suffixes (e.g., subnet_a_netid)
  const hasSubnetVariables = gradingResult.stepResults.some((s) => {
    const vid = s.variableId.toLowerCase();
    return (
      vid.includes('netid') ||
      vid.includes('mask') ||
      vid.includes('broadcast') ||
      vid.includes('gateway') ||
      vid.includes('firsthost') ||
      vid.includes('lasthost')
    );
  });

  // 2. Skill Selection Detection:
  const isVlsmSkill = taskType === 'vlsm' || taskType === 'skill-calc-vlsm';

  // 3. Discipline Signature:
  const isNetworkDiscipline = discipline === 'computer-science-networking';
  const isRaidSkill = taskType === 'skill-calc-raid' || discipline === 'computer-science-storage';

  // 4. Tabular Structure Check (e.g., compound names like messebesucher_netzadresse)
  const hasStructuredVariables = gradingResult.stepResults.some((s) => s.variableId.includes('_'));

  // If any check confirms a structured 2D task, format as a Generic Table!
  // BUT: Do not format as a VLSM table if the discipline is math, physics, or general.
  const isGeneralMathOrPhysics = discipline === 'math' || discipline === 'physics' || discipline === 'general' || discipline === 'general-science';
  
  // A table should ONLY be formatted for actual network subnetting tasks!
  const isNetworkTask = usesNetworkPlugin || hasSubnetVariables || isVlsmSkill || isNetworkDiscipline;

  if (!isGeneralMathOrPhysics && isNetworkTask) {
    return formatVlsmTableFeedback(gradingResult, gradingGraph);
  }

  return null;
}

/**
 * Helper to parse a flat variable ID into a normalized subnet name and field category.
 * Supports various German/English naming variations and is resilient to compound names.
 */
const VLSM_SUFFIX_MAP: { category: string; suffixes: string[] }[] = [
  {
    category: 'hosts',
    suffixes: [
      'anzahl_ip_hosts', 'anzahl_ip_host', 'anzahl_hosts', 'anzahl_host',
      'anzahl_ip_adresse', 'anzahl_ip_adressen', 'anzahl_ips', 'anzahl_ip',
      'hosts_required', 'hosts_required_count', 'hosts_req', 'hosts',
      'host_count', 'host', 'clients', 'client', 'pcs', 'pc',
      'geräte', 'geraete', 'rechner', 'bedarf', 'anzahl'
    ]
  },
  {
    category: 'netid',
    suffixes: [
      'netzadresse', 'netz_adresse', 'netz_id', 'netzid',
      'net_id', 'netid', 'networkid', 'network_id', 'ip'
    ]
  },
  {
    category: 'mask',
    suffixes: [
      'netzmaske', 'netz_maske', 'subnetmask', 'subnet_mask',
      'maske', 'mask', 'cidr'
    ]
  },
  {
    category: 'firsthost',
    suffixes: [
      'erste_nutzbare_ip', 'erstenutzbareip', 'erste_nutzbare', 'erstenutzbare',
      'erster_nutzbare_host', 'erster_nutzbare_ip', 'ersten_nutzbare_host', 'ersten_nutzbare_ip',
      'first_usable_host', 'firstusablehost', 'first_usable_ip', 'firstusableip',
      'erster_host', 'ersterhost', 'ersten_host', 'erstenhost',
      'first_host', 'firsthost', 'first_ip', 'firstip',
      'erste_host', 'erstehost', 'erste_ip', 'ersteip',
      'erster_ip', 'ersterip', 'ersten_ip', 'erstenip',
      'min_host', 'minhost', 'min_ip', 'minip'
    ]
  },
  {
    category: 'lasthost',
    suffixes: [
      'letzte_nutzbare_ip', 'letztenutzbareip', 'letzte_nutzbare', 'letztenutzbare',
      'letzter_nutzbare_host', 'letzter_nutzbare_ip', 'letzten_nutzbare_host', 'letzten_nutzbare_ip',
      'last_usable_host', 'lastusablehost', 'last_usable_ip', 'lastusableip',
      'letzter_host', 'letzterhost', 'letzten_host', 'letztenhost',
      'last_host', 'lasthost', 'last_ip', 'lastip',
      'letzte_host', 'letztehost', 'letzte_ip', 'letzteip',
      'letzter_ip', 'letzterip', 'letzten_ip', 'letztenip',
      'max_host', 'maxhost', 'max_ip', 'maxip'
    ]
  },
  {
    category: 'broadcast',
    suffixes: [
      'broadcastadresse', 'broadcast_adresse', 'broadcast', 'bcast', 'bc'
    ]
  },
  {
    category: 'gateway',
    suffixes: [
      'standard_gateway', 'standardgateway', 'gateway', 'gw'
    ]
  }
];

// Flatten and sort suffixes by length descending so longer suffixes match first
const SORTED_VLSM_SUFFIXES = (() => {
  const flat: { category: string; suffix: string }[] = [];
  for (const group of VLSM_SUFFIX_MAP) {
    for (const suffix of group.suffixes) {
      flat.push({ category: group.category, suffix });
    }
  }
  return flat.sort((a, b) => b.suffix.length - a.suffix.length);
})();

function parseVariableId(
  variableId: string,
  gradingGraph?: GradingGraph
): { subnetKey: string; fieldKey: string } | null {
  // Remove optional leading "subnet_" or "subnet"
  const cleanId = variableId.replace(/^(?:subnet_?)/i, '');
  const lowerCleanId = cleanId.toLowerCase();

  let detectedFieldCategory: string | null = null;

  // 1. Try to detect field category deterministically from the graph expressions (if available)
  if (gradingGraph && Array.isArray(gradingGraph.variables)) {
    const vDef = gradingGraph.variables.find((v) => v.id === variableId);
    if (vDef && vDef.type === 'formula' && vDef.expression) {
      const expr = vDef.expression;
      if (expr.includes('network.calculateNetId')) {
        detectedFieldCategory = 'netid';
      } else if (expr.includes('network.calculateMask')) {
        detectedFieldCategory = 'mask';
      } else if (expr.includes('network.calculateFirstHost')) {
        detectedFieldCategory = 'firsthost';
      } else if (expr.includes('network.calculateLastHost')) {
        detectedFieldCategory = 'lasthost';
      } else if (expr.includes('network.calculateBroadcast')) {
        detectedFieldCategory = 'broadcast';
      } else if (expr.includes('network.calculateGateway')) {
        detectedFieldCategory = 'gateway';
      }
    }
  }

  // 2. Loop through sorted suffixes to match and extract subnet key
  for (const item of SORTED_VLSM_SUFFIXES) {
    // If we already detected the category from the formula, prioritize matching suffixes of THAT category
    if (detectedFieldCategory && item.category !== detectedFieldCategory) {
      continue;
    }

    const suffixWithUnderscore = '_' + item.suffix;
    if (lowerCleanId.endsWith(suffixWithUnderscore)) {
      const rawSubnet = cleanId.slice(0, cleanId.length - suffixWithUnderscore.length);
      const subnetName = rawSubnet.replace(/_+$/, '');
      if (subnetName) {
        return {
          subnetKey: subnetName.toUpperCase(),
          fieldKey: item.category
        };
      }
    }

    if (lowerCleanId.endsWith(item.suffix)) {
      const rawSubnet = cleanId.slice(0, cleanId.length - item.suffix.length);
      const subnetName = rawSubnet.replace(/_+$/, '');
      if (subnetName) {
        return {
          subnetKey: subnetName.toUpperCase(),
          fieldKey: item.category
        };
      }
    }
  }

  // 3. Fallback: if formula detected a category but no specific suffix matched, strip standard suffixes or trailing parts
  if (detectedFieldCategory) {
    // Just split at the last underscore as a fallback
    const lastUnderscore = cleanId.lastIndexOf('_');
    if (lastUnderscore > 0) {
      const subnetName = cleanId.slice(0, lastUnderscore);
      return {
        subnetKey: subnetName.toUpperCase(),
        fieldKey: detectedFieldCategory
      };
    }
  }

  // 4. Ultimate Fallback: standard regex splitting
  const match = variableId.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_(.+)$/i);
  if (match) {
    return {
      subnetKey: match[1].toUpperCase(),
      fieldKey: match[2].toLowerCase()
    };
  }

  return null;
}

/**
 * Parses flat stepResults into a 2D Matrix and formats it as a premium GFM Markdown Table.
 * Fully generic – derives column headers and rows dynamically from the variable keys.
 */
function formatVlsmTableFeedback(gradingResult: GradingResult, gradingGraph?: GradingGraph): string {
  const steps = gradingResult.stepResults;
  
  // Group results by subnet/row name
  const parsedSteps: { step: StepResult; subnetKey: string; fieldKey: string }[] = [];
  const allSubnets = new Set<string>();
  const allFields = new Set<string>();

  steps.forEach((step) => {
    const parsed = parseVariableId(step.variableId, gradingGraph);
    if (parsed) {
      parsedSteps.push({ step, ...parsed });
      allSubnets.add(parsed.subnetKey);
      allFields.add(parsed.fieldKey);
    }
  });

  // Predefined order for standard VLSM/networking columns to keep it professional
  const STANDARD_COLUMNS = ['hosts', 'netid', 'mask', 'firsthost', 'lasthost', 'broadcast', 'gateway'];

  // Check if this task uses standard VLSM columns
  const hasVlsmColumns = Array.from(allFields).some(f => STANDARD_COLUMNS.includes(f));

  // Group by subnetKey
  const subnetRows: Record<string, Record<string, StepResult>> = {};
  parsedSteps.forEach(({ step, subnetKey, fieldKey }) => {
    if (!subnetRows[subnetKey]) {
      subnetRows[subnetKey] = {};
    }
    subnetRows[subnetKey][fieldKey] = step;
  });

  // Filter out rows that do not have at least one standard VLSM field,
  // but only if this is actually a VLSM/networking task (i.e. hasVlsmColumns is true).
  const filteredSubnetKeys = Object.keys(subnetRows).filter((subnetKey) => {
    if (!hasVlsmColumns) return true;
    const fields = subnetRows[subnetKey];
    return STANDARD_COLUMNS.some(col => col in fields);
  });

  // Re-collect only the fields that are actually present in the filtered subnets!
  const activeFields = new Set<string>();
  filteredSubnetKeys.forEach((subnetKey) => {
    const fields = subnetRows[subnetKey];
    Object.keys(fields).forEach((fieldKey) => {
      activeFields.add(fieldKey);
    });
  });

  // Smart Pre-population: If this task uses any standard VLSM variables, pre-populate all standard columns 
  // so the table maintains its complete standard matrix layout rather than shrinking dynamically.
  if (hasVlsmColumns) {
    STANDARD_COLUMNS.forEach(col => activeFields.add(col));
  }
  
  // Custom column mapping for pretty headers
  const HEADER_TRANSLATIONS: Record<string, string> = {
    hosts: 'Bedarf (Hosts)',
    netid: 'Netz-ID',
    mask: 'Maske',
    firsthost: 'Erste nutzbare IP',
    lasthost: 'Letzte nutzbare IP',
    broadcast: 'Broadcast',
    gateway: 'Gateway'
  };

  // Sort columns: standard columns first, then custom columns alphabetically
  const sortedColumns = Array.from(activeFields).sort((a, b) => {
    const idxA = STANDARD_COLUMNS.indexOf(a);
    const idxB = STANDARD_COLUMNS.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Sort rows alphabetically/numerically (e.g. Subnet A, Subnet B...)
  const sortedSubnets = filteredSubnetKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Build GFM table
  let feedback = `[⚙️ AGS Engine - Mathematischer VLSM Abgleich]\n\n`;
  
  // Create table headers
  const headers = ['Subnetz', ...sortedColumns.map(col => HEADER_TRANSLATIONS[col] || capitalizeHeader(col))];
  feedback += `| ${headers.join(' | ')} |\n`;
  feedback += `| ${headers.map(() => ':---').join(' | ')} |\n`;

  sortedSubnets.forEach((subnet) => {
    const fields = subnetRows[subnet];
    
    const formatCell = (field: StepResult | undefined) => {
      if (!field) return "-";
      
      const val = field.studentValue !== undefined && field.studentValue !== "" ? String(field.studentValue) : "fehlt";
      let badge = "";
      
      if (field.status === 'correct') {
        badge = `[r]`;
      } else if (field.status === 'consecutive_correct') {
        badge = `[FF]`;
      } else {
        // For primary error, show expected value
        const expected = field.expectedValue !== undefined && field.expectedValue !== null ? String(field.expectedValue) : "k.A.";
        badge = `[f] *(Erw: ${expected})*`;
      }
      
      return `${val} ${badge}`;
    };

    const rowCells = [
      `**Subnetz ${subnet}**`,
      ...sortedColumns.map(col => formatCell(fields[col]))
    ];

    feedback += `| ${rowCells.join(' | ')} |\n`;
  });

  return feedback;
}

/** Helper to format custom headers beautifully (snake_case -> Title Case) */
function capitalizeHeader(str: string): string {
  return str
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
