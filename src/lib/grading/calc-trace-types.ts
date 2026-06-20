/**
 * CalcTrace Type Definitions
 * 
 * Flache Rechenketten-Typen für deterministische Mathe/Physik-Bewertung.
 * Ergänzt PANG (GradingGraph) als leichtgewichtige Alternative.
 * 
 * @module calc-trace-types
 */

/** Einzelner Rechenschritt in der Kette */
export interface CalcStep {
  /** Eindeutige ID, referenzierbar in Formeln anderer Steps (z.B. "leistung") */
  id: string;
  /** Menschenlesbares Label (z.B. "Leistung P") */
  label: string;
  /** 'given' = vom Schüler abzulesen, 'calc' = aus Formel berechenbar */
  type: 'given' | 'calc';
  /** Erwarteter korrekter Wert aus der Musterlösung */
  value: number;
  /** mathjs-kompatibler Ausdruck, referenziert IDs anderer Steps (nur bei type: 'calc') */
  formula?: string;
  /** Relative Toleranz für Rundungsunterschiede (z.B. 0.01 = 1%) */
  tolerance?: number;
  /** Physikalische Einheit für Feedback-Anzeige (z.B. "kWh") */
  unit?: string;
  /** Punktwert dieses Steps (Default: 1) */
  points?: number;
}

/** Vollständige Rechenkette für eine Aufgabe */
export interface CalcTrace {
  /** Referenz auf die zugehörige Aufgabe */
  taskId: string;
  /** Geordnete Liste der Rechenschritte */
  steps: CalcStep[];
  /** Optional: true für hybrides Didaktik-Grading (Standard), false für streng starr */
  disablePoints?: boolean;
}

/** Bewertungsstatus eines einzelnen Steps */
export type StepStatus = 'correct' | 'consecutive' | 'error' | 'omission';

/** Auswertungsergebnis eines einzelnen Steps */
export interface StepResult {
  /** Step-ID */
  id: string;
  /** Menschenlesbares Label */
  label: string;
  /** Einheit (optional) */
  unit?: string;
  /** Erwarteter Wert (Musterlösung) */
  expected: number;
  /** Vom Schüler gegebener Wert (null bei Omission) */
  studentValue: number | null;
  /** Von der Engine mit Schüler-Kontext berechneter Wert (bei calc-Steps) */
  computed: number | null;
  /** Bewertungsstatus */
  status: StepStatus;
  /** Vergebene Punkte für diesen Step */
  pointsAwarded: number;
  /** Maximale Punkte für diesen Step */
  pointsMax: number;
}

/** Gesamtergebnis der CalcTrace-Auswertung */
export interface CalcTraceResult {
  /** Einzelergebnisse pro Step */
  results: StepResult[];
  /** Summe aller vergebenen Punkte */
  totalPoints: number;
  /** Summe aller maximal erreichbaren Punkte */
  maxPoints: number;
  /** Anzahl Primärfehler */
  primaryErrors: number;
  /** Anzahl kompensierter Folgefehler */
  consecutiveErrors: number;
  /** Gibt an, ob die Punkteberechnung deaktiviert ist (Hybridmodus) */
  disablePoints?: boolean;
}
