import { math } from './mathjs-instance';
import { logger } from '@/lib/logger';
import { isWithinTolerance } from './numeric-tolerance';
import { toErrorMessage } from '../error-message';
import type { UnitComparisonDetail } from './calc-trace-types';

/**
 * Physikalische Einheiten in der Bewertung.
 * 📏
 *
 * Ein Schüler schreibt "0,5 A", die Musterlösung nennt "500 mA" — dasselbe
 * Ergebnis, andere Schreibweise. Ohne dieses Modul kostet das Punkte, obwohl
 * fachlich nichts falsch ist.
 *
 * Der Weg: Schreibweise vereinheitlichen (Hochzahlen, Sonderzeichen,
 * gebräuchliche Abkürzungen), dann über mathjs auf SI-Basiseinheiten bringen
 * und erst dort vergleichen. Zahl und Einheit werden getrennt geprüft, wie es
 * STACK/Maxima und WeBWorK vormachen.
 *
 * Herausgezogen aus `CalcTrace.ts`: ein geschlossenes Teilgebiet mit eigenem
 * Vokabular, das der Auswerter nur BENUTZT. Kein Zersägen des Auswerters —
 * der bleibt am Stück.
 */

/** Map of common non-standard unit strings to mathjs-compatible unit strings */
const UNIT_ALIASES: Record<string, string> = {
  'Ohm': 'ohm',
  'Ω':   'ohm',
  'kΩ':  'kohm',
  'MΩ':  'Mohm',
  'kOhm': 'kohm',
  'MOhm': 'Mohm',
  'mΩ':  'mohm',
  '€':   'EUR',
  'EUR': 'EUR',
  '$':   'USD',
  'USD': 'USD',
};

/**
 * Das Mikro-Praefix.
 *
 * mathjs versteht ausschliesslich `u` — weder das Mikro-Zeichen (U+00B5, was
 * die Tastatur liefert) noch das griechische My (U+03BC, was aus Formeleditoren
 * und OCR kommt). Ohne diese Ersetzung ist "1846 µA" fuer die Engine keine
 * Einheit, die Umrechnung scheitert still, und eine voellig richtige Antwort
 * wird als falsch bewertet.
 *
 * Gilt fuer Einheiten UND fuer Formeln — beide Wege muenden in denselben
 * Parser, siehe `normalizeSuperscripts`.
 */
const MIKRO_ZEICHEN = /[µμ]/g;

/** Normalize a unit string to a mathjs-compatible format */
export function normalizeUnitString(unit: string): string {
  let u = unit.trim();
  u = u.replace(MIKRO_ZEICHEN, 'u');
  // Globally normalize all ohm and currency symbols
  u = u.replace(/[ΩΩ]/g, 'ohm');
  u = u.replace(/\bOhm\b/g, 'ohm');
  u = u.replace(/€/g, 'EUR');
  u = u.replace(/\$/g, 'USD');
  return UNIT_ALIASES[u] || normalizeSuperscripts(u);
}

/** Hochgestellte Ziffern, wie sie in Flaechen- und Volumeneinheiten vorkommen. */
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

/**
 * Schreibt "m²" als "m^2" — die einzige Potenzschreibweise, die mathjs versteht.
 *
 * Gilt fuer Formeln UND fuer Einheiten: Beide Wege muenden in denselben Parser. Wird nur
 * einer davon umgeschrieben, scheitert stattdessen die Umrechnung — mit derselben Folge,
 * dass ein fehlerfreier Rechenweg als Fehler gemeldet wird.
 */
function normalizeSuperscripts(text: string): string {
  return text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, match =>
    '^' + Array.from(match).map(c => SUPERSCRIPT_DIGITS[c]).join('')
  );
}

/** Normalize unit symbols inside a formula string using UNIT_ALIASES */
/**
 * Einheitenkuerzel, die in mathjs von einer gleichnamigen FUNKTION verdeckt werden.
 *
 * `min` und `sec` sind mathjs beide als Einheit bekannt — `createUnit('min')`
 * scheitert mit "a unit with that name already exists". Beim Auswerten eines
 * Ausdrucks gewinnt aber die Funktion: `min()` (Minimum) und `sec()` (Sekans).
 * `30 min` wird deshalb nicht zu dreissig Minuten, sondern zu einem Typfehler
 * ("Unexpected type of argument in function multiplyScalar").
 *
 * GEFUNDEN AM 03.09.2026 an einer Pflege-Aufgabe zur Infusionsrate ("2 ml in
 * 30 min"). Die Sandbox konnte den Schritt nicht nachrechnen und meldete ihn als
 * nicht auswertbar. Betroffen ist jede Aufgabe mit Minuten oder Sekunden in
 * Kurzschreibweise — Infusionsraten, Geschwindigkeiten, Leistung ueber Zeit.
 *
 * Ersetzt wird nur, wo KEINE Klammer folgt: `min(3, 5)` bleibt der
 * Funktionsaufruf, `30 min` wird zur Zeitangabe.
 */
function entschaerfeFunktionsnamen(formel: string): string {
  return formel
    .replace(/\bmin\b(?!\s*\()/g, 'minute')
    .replace(/\bsec\b(?!\s*\()/g, 'second');
}

export function normalizeExpressionFormula(formula: string): string {
  let f = formula;
  const keys = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    f = f.split(key).join(UNIT_ALIASES[key]);
  }
  // Schueler und Musterloesungen schreiben "m²" oder "cm³". Ohne diese Umschrift scheitert
  // schon das Parsen, und ein fehlerfreier Rechenweg wird als Fehler angelastet.
  f = normalizeSuperscripts(f);
  f = f.replace(MIKRO_ZEICHEN, 'u');
  // Additionally clean up other Ohm variants, currency and standard unit capitals
  f = f.replace(/[ΩΩ]/g, 'ohm');
  f = f.replace(/\bOhm\b/g, 'ohm');
  f = f.replace(/\bVolt\b/g, 'volt');
  f = entschaerfeFunktionsnamen(f);
  f = f.replace(/€/g, 'EUR');
  f = f.replace(/\$/g, 'USD');
  return f;
}

/**
 * Converts a value+unit pair to its SI base value using mathjs unit().
 * Returns null if the unit is not recognized by mathjs.
 *
 * Example: toSIBaseValue(1.846, "mA") → 0.001846
 * Example: toSIBaseValue(6.5, "kohm") → 6500
 */
function toSIBaseValue(value: number, unit: string): number | null {
  try {
    const normalized = normalizeUnitString(unit);
    const u = math.unit(value, normalized);
    const si = u.toSI();
    return si.toNumber();
  } catch {
    logger.debug(`[CalcTrace/units] mathjs could not parse unit: "${unit}"`);
    return null;
  }
}

/**
 * Checks if two unit strings represent the same physical dimension.
 * e.g. "mA" and "A" are both current → true
 *      "mA" and "V" are different → false
 */
function isSameBaseDimension(unitA: string, unitB: string): boolean {
  try {
    const a = math.unit(1, normalizeUnitString(unitA));
    const b = math.unit(1, normalizeUnitString(unitB));
    return a.equalBase(b);
  } catch {
    return false;
  }
}

/**
 * Core unit-aware comparison: checks a student's value+unit against a target value+unit.
 * 
 * Returns a detailed result indicating:
 * - Exact match (value AND unit match)
 * - Unit mismatch (value matches after SI normalization, but different prefix/unit)
 * - No match
 */
export function compareWithUnit(
  studentValue: number,
  studentUnit: string | undefined,
  expectedValue: number,
  expectedUnit: string,
  tolerance: number
): UnitComparisonDetail {
  const base: UnitComparisonDetail = {
    targetValue: expectedValue,
    expectedUnit,
    studentUnit: studentUnit,
    isValueMatch: false,
    isExactMatch: false,
    isUnitMismatch: false,
  };

  // 1. Exact numeric match (same prefix) — check if units also match
  const isExactNumeric = isWithinTolerance(studentValue, expectedValue, tolerance);
  if (isExactNumeric) {
    if (studentUnit && normalizeUnitString(studentUnit) === normalizeUnitString(expectedUnit)) {
      return { ...base, isValueMatch: true, isExactMatch: true };
    }
    // Keine Einheit notiert. Der Zahlenwert stimmt, die Angabe ist aber unvollstaendig —
    // und wird genauso behandelt wie eine falsche Einheit (kein Treffer).
    if (!studentUnit) {
      return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true, isMissingUnit: true };
    }
    // Same number but different unit (e.g. student wrote "230 mA" but target is "230 V")
    // Check if they're even the same dimension
    if (!isSameBaseDimension(studentUnit, expectedUnit)) {
      return { ...base, isValueMatch: false, isExactMatch: false };
    }
    // Same dimension, same number, different prefix (e.g. 6.5 Ω vs 6.5 kΩ)
    // → the student clearly has the wrong magnitude
    return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true, isPrefixError: true };
  }

  // 2. SI normalization: check if value matches after unit conversion
  const siExpected = toSIBaseValue(expectedValue, expectedUnit);
  if (siExpected === null) return base; // Can't parse unit → no SI comparison possible

  const isSIMatch = isWithinTolerance(studentValue, siExpected, tolerance);
  if (isSIMatch) {
    // Student's raw number matches the SI base value of the target
    // e.g. student wrote 0.001846, target is 1.846 mA → 0.001846 A
    if (studentUnit && isSameBaseDimension(studentUnit, expectedUnit)) {
      // Student wrote a unit in the same dimension — check if it's correct
      const siStudent = toSIBaseValue(studentValue, studentUnit);
      if (siStudent !== null && isWithinTolerance(siStudent, siExpected, tolerance)) {
        // Full physical equivalence: 0.001846 A = 1.846 mA ✓
        return { ...base, isValueMatch: true, isExactMatch: true };
      }
      // Student's unit makes the value wrong (e.g. 0.001846 mA ≠ 1.846 mA)
      return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true };
    }
    // Keine Einheit notiert — die nackte Zahl entspricht dem SI-Basiswert des Ziels.
    return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true, isMissingUnit: true };
  }

  // 3. If student provided a unit, try full physical comparison
  if (studentUnit && isSameBaseDimension(studentUnit, expectedUnit)) {
    const siStudent = toSIBaseValue(studentValue, studentUnit);
    if (siStudent !== null && isWithinTolerance(siStudent, siExpected, tolerance)) {
      // e.g. student: 1846 µA, target: 1.846 mA → both = 0.001846 A ✓
      return { ...base, isValueMatch: true, isExactMatch: true };
    }
  }

  return base; // No match
}

// ─── Target Value Parsing ────────────────────────────────────────────────────

/**
 * Wissenschaftliche Schreibweise in die E-Notation ueberfuehren.
 *
 * "1,2044 * 10^24" ist EIN Wert. Der Zahlen-Abgleich unten kennt aber nur
 * `1.2044e24`; auf die ausgeschriebene Form angewandt findet er drei Zahlen —
 * 1.2044, 10 und 24 — und macht daraus drei Zielwerte, die ein Schueler
 * niemals alle treffen kann. Chemie und Physik schreiben Zehnerpotenzen genau
 * so, und die Ziel-Erzeugung liefert sie ebenfalls in dieser Form zurueck.
 *
 * Erkannt werden `*`, `x`, `X` und das Malzeichen `×` als Multiplikator. Die
 * Mantisse darf fehlen: `10^24` ist `1e24`. Das `^` ist dagegen Pflicht — ohne
 * Exponentenzeichen liesse sich eine Zehnerpotenz nicht von zwei nebeneinander
 * stehenden Zahlen unterscheiden.
 */
function alsENotation(text: string): string {
  return text.replace(
    /(?:(-?\d+(?:[.,]\d+)?)\s*[*x×]\s*)?10\s*\^\s*(-?\d+)/gi,
    (_treffer, mantisse: string | undefined, exponent: string) =>
      `${(mantisse ?? '1').replace(',', '.')}e${exponent}`
  );
}

/** Parse target values into an array of numbers (no unit expansion, just raw values) */
export function parseTargetValues(targetVal: number | number[] | string): number[] {
  if (typeof targetVal === 'number') return [targetVal];
  if (Array.isArray(targetVal)) return targetVal.map(Number).filter(n => !isNaN(n));
  if (typeof targetVal === 'string') {
    const matches = alsENotation(targetVal).match(/-?\d+(?:[\.,]\d+)?(?:[eE][-+]?\d+)?/g);
    if (matches) {
      return matches.map(m => Number(m.replace(',', '.'))).filter(n => !isNaN(n));
    }
  }
  return [];
}

/** Parse a unit string into per-value units (e.g. "kΩ, mA" → ["kΩ", "mA"]) */
export function parseUnitsPerValue(unit: string | undefined, valueCount: number): (string | undefined)[] {
  if (!unit) return new Array(valueCount).fill(undefined);
  const parsed = unit.split(/[,;]+/).map(u => u.trim()).filter(u => u.length > 0);
  if (parsed.length === 1) {
    // Single unit → apply to last value (the final target)
    return new Array(valueCount).fill(undefined).map((_, i) => i === valueCount - 1 ? parsed[0] : undefined);
  }
  // Multiple units → pair by index
  return new Array(valueCount).fill(undefined).map((_, i) => parsed[i]);
}

export function convertBetweenUnits(value: number, fromUnit: string, toUnit: string): number | null {
  try {
    return math.unit(value, normalizeUnitString(fromUnit)).toNumber(normalizeUnitString(toUnit));
  } catch {
    return null; // inkompatible Dimensionen → kein legitimer Umrechnungsfall, Fehler bleibt bestehen
  }
}
