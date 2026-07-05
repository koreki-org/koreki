const targetVal = "0.0575 €";
const matches = targetVal.match(/-?\d+(?:[\.,]\d+)?(?:[eE][-+]?\d+)?/g);
console.log("matches:", matches);
