/**
 * CalcTrace Type Definitions (V7 - Unit-Aware Grading)
 * 
 * Based on industry best practices from STACK/Maxima, WeBWorK, Numbas.
 * Key principle: Physical quantity = Tuple(value, unit), compared separately.
 * 
 * @module calc-trace-types
 */

/** Ein einzelner berechneter Schritt im AST des Schülers */
export interface StudentASTStep {
  /** Eindeutige ID (z.B. "step_1") */
  id: string;
  /** Der exakte Originaltext des Schülers für diesen Schritt */
  original_text?: string;
  /** Der vom Schüler gerechnete mathematische Ausdruck (referenziert ggf. IDs früherer Steps) */
  formula: string;
  /** Das numerische Ergebnis, das der Schüler für diesen Schritt aufgeschrieben hat */
  result: number;
  /** Optionale physikalische Einheit die der Schüler beim Ergebnis notiert hat (z.B. "mA", "kΩ", "W") */
  unit?: string;
}

/** Das extrahierte Endziel und die Punkteverteilung für eine MINT-Aufgabe */
export interface TargetGoal {
  /** Der numerische Endwert (oder mehrere Werte), den der Schüler erreichen muss */
  targetValue: number | number[] | string;
  /** Maximale Punkte für diese Aufgabe */
  maxPoints: number;
  /** Optionale physikalische Einheit (z.B. "mA", "kΩ") */
  unit?: string;
  /** Textueller Erwartungshorizont für das Hybrid-Grading LLM (z.B. "1P Formel, 1P Ergebnis") */
  gradingRubric?: string;
}

/** Ergebnis des Unit-Vergleichs für einen einzelnen Zielwert */
export interface UnitComparisonDetail {
  /** Der natürliche Zielwert (Lehrereinheit) */
  targetValue: number;
  /** Die erwartete Einheit (z.B. "mA") */
  expectedUnit: string;
  /** Die vom Schüler notierte Einheit (z.B. "A") — undefined wenn nicht extrahiert */
  studentUnit?: string;
  /** Der Zahlenwert stimmt (exakt oder via SI-Normalisierung) */
  isValueMatch: boolean;
  /** Exakter Match: Zahlenwert UND Einheit stimmen überein */
  isExactMatch: boolean;
  /** Zahlenwert ist physikalisch äquivalent, aber Einheit/Präfix abweichend */
  isUnitMismatch: boolean;
  /** Der Schüler hat den exakten Zahlenwert notiert, aber ein physikalisch falsches SI-Präfix (z.B. 1.846 A statt 1.846 mA) */
  isPrefixError?: boolean;
}

/** Auswertungsergebnis des Student-ASTs in der mathjs Sandbox */
export interface CalcTraceResult {
  /** Hat der Schüler das korrekte Endziel (TargetGoal) erreicht? (inkl. SI-Äquivalente) */
  isGoalReached: boolean;
  /** Array von Syntax- oder Logik-Fehlern, die die Sandbox beim Nachrechnen des ASTs geworfen hat */
  sandboxErrors: string[];
  /** Natürliche Zielwerte (Lehrereinheit) die im AST gefunden wurden */
  reachedTargets: number[];
  /** Natürliche Zielwerte die NICHT im AST gefunden wurden */
  missedTargets: number[];
  /** Der originale AST des Schülers */
  ast: StudentASTStep[];
  /** Maximale Punkte (aus dem TargetGoal übernommen) */
  maxPoints?: number;
  /** True wenn mindestens ein Zielwert nur via SI-Normalisierung (andere Einheit) gefunden wurde */
  unitMismatch?: boolean;
  /** Detail-Informationen zum Einheitsvergleich (für LLM-Prompt) */
  unitDetails?: UnitComparisonDetail[];
}
