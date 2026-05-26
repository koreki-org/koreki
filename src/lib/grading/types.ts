export type VariableType = 'input' | 'formula';
export type ValidationType = 'exact' | 'tolerance' | 'contains';

export interface VariableDefinition {
  id: string;
  type: VariableType;
  defaultValue?: any; // For inputs
  expression?: string; // For formulas, e.g., "network.calculateMask(hosts_required)"
  validationType: ValidationType;
  tolerance?: number; // Used if validationType is 'tolerance'
  maxPoints?: number; // Points allocated to this step, defaults to 1
}

export interface EquivalenceGroup {
  id: string;
  prefixes: string[];
}

export interface GradingGraph {
  taskId: string;
  discipline: string;
  variables: VariableDefinition[];
  equivalenceGroups?: EquivalenceGroup[];
}

export type StepResultStatus = 'correct' | 'primary_error' | 'consecutive_correct';

export interface StepResult {
  variableId: string;
  status: StepResultStatus;
  expectedValue: any; // Mathematical truth based on master key
  studentValue: any; // Value provided by student
  computedValueBasedOnErrors: any; // Value recalculated based on previous student errors
  points: number;
  maxPoints: number;
  note: string;
}

export interface GradingResult {
  taskId: string;
  stepResults: StepResult[];
  totalPoints: number;
  maxPoints: number;
}
