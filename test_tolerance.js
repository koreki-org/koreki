import { create, all } from 'mathjs';

function isWithinTolerance(actual, expected, tolerance) {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}

function normalizeTargetValues(targetVal) {
  if (typeof targetVal === 'number') return [targetVal];
  if (Array.isArray(targetVal)) return targetVal.map(Number).filter(n => !isNaN(n));
  if (typeof targetVal === 'string') {
      const matches = targetVal.match(/-?\d+(?:[\.,]\d+)?(?:[eE][-+]?\d+)?/g);
      if (matches) {
          return matches.map(m => Number(m.replace(',', '.'))).filter(n => !isNaN(n));
      }
  }
  return [];
}

const expectedValues = normalizeTargetValues("0.1917");
console.log("expectedValues:", expectedValues);

const target = 0.1917;
const astResult1 = 191.66;
const astResult2 = 0.1916;

console.log("Proof A (191.66 vs math):", isWithinTolerance(191.66, 191.6666, 0.05));
console.log("Proof A (0.1916 vs math):", isWithinTolerance(0.1916, 0.191666, 0.05));

console.log("Proof B (191.66 vs expected):", isWithinTolerance(191.66, target, 0.05));
console.log("Proof B (0.1916 vs expected):", isWithinTolerance(0.1916, target, 0.05));

// What if step.result is a string?
console.log("Proof A ('0,1916' vs math):", isWithinTolerance("0,1916", 0.191666, 0.05));

