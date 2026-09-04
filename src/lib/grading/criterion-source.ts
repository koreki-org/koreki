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

const VALID_SOURCES: readonly CriterionSource[] = ['llm', 'proofA', 'proofB'];

/**
 * Zustaendigkeiten, die es einmal gab und die beim Einlesen auf ihren Nachfolger
 * abgebildet werden.
 *
 * `proofValues` versprach "die Zahlen wurden richtig eingesetzt" und stuetzte sich
 * dafuer auf `hasCorrectValues`. Dieses Feld war aber `!!targetStepId` — und
 * `targetStepId` entstand ausschliesslich dort, wo ein Schritt den ZIELWERT traf.
 * Gemessen wurde damit dasselbe wie bei `proofB`, nur schwaecher: Verfehlte der
 * Schueler das Ziel, fiel `proofValues` zwangslaeufig mit. Ein Einsetzfehler bei
 * getroffenem Ziel blieb umgekehrt unsichtbar.
 *
 * Weil Engine-Urteile BINDEND sind (`isEngineOwned`), war das schlechter als gar
 * kein Beweis: eine unumstoessliche Null auf einer Messung, die etwas anderes
 * misst als ihr Name sagt. Aufgefallen am 03.09.2026 bei der Diagnose einer
 * Pflege-Aufgabe.
 *
 * Ob die GEGEBENEN Werte richtig eingesetzt wurden, laesst sich nicht aus dem
 * Ergebnis erschliessen — dazu braeuchte die Sandbox den Rechenweg der
 * Musterloesung, den ein `TargetGoal` nicht enthaelt. Solange er fehlt, ist das
 * eine fachliche Frage und gehoert dem Modell.
 *
 * Der Eintrag bleibt stehen, damit gespeicherte Skills von Lehrkraeften weiter
 * lesbar sind. Er darf nicht entfernt werden, solange solche Daten existieren
 * koennen.
 */
const VERALTETE_QUELLEN: Record<string, CriterionSource> = {
  proofValues: 'llm',
};

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
  /**
   * Die Sandbox legt sich NICHT fest — das Kriterium geht ans Modell.
   *
   * Der dritte Zustand neben erfuellt und nicht erfuellt. Er gilt fuer genau eine
   * Lage: Der Zielwert der Musterloesung ist verfehlt, der Schueler hat seinen
   * EIGENEN Rechenweg aber fehlerfrei ausgefuehrt.
   *
   * Das ist die Signatur eines Folgefehlers — wer sich in a) verrechnet und in b)
   * mit seinem falschen Wert sauber weiterrechnet, verfehlt das Ziel zwangslaeufig.
   * Es ist aber auch die Signatur einer falschen METHODE, die sauber gerechnet
   * wurde. Beides zu unterscheiden setzt den Rechenweg der Musterloesung voraus,
   * den ein Rechenziel nicht enthaelt.
   *
   * Deshalb urteilt die Sandbox hier gar nicht, statt zu raten: Sie reicht ihre
   * Tatsachen weiter und laesst das Modell entscheiden — dieselbe Regel, nach der
   * `proofValues` entfallen ist. Ein bindendes Urteil, das die Sandbox nicht
   * belegen kann, ist schlechter als gar keines.
   *
   * `erfuellt` ist dabei `false`. Wer dieses Feld nicht kennt, verhaelt sich also
   * wie bisher — kein Aufrufer verschenkt versehentlich Punkte.
   */
  unentschieden?: boolean;
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
 * Nur echte Rechenfehler belasten den Schueler.
 *
 * Ein Schritt, den die Sandbox nicht PARSEN konnte, sagt nichts ueber seine
 * Richtigkeit aus — ihn als Fehler zu werten hiesse, dem Schueler eine Grenze
 * unserer Auswertung anzulasten.
 *
 * Diese Regel stand als Kommentar ueber genau EINER von zwei Stellen. Die
 * andere (`resolveEngineVerdict`, Ergebnis-Kriterium) nahm alle Sandbox-Fehler
 * — und nannte der Schuelerin damit Schritte, an denen sie richtig gerechnet
 * hatte, unsere Auswertung sie aber nicht lesen konnte (18.08.2026
 * nachgestellt). Jetzt steht die Regel einmal hier, und beide holen sie sich
 * von derselben Stelle.
 */
function nurEchteRechenfehler(sandboxErrors: string[]): string[] {
  return sandboxErrors.filter(err => err.startsWith('Rechenfehler'));
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

  const fehlerhaft = gerechnet.filter(id => stepHasSandboxError(id, nurEchteRechenfehler(sandboxErrors)));
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

  // Ergebnis: gegen die Musterloesung.
  if (pt?.reached && !pt.hasCalculationError) {
    return { erfuellt: true, begruendung: 'Sandbox-bestätigt: Zielwert erreicht', stepIds: associated };
  }

  if (pt?.reached && pt.hasCalculationError) {
    const fehlerhaft = associated.filter(id => stepHasSandboxError(id, nurEchteRechenfehler(sandboxErrors)));
    const schritte = fehlerhaft.length > 0 ? fehlerhaft : associated;
    return {
      erfuellt: false,
      begruendung: `Rechenfehler im Rechenweg${schritte.length > 0 ? ` (Schritte: ${schritte.join(', ')})` : ''}`,
      stepIds: schritte,
    };
  }

  // Zielwert verfehlt. Bevor das als "nicht erfuellt" bindend wird: Hat der Schueler
  // seinen EIGENEN Rechenweg fehlerfrei ausgefuehrt? Dann ist dies die Lage, in der
  // die Sandbox nicht entscheiden darf — siehe `unentschieden`.
  const eigenerWeg = bewerteRechenweg(targetIndex, evidence);
  if (eigenerWeg.erfuellt) {
    return {
      erfuellt: false,
      unentschieden: true,
      begruendung:
        'Sandbox unentschieden: Zielwert der Musterloesung verfehlt, der eigene Rechenweg '
        + 'ist aber fehlerfrei. Das kann ein Folgefehler aus einer frueheren Teilaufgabe sein '
        + '(dann kein erneuter Abzug) oder ein falscher Ansatz (dann kein Punkt).',
      stepIds: eigenerWeg.stepIds,
    };
  }

  return { erfuellt: false, begruendung: 'Zielwert nicht erreicht/nicht notiert', stepIds: associated };
}

/**
 * Liefert die verbindliche Zustaendigkeit eines Kriteriums.
 * Wird einmalig beim Einlesen der Musterloesung angewendet und ins Feld `source` geschrieben —
 * danach lesen alle Verbraucher nur noch dieses Feld.
 *
 * Ein unbekanntes oder fehlendes `source` faellt auf `llm`. Frueher stand hier eine
 * Wortsuche ueber `id`/`label`, die Kriterien nach Bezeichnung der Engine zuwies. Sie
 * ist entfallen: Ihr einziges Ziel war `proofValues`, und wo die Engine nichts beweisen
 * kann, ist die Rueckfrage ans Modell die richtige Vorgabe — nicht ein Urteil, das
 * niemand mehr korrigieren kann.
 */
// Das `source` ist hier ABSICHTLICH unbekannt: die Funktion existiert genau
// dafuer, Kriterien ohne gueltige Zustaendigkeit zu reparieren. Ein Parameter
// vom Typ `CriterionSource` behauptete, der Reparaturfall koenne nicht
// eintreten — und zwaenge jeden Aufrufer zu einer Behauptung, die er nicht
// belegen kann.
export function normalizeCriterionSource(
  crit: Pick<GradingCriterion, 'id' | 'label'> & { source?: unknown }
): CriterionSource {
  if (isValidCriterionSource(crit.source)) return crit.source;
  if (typeof crit.source === 'string' && crit.source in VERALTETE_QUELLEN) {
    return VERALTETE_QUELLEN[crit.source];
  }
  return 'llm';
}
