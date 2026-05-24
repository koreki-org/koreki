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
  // A graph skill is created using specific plugins (like 'network' or 'raid')
  // We inspect the variables' expressions to see which plugin domain was used to build it.
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
  // Check if standard high-level skills were selected (e.g. skill-calc-vlsm)
  const isVlsmSkill = taskType === 'vlsm' || taskType === 'skill-calc-vlsm';

  // 3. Discipline Signature:
  const isNetworkDiscipline = discipline === 'computer-science-networking';

  // If any check confirms it was built with the network/VLSM plugin, format as GFM Table!
  if (usesNetworkPlugin || hasSubnetVariables || isVlsmSkill || isNetworkDiscipline) {
    return formatVlsmTableFeedback(gradingResult);
  }

  // In the future, we can add more plugins like the RAID plugin:
  // const usesRaidPlugin = gradingGraph?.variables?.some(
  //   (v) => v.type === 'formula' && v.expression && v.expression.includes('raid.')
  // );
  // if (usesRaidPlugin || taskType === 'skill-calc-raid' || discipline === 'computer-science-storage') {
  //   return formatRaidTableFeedback(gradingResult);
  // }

  return null;
}

/**
 * Parses flat stepResults into a 2D Subnet Matrix and formats it as a premium GFM Markdown Table.
 */
function formatVlsmTableFeedback(gradingResult: GradingResult): string {
  const steps = gradingResult.stepResults;
  
  // Group results by subnet name
  const subnetRows: Record<string, Record<string, StepResult>> = {};
  
  steps.forEach((step) => {
    // Variable names are formatted like 'subnet_[name]_[field]' e.g. 'subnet_a_netid'
    const match = step.variableId.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_(.+)$/i);
    if (!match) return;
    
    const subnetKey = match[1].toUpperCase();
    const fieldKey = match[2].toLowerCase(); // e.g. netid, mask, firsthost, lasthost, broadcast, gateway, hosts
    
    if (!subnetRows[subnetKey]) {
      subnetRows[subnetKey] = {};
    }
    subnetRows[subnetKey][fieldKey] = step;
  });

  // Build GFM table
  let feedback = `[⚙️ AGS Engine - Mathematischer VLSM Abgleich]\n\n`;
  feedback += `| Subnetz | Netz-ID | Maske | Erste nutzbare IP | Letzte nutzbare IP | Broadcast | Gateway |\n`;
  feedback += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  // Sort subnets alphabetically/numerically (e.g. Subnet A, Subnet B...)
  const sortedSubnets = Object.keys(subnetRows).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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

    // Support both standard spelling and abbreviation spelling
    const netid = fields.netid || fields.net_id;
    const mask = fields.mask || fields.maske;
    const firsthost = fields.firsthost || fields.first_host;
    const lasthost = fields.lasthost || fields.last_host;
    const broadcast = fields.broadcast || fields.bc;
    const gateway = fields.gateway || fields.gw;

    feedback += `| **Subnetz ${subnet}** | ${formatCell(netid)} | ${formatCell(mask)} | ${formatCell(firsthost)} | ${formatCell(lasthost)} | ${formatCell(broadcast)} | ${formatCell(gateway)} |\n`;
  });

  return feedback;
}
