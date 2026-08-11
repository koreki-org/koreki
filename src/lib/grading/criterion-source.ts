/**
 * Zustaendigkeit von Bewertungskriterien — eine einzige Quelle der Wahrheit.
 *
 * Jedes Kriterium hat genau einen Besitzer, und der steht im Feld `source`:
 * Die Engine entscheidet ueber pruefbare Tatsachen, das Modell ueber Ermessensfragen.
 *
 * Vorher war diese Zuordnung an zwei Stellen als Wortsuche ueber `id`/`label` codiert —
 * mit unterschiedlichen Suchbegriffen. Dadurch konnte das Modell zu einem Kriterium
 * befragt werden, dessen Punktzahl anschliessend verworfen wurde. Damit das nicht
 * wiederkehrt, leiten Prompt-Aufbau UND Punktevergabe ihr Urteil aus `resolveEngineVerdict`
 * ab; die Wortsuche existiert nur noch als Reparatur fuer Kriterien ohne gueltiges `source`
 * und wird einmalig beim Einlesen angewendet (siehe `normalizeCriterionSource`).
 *
 * @module criterion-source
 */

import type {
  CalcTraceResult,
  CriterionSource,
  EngineCriterionSource,
  GradingCriterion,
  PerTargetResult,
  StudentASTStep,
} from './calc-trace-types';
import { variableReferencePattern } from './variable-references';

const VALID_SOURCES: readonly CriterionSource[] = ['llm', 'proofA', 'proofB', 'proofValues'];

export function isValidCriterionSource(value: unknown): value is CriterionSource {
  return typeof value === 'string' && (VALID_SOURCES as readonly string[]).includes(value);
}

/** Kriterien, die die Engine entscheidet — das Modell wird dazu nicht befragt. */
export function isEngineOwned(source: CriterionSource): source is EngineCriterionSource {
  return source !== 'llm';
}

export interface EngineVerdict {
  /** Kriterium ist durch die Sandbox belegt erfuellt */
  erfuellt: boolean;
  /** Kurzbegruendung — identisch im Prompt und in den Korrekturnotizen */
  begruendung: string;
  /** Schritte, auf die sich das Urteil stuetzt (bei Fehlern: die fehlerhaften Schritte) */
  stepIds: string[];
}

/** Die Teile des Sandbox-Ergebnisses, aus denen sich ein Kriterien-Urteil ableiten laesst. */
export type EngineEvidence = Pick<CalcTraceResult, 'ast' | 'sandboxErrors' | 'perTargetResult'>;

/**
 * Meldet die Sandbox einen Fehler zu genau diesem Schritt?
 *
 * Mit Wortgrenzen, sonst wuerde "step_1" auch auf "step_10" passen und ab zehn Schritten
 * Rechenfehler dem falschen Schritt zuschreiben.
 */
export function stepHasSandboxError(stepId: string, sandboxErrors: string[]): boolean {
  // Maskierung ueber den gemeinsamen Helfer — hier stand sie als Einzige
  // korrekt, an drei anderen Stellen fehlte sie.
  const muster = variableReferencePattern(stepId);
  return sandboxErrors.some(err => muster.test(err));
}

/**
 * Enthaelt die Formel eine echte Rechnung — oder nur eine abgeschriebene Zahl?
 * Ein nacktes Ergebnis ("2.5 GHz") ist kein Rechenweg und kann keinen Rechenweg-Punkt tragen.
 */
function istRechenschritt(formula: string): boolean {
  const f = (formula || '').trim().replace(/^[+-]/, '');
  return /[+\-*/^]/.test(f) || /\w\s*\(/.test(f);
}

/**
 * Prueft den Rechenweg des Schuelers gegen sich selbst — ohne Musterloesung.
 *
 * Die Engine haengt ihre Befunde an die einzelnen Zielwerte, und einem Zielwert zugeordnet
 * wird ein Schritt nur, wenn er ihn TRIFFT. Wer den Zielwert verfehlt, hat deshalb keine
 * Zuordnung — sein Rechenweg existiert aber trotzdem und ist pruefbar. Genau dieser Fall ging
 * frueher verloren: Der Rechenweg-Punkt setzte die Zielerreichung voraus und war damit nur
 * eine Kopie des Ergebnis-Punktes.
 */
function bewerteRechenweg(targetIndex: number, evidence: EngineEvidence): EngineVerdict {
  const alleTargets = evidence.perTargetResult ?? [];
  const ast: StudentASTStep[] = evidence.ast ?? [];
  const sandboxErrors = evidence.sandboxErrors ?? [];

  const pt = alleTargets.find(t => t.targetIndex === targetIndex);
  let schrittIds = pt?.associatedStepIds ?? [];

  if (schrittIds.length === 0) {
    // Auf den uebrigen Rechenweg ausweichen. Schritte, die zu einem ANDEREN Zielwert gehoeren,
    // bleiben aussen vor — ein Fehler dort darf dieses Kriterium nicht belasten.
    const fremd = new Set(
      alleTargets.filter(t => t.targetIndex !== targetIndex).flatMap(t => t.associatedStepIds ?? [])
    );
    schrittIds = ast.filter(step => !fremd.has(step.id)).map(step => step.id);
  }

  const gerechnet = schrittIds.filter(id => {
    const step = ast.find(s => s.id === id);
    return !!step && istRechenschritt(step.formula);
  });

  if (gerechnet.length === 0) {
    return { erfuellt: false, begruendung: 'Kein nachvollziehbarer Rechenweg notiert', stepIds: [] };
  }

  // Nur echte Rechenfehler belasten den Schueler. Ein Schritt, den die Sandbox nicht parsen
  // konnte, sagt nichts ueber seine Richtigkeit aus — ihn als Fehler zu werten hiesse, dem
  // Schueler eine Grenze unserer Auswertung anzulasten.
  const echteRechenfehler = sandboxErrors.filter(err => err.startsWith('Rechenfehler'));
  const fehlerhaft = gerechnet.filter(id => stepHasSandboxError(id, echteRechenfehler));
  if (fehlerhaft.length > 0) {
    return {
      erfuellt: false,
      begruendung: `Rechenfehler im Rechenweg (Schritte: ${fehlerhaft.join(', ')})`,
      stepIds: fehlerhaft,
    };
  }

  return {
    erfuellt: true,
    begruendung: 'Sandbox-bestätigt: eigener Rechenweg fehlerfrei gerechnet',
    stepIds: gerechnet,
  };
}

/**
 * Uebersetzt die Engine-Befunde in ein Urteil ueber ein Kriterium.
 *
 * Diese Funktion ist die einzige Stelle, an der aus Sandbox-Tatsachen ein Erfuellt/Nicht-erfuellt
 * wird. Prompt-Aufbau und Punktevergabe rufen sie beide auf, damit sie nicht auseinanderlaufen
 * koennen: Was im Prompt als bindend angekuendigt wird, ist exakt das, was spaeter gezaehlt wird.
 */
export function resolveEngineVerdict(
  source: EngineCriterionSource,
  targetIndex: number,
  evidence: EngineEvidence
): EngineVerdict {
  const alleTargets = evidence.perTargetResult ?? [];
  const sandboxErrors = evidence.sandboxErrors ?? [];
  const pt: PerTargetResult | undefined = alleTargets.find(t => t.targetIndex === targetIndex);
  const associated = pt?.associatedStepIds ?? [];

  // Rechenweg: gegen den eigenen Zettel, ohne Musterloesung.
  if (source === 'proofA') {
    return bewerteRechenweg(targetIndex, evidence);
  }

  // Werteeinsetzung: hat der Schueler die richtigen Zahlen verwendet?
  if (source === 'proofValues') {
    return pt?.hasCorrectValues
      ? { erfuellt: true, begruendung: 'Sandbox-bestätigt: Werte korrekt eingesetzt', stepIds: associated }
      : { erfuellt: false, begruendung: 'Keine korrekte Werteeinsetzung für diesen Zielwert gefunden', stepIds: associated };
  }

  // Ergebnis: gegen die Musterloesung.
  if (pt?.reached && !pt.hasCalculationError) {
    return { erfuellt: true, begruendung: 'Sandbox-bestätigt: Zielwert erreicht', stepIds: associated };
  }

  if (pt?.reached && pt.hasCalculationError) {
    const fehlerhaft = associated.filter(id => stepHasSandboxError(id, sandboxErrors));
    const schritte = fehlerhaft.length > 0 ? fehlerhaft : associated;
    return {
      erfuellt: false,
      begruendung: `Rechenfehler im Rechenweg${schritte.length > 0 ? ` (Schritte: ${schritte.join(', ')})` : ''}`,
      stepIds: schritte,
    };
  }

  return { erfuellt: false, begruendung: 'Zielwert nicht erreicht/nicht notiert', stepIds: associated };
}

/**
 * Erkennt Einsetzungs-Kriterien an Bezeichnung oder ID.
 *
 * REPARATUR-HEURISTIK, kein Routing: Sie greift ausschliesslich fuer Kriterien, deren `source`
 * fehlt oder unbekannt ist. Ein ausdruecklich gesetztes gueltiges `source` wird immer respektiert,
 * auch wenn die Bezeichnung anders klingt.
 */
function siehtNachEinsetzungAus(crit: Pick<GradingCriterion, 'id' | 'label'>): boolean {
  const id = (crit.id || '').toLowerCase();
  const label = (crit.label || '').toLowerCase();
  return id === 'einsetzen'
    || id.endsWith('_werte')
    || id.endsWith('_einsetzen')
    || id.includes('werte')
    || label.includes('einsetzen')
    || label.includes('eingesetzt')
    || label.includes('werte');
}

/**
 * Liefert die verbindliche Zustaendigkeit eines Kriteriums.
 * Wird einmalig beim Einlesen der Musterloesung angewendet und ins Feld `source` geschrieben —
 * danach lesen alle Verbraucher nur noch dieses Feld.
 */
export function normalizeCriterionSource(crit: Pick<GradingCriterion, 'id' | 'label' | 'source'>): CriterionSource {
  if (isValidCriterionSource(crit.source)) return crit.source;
  return siehtNachEinsetzungAus(crit) ? 'proofValues' : 'llm';
}
