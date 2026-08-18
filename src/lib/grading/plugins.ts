/**
 * Domain-Specific Helper Engines (Plugins)
 * Provides standardized mathematical and logical helpers for the Graph Engine.
 */
import { Parser } from 'expr-eval';


// Helper to convert IP to number and vice versa for network math
export const ipToLong = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Invalid IP format: ${ip}`);
  }
  return (parts[0] << 24) >>> 0 | (parts[1] << 16) | (parts[2] << 8) | parts[3];
};

export const longToIp = (long: number): string => {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
};

/**
 * Macht aus dem, was ankommt, eine Zahl — oder bricht ab.
 *
 * Das Prompt-Schema erlaubt dem Modell ausdrücklich, einen `defaultValue` als
 * TEXT zu liefern, und `parseGeneratedGraph` reicht ihn unverändert weiter.
 * `mathPlugin` hat das immer berücksichtigt, `networkPlugin` nicht — mit
 * stillen Folgen (18.08.2026):
 *
 *   calculateMask(50)    -> "/26"   richtig
 *   calculateMask("50")  -> "/23"   falsch, weil "50" + 2 die Zeichenkette
 *                                   "502" ergibt
 *
 * Die erwartete Maske war damit falsch, und jede Schülerin, die richtig
 * gerechnet hatte, galt als falsch. Die gesamte Zeile danach — Netz-ID,
 * Broadcast, erster und letzter Host — baut auf dieser Maske auf.
 *
 * Ein Abbruch ist hier das richtige Verhalten: er landet als
 * „Mathematischer Auswertungsfehler" im Trockenlauf, und der Graph wird neu
 * erzeugt, statt falsch zu bewerten.
 */
const alsZahl = (wert: unknown, was: string): number => {
  const zahl = typeof wert === 'number' ? wert : parseFloat(String(wert));
  if (!Number.isFinite(zahl)) {
    throw new Error(`${was} ist keine Zahl: ${JSON.stringify(wert)}`);
  }
  return zahl;
};

// Subnetting Domain Engine
export const networkPlugin = {
  /**
   * Calculates the CIDR notation mask required for a given number of hosts
   * (including 2 reserved addresses for Net ID and Broadcast)
   */
  calculateMask(hosts: number | string): string {
    const anzahl = alsZahl(hosts, 'Host-Anzahl');
    if (anzahl < 0) {
      throw new Error(`Host-Anzahl ist negativ: ${anzahl}`);
    }

    const requiredSize = anzahl + 2;
    let power = 0;
    while (Math.pow(2, power) < requiredSize) {
      power++;
    }

    const mask = 32 - power;
    if (mask < 0) {
      throw new Error(`Host-Anzahl passt in kein IPv4-Netz: ${anzahl}`);
    }
    return `/${mask}`;
  },

  /**
   * Returns the size (total IP addresses) of a subnet mask
   */
  calculateSize(mask: string | number): number {
    // Auch eine blanke Zahl (24 statt "/24") kommt vor — vorher stürzte das mit
    // "mask.replace is not a function" ab.
    const cleanMask = alsZahl(String(mask).replace('/', ''), 'Maske');
    if (!Number.isInteger(cleanMask) || cleanMask < 0 || cleanMask > 32) {
      throw new Error(`Invalid mask: ${mask}`);
    }
    return Math.pow(2, 32 - cleanMask);
  },

  /**
   * Calculates the next Net ID address based on the previous Net ID and previous Mask
   */
  calculateNetId(prevNetId: string, prevMask: string): string {
    const size = this.calculateSize(prevMask);
    const prevLong = ipToLong(prevNetId);
    const nextLong = prevLong + size;
    return longToIp(nextLong);
  },

  /**
   * Calculates the Broadcast IP address for a given Net ID and Mask
   */
  calculateBroadcast(netId: string, mask: string): string {
    const size = this.calculateSize(mask);
    const netLong = ipToLong(netId);
    const broadcastLong = netLong + size - 1;
    return longToIp(broadcastLong);
  },

  /**
   * Calculates the first usable host IP (Net ID + 1)
   */
  calculateFirstHost(netId: string): string {
    const netLong = ipToLong(netId);
    return longToIp(netLong + 1);
  },

  /**
   * Calculates the last usable host IP (Broadcast - 1)
   */
  calculateLastHost(netId: string, mask: string): string {
    const size = this.calculateSize(mask);
    const netLong = ipToLong(netId);
    return longToIp(netLong + size - 2);
  },

  /**
   * Calculates the gateway (defaults to last usable host IP, Broadcast - 1)
   */
  calculateGateway(netId: string, mask: string): string {
    return this.calculateLastHost(netId, mask);
  },

  // Aliases for LLM resilience (handling common AI hallucinations/guesses)
  calculateNextNetId(prevNetId: string, prevMask: string): string {
    return this.calculateNetId(prevNetId, prevMask);
  },
  calculateNextNetid(prevNetId: string, prevMask: string): string {
    return this.calculateNetId(prevNetId, prevMask);
  },
  calculateNetid(prevNetId: string, prevMask: string): string {
    return this.calculateNetId(prevNetId, prevMask);
  },
  calculateLastUsable(netId: string, mask: string): string {
    return this.calculateLastHost(netId, mask);
  },
  calculateLastUsableHost(netId: string, mask: string): string {
    return this.calculateLastHost(netId, mask);
  },
  calculateFirstUsable(netId: string): string {
    return this.calculateFirstHost(netId);
  },
  calculateFirstUsableHost(netId: string): string {
    return this.calculateFirstHost(netId);
  }
};

// Math Domain Engine
export const mathPlugin = {
  add(a: number | string, b: number | string): number {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;
    return numA + numB;
  },
  subtract(a: number | string, b: number | string): number {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;
    return numA - numB;
  },
  multiply(a: number | string, b: number | string): number {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;
    return numA * numB;
  },
  divide(a: number | string, b: number | string): number {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;
    if (numB === 0) throw new Error("Division by zero in math.divide");
    return numA / numB;
  },
  power(base: number | string, exponent: number | string): number {
    const numBase = typeof base === 'string' ? parseFloat(base) : base;
    const numExponent = typeof exponent === 'string' ? parseFloat(exponent) : exponent;
    return Math.pow(numBase, numExponent);
  },
  percentage(part: number | string, total: number | string): number {
    const numPart = typeof part === 'string' ? parseFloat(part) : part;
    const numTotal = typeof total === 'string' ? parseFloat(total) : total;
    if (numTotal === 0) return 0;
    return (numPart / numTotal) * 100;
  }
};

export const plugins: Record<string, Record<string, Function>> = {
  network: networkPlugin,
  math: mathPlugin,
  // Future extensions:
  // physics: physicsPlugin,
  // chemistry: chemistryPlugin
};


const parser = new Parser();

// Dynamically register all existing plugin functions in expr-eval
for (const [domainName, domainFunctions] of Object.entries(plugins)) {
  for (const [functionName, fn] of Object.entries(domainFunctions)) {
    parser.functions[`${domainName}_${functionName}`] = (fn as any).bind(domainFunctions);
  }
}

// Extra math and domain helpers
parser.functions.log2 = (x: number) => Math.log2(x);
parser.functions.ceil = (x: number) => Math.ceil(x);
parser.functions.floor = (x: number) => Math.floor(x);
parser.functions.ipToLong = ipToLong;
parser.functions.longToIp = longToIp;

/**
 * Evaluates an expression string using resolved variables.
 * Supports standard mathematical and logical helpers natively (expr-eval)
 * and maps old "domain.function(...)" calls to registered plugin functions for backward compatibility.
 * SECURED against Prototype Pollution by blocking specific keywords.
 */
export function evaluateExpression(expression: string, context: Record<string, any>): any {
  // 🛡️ Prototype Pollution Guard
  if (/(?:__proto__|constructor|prototype)/i.test(expression)) {
    throw new Error("Security Violation: Dangerous expression payload detected.");
  }

  // Map dots to underscores to support old format backward compatibility
  const sanitizedExpression = expression
    .replace(/network\./g, 'network_')
    .replace(/math\./g, 'math_');

  return parser.evaluate(sanitizedExpression, context);
}

export const PLUGIN_MANIFEST: Record<string, Record<string, { signature: string; description: string }>> = {
  network: {
    calculateMask: {
      signature: "network.calculateMask(hosts)",
      description: "Berechnet das CIDR-Präfix (z. B. '/24') basierend auf der benötigten Host-Anzahl."
    },
    calculateSize: {
      signature: "network.calculateSize(mask)",
      description: "Gibt die Gesamtanzahl an IP-Adressen für eine Maske zurück (z. B. '/24' -> 256)."
    },
    calculateNetId: {
      signature: "network.calculateNetId(prevNetId, prevMask)",
      description: "Berechnet die nächste Netz-ID. WICHTIG: Erwartet zwingend die VORHERIGE NETZ-ID (z.B. '172.16.0.0') als ersten Parameter und NIEMALS die Broadcast-Adresse!"
    },
    calculateBroadcast: {
      signature: "network.calculateBroadcast(netId, mask)",
      description: "Berechnet die Broadcast-IP für eine Netz-ID und Maske."
    },
    calculateFirstHost: {
      signature: "network.calculateFirstHost(netId)",
      description: "Berechnet die erste nutzbare Host-IP (Net-ID + 1)."
    },
    calculateLastHost: {
      signature: "network.calculateLastHost(netId, mask)",
      description: "Berechnet die letzte nutzbare Host-IP (Broadcast-IP - 1)."
    },
    calculateGateway: {
      signature: "network.calculateGateway(netId, mask)",
      description: "Berechnet die Gateway-IP (standardmäßig die letzte nutzbare IP)."
    }
  },
  math: {
    add: {
      signature: "math.add(a, b)",
      description: "Addiert a und b."
    },
    subtract: {
      signature: "math.subtract(a, b)",
      description: "Subtrahiert b von a."
    },
    multiply: {
      signature: "math.multiply(a, b)",
      description: "Multipliziert a mit b."
    },
    divide: {
      signature: "math.divide(a, b)",
      description: "Dividiert a durch b (Sicher vor Division durch Null)."
    },
    power: {
      signature: "math.power(base, exponent)",
      description: "Berechnet base hoch exponent."
    },
    percentage: {
      signature: "math.percentage(part, total)",
      description: "Berechnet den prozentualen Anteil von part an total."
    }
  }
};
