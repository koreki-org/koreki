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
  disablePoints?: boolean;
}

export type StepResultStatus = 'correct' | 'primary_error' | 'consecutive_correct';

/**
 * Ein einzelner Wert im Bewertungsgraphen.
 *
 * Bewusst breit: eine Schuelerantwort kann eine Zahl sein, aber genauso eine
 * Zeichenkette (IP-Adresse, Einheit) oder ein Wahrheitswert. `null` steht fuer
 * "nicht berechenbar" — etwa wenn eine Formel wegen eines vorherigen Fehlers
 * nicht auswertbar war.
 */
export type GradingScalar = string | number | boolean | null;

/**
 * Ein Wert ODER mehrere gleichwertige Alternativen.
 *
 * Die Engine akzeptiert fuer den Erwartungswert eine Liste: `checkMatch` gilt
 * als erfuellt, sobald EINE davon passt (z. B. zwei zulaessige Schreibweisen
 * derselben Maske).
 */
export type GradingValue = GradingScalar | GradingScalar[];

/** Variablenbelegung waehrend eines Durchlaufs. Enthaelt nur Einzelwerte. */
export type GradingContext = Record<string, GradingScalar>;

export interface StepResult {
  variableId: string;
  status: StepResultStatus;
  /** Rechnerische Wahrheit aus der Musterlösung. */
  expectedValue: GradingValue;
  /** Was die Schuelerin geschrieben hat. `undefined` heisst: nicht beantwortet. */
  studentValue: GradingScalar | undefined;
  /** Neu berechnet auf Basis der bisherigen Schuelerfehler (Folgefehler-Kulanz). */
  computedValueBasedOnErrors: GradingValue;
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
