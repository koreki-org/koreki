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
  /** Einheit der Rohzahlen in `formula`, falls abweichend von `unit` (z.B. Formel in cm, Ergebnis in m) */
  formulaUnit?: string;
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
  /** Strukturierte Kriterienliste für die Teilpunktebewertung */
  criteria?: GradingCriterion[];
}

/**
 * Wer ueber ein Kriterium entscheidet. Das Feld ist die EINZIGE Zuordnungsquelle —
 * weder Prompt-Aufbau noch Punktevergabe duerfen sie aus id oder label ableiten.
 *
 * - `proofB`      — Zielwert erreicht (Engine)
 * - `proofA`      — Rechenweg zum Ziel fehlerfrei (Engine)
 * - `llm`         — Ermessensfrage, die nur das Modell beantworten kann (z. B. Formelstrenge)
 */
export type CriterionSource = 'llm' | 'proofA' | 'proofB';

/** Von der Engine entschiedene Quellen — das Modell wird dazu nicht befragt. */
export type EngineCriterionSource = Exclude<CriterionSource, 'llm'>;

export interface GradingCriterion {
  id: string;
  label: string;
  punktwert: number;
  source: CriterionSource;
  targetIndex: number;
}

/** Auswertungsergebnis der Engine fuer einen einzelnen Zielwert */
export interface PerTargetResult {
  targetIndex: number;
  /** Der Zielwert wurde im Rechenweg des Schuelers gefunden */
  reached: boolean;
  /** In der Rechenkette zu diesem Ziel steckt ein echter Rechenfehler */
  hasCalculationError: boolean;
  associatedStepIds: string[];
}

export interface CriterionClassification {
  criterionId: string;
  erfuellt: boolean;
  begruendung?: string;
}

/** Ergebnis des Unit-Vergleichs für einen einzelnen Zielwert */
export interface UnitComparisonDetail {
  /** Der natürliche Zielwert (Lehrereinheit) */
  targetValue: number;
  /** Die erwartete Einheit (z.B. "mA") */
  expectedUnit: string;
  /** Die vom Schüler notierte Einheit (z.B. "A") — undefined wenn nicht extrahiert */
  studentUnit?: string;
  /**
   * Der Zahlenwert stimmt (exakt oder via SI-Normalisierung) — unabhängig davon, ob die
   * Einheit trägt. Diese Tatsache bleibt auch bei Einheitenfehlern erhalten, damit der
   * Beweistext melden kann, dass richtig gerechnet wurde.
   */
  isValueMatch: boolean;
  /**
   * Zahlenwert UND Einheit sind tragfähig. NUR hierauf stützt sich die Zielerreichung —
   * ein Einheitenfehler (falsch oder fehlend) ist kein Treffer.
   */
  isExactMatch: boolean;
  /** Zahlenwert stimmt, aber die Einheit weicht ab oder fehlt */
  isUnitMismatch: boolean;
  /** Der Schüler hat den exakten Zahlenwert notiert, aber ein physikalisch falsches SI-Präfix (z.B. 1.846 A statt 1.846 mA) */
  isPrefixError?: boolean;
  /** Der Zahlenwert stimmt, aber der Schüler hat gar keine Einheit notiert */
  isMissingUnit?: boolean;
  /** Die AST-Schritt-ID, in der dieser Match stattgefunden hat (z.B. "step_1") */
  stepId?: string;
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
  /** Auswertungsergebnisse pro Ziel-Index */
  perTargetResult?: PerTargetResult[];
}

/**
 * Ein Schritt einer Rechenketten-VORLAGE, wie sie im Skill-Editor entsteht.
 *
 * Nicht zu verwechseln mit `StudentASTStep` (was der Schüler gerechnet hat)
 * oder `TargetGoal` (das Bewertungsziel). Die Vorlage beschreibt die
 * Musterrechnung: welche Größen gegeben sind, welche berechnet werden und
 * wie viele Punkte auf welchem Schritt liegen.
 */
export interface CalcTraceTemplateStep {
    id: string;
    label: string;
    /** `given` = vorgegebene Größe, `calc` = aus `formula` berechnet. */
    type: 'given' | 'calc';
    value: number;
    unit?: string;
    /** Nur bei `calc`: der Rechenausdruck über die IDs früherer Schritte. */
    formula?: string;
    points?: number;
}

/** Die Rechenketten-Vorlage eines eigenen Skills. */
export interface CalcTraceTemplate {
    taskId: string;
    steps: CalcTraceTemplateStep[];
}
