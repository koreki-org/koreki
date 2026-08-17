/**
 * Zahlenvergleich mit Toleranz.
 * 🔢
 *
 * Rundungen und Folgefehler dürfen eine richtige Rechnung nicht scheitern
 * lassen. Fünf Prozent sind der voreingestellte Spielraum, innerhalb dessen ein
 * Ergebnis noch als getroffen gilt.
 *
 * Die Toleranz ist RELATIV zum erwarteten Wert — nur bei einer erwarteten Null
 * gilt sie absolut, weil sich sonst durch null teilen liesse.
 */

export const TOLERANCE = 0.05; // 5% tolerance for rounding/follow-up errors

export function isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}

/** Round to N significant figures to avoid floating-point display noise */
export function roundSig(v: number, sig = 8): number {
  if (v === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(v)));
  const power = sig - d;
  const magnitude = Math.pow(10, power);
  const result = Math.round(v * magnitude) / magnitude;
  return result;
}
