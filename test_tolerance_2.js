function isWithinTolerance(actual, expected, tolerance) {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}
console.log("Proof B (0.05748 vs 0.0575):", isWithinTolerance(0.05748, 0.0575, 0.05));
console.log("Proof B (0.0575 vs 0.0575):", isWithinTolerance(0.0575, 0.0575, 0.05));
