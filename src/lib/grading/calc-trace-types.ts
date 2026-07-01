/**
 * CalcTrace Type Definitions (V6 - AST Extraction & Hybrid Grading)
 * 
 * @module calc-trace-types
 */

/** Ein einzelner berechneter Schritt im AST des Schülers */
export interface StudentASTStep {
  /** Eindeutige ID (z.B. "step1") */
  id: string;
  /** Der vom Schüler gerechnete mathematische Ausdruck (referenziert ggf. IDs früherer Steps) */
  formula: string;
  /** Das numerische Ergebnis, das der Schüler für diesen Schritt aufgeschrieben hat */
  result: number;
}

/** Das extrahierte Endziel und die Punkteverteilung für eine MINT-Aufgabe (ersetzt die alte, starre CalcTrace) */
export interface TargetGoal {
  /** Der numerische Endwert (oder mehrere Werte), den der Schüler erreichen muss */
  targetValue: number | number[] | string;
  /** Maximale Punkte für diese Aufgabe */
  maxPoints: number;
  /** Optionale physikalische Einheit (z.B. "VA") */
  unit?: string;
  /** Textueller Erwartungshorizont für das Hybrid-Grading LLM (z.B. "1P Formel, 1P Ergebnis") */
  gradingRubric?: string;
}

/** Auswertungsergebnis des Student-ASTs in der mathjs Sandbox */
export interface CalcTraceResult {
  /** Hat der Schüler das korrekte Endziel (TargetGoal) erreicht? */
  isGoalReached: boolean;
  /** Array von Syntax- oder Logik-Fehlern, die die Sandbox beim Nachrechnen des ASTs geworfen hat */
  sandboxErrors: string[];
  /** Der originale AST des Schülers */
  ast: StudentASTStep[];
  /** Vergebene Punkte (entweder 100% falls isGoalReached, oder ermittelt durch Hybrid-Grading) */
  totalPoints?: number;
  /** Maximale Punkte (aus dem TargetGoal übernommen) */
  maxPoints?: number;
}
