/**
 * Domain-Specific Helper Engines (Plugins)
 * Provides standardized mathematical and logical helpers for the Graph Engine.
 */

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

// Subnetting Domain Engine
export const networkPlugin = {
  /**
   * Calculates the CIDR notation mask required for a given number of hosts
   * (including 2 reserved addresses for Net ID and Broadcast)
   */
  calculateMask(hosts: number): string {
    const requiredSize = hosts + 2;
    let power = 0;
    while (Math.pow(2, power) < requiredSize) {
      power++;
    }
    const mask = 32 - power;
    return `/${mask}`;
  },

  /**
   * Returns the size (total IP addresses) of a subnet mask
   */
  calculateSize(mask: string): number {
    const cleanMask = parseInt(mask.replace('/', ''), 10);
    if (isNaN(cleanMask) || cleanMask < 0 || cleanMask > 32) {
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

// Global Plugin Registry
export const raidPlugin = {
  /**
   * Calculates net capacity for RAID levels 0, 1, 5, 6, 10
   */
  calculateNetCapacity(level: number | string, disks: number, size: number): number {
    const lvl = typeof level === 'string' ? parseInt(level, 10) : level;
    switch (lvl) {
      case 0:
        return disks * size;
      case 1:
        return size;
      case 5:
        return Math.max(0, disks - 1) * size;
      case 6:
        return Math.max(0, disks - 2) * size;
      case 10:
        return Math.floor(disks / 2) * size;
      default:
        throw new Error(`Unsupported RAID level: ${level}`);
    }
  },

  /**
   * Calculates fault tolerance (maximum fail-safe disk loss) for RAID levels 0, 1, 5, 6, 10
   */
  calculateFaultTolerance(level: number | string, disks: number): number {
    const lvl = typeof level === 'string' ? parseInt(level, 10) : level;
    switch (lvl) {
      case 0:
        return 0;
      case 1:
        return Math.max(0, disks - 1);
      case 5:
        return disks >= 3 ? 1 : 0;
      case 6:
        return disks >= 4 ? 2 : 0;
      case 10:
        return disks >= 4 ? 1 : 0; // Guaranteed minimum is 1
      default:
        throw new Error(`Unsupported RAID level: ${level}`);
    }
  },

  // Aliases for LLM resilience
  calculateCapacity(level: number | string, disks: number, size: number): number {
    return this.calculateNetCapacity(level, disks, size);
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
  raid: raidPlugin,
  math: mathPlugin,
  // Future extensions:
  // physics: physicsPlugin,
  // chemistry: chemistryPlugin
};


function splitArguments(rawArgs: string): string[] {
  const args: string[] = [];
  let currentArg = '';
  let parenDepth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < rawArgs.length; i++) {
    const char = rawArgs[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentArg += char;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      currentArg += char;
    } else if (inDoubleQuote || inSingleQuote) {
      currentArg += char;
    } else if (char === '(') {
      parenDepth++;
      currentArg += char;
    } else if (char === ')') {
      parenDepth--;
      currentArg += char;
    } else if (char === ',' && parenDepth === 0) {
      args.push(currentArg.trim());
      currentArg = '';
    } else {
      currentArg += char;
    }
  }
  if (currentArg.trim() !== '') {
    args.push(currentArg.trim());
  }
  return args;
}

/**
 * Evaluates an expression string using resolved variables.
 * Format: "domain.function(arg1, arg2, ...)"
 * Supports nested function calls recursively.
 */
export function evaluateExpression(expression: string, context: Record<string, any>): any {
  const match = expression.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/);
  if (!match) {
    throw new Error(`Unsupported expression format: ${expression}`);
  }

  const [_, domainName, functionName, rawArgs] = match;
  const domain = plugins[domainName];
  if (!domain) {
    throw new Error(`Unknown plugin domain: ${domainName}`);
  }

  const fn = domain[functionName];
  if (!fn) {
    throw new Error(`Unknown function: ${functionName} in domain ${domainName}`);
  }

  // Parse arguments (can be variable references, literal values, or nested function calls)
  const args = rawArgs ? splitArguments(rawArgs).map(arg => {
    const trimmed = arg.trim();
    
    // Check if it's a nested function call
    if (/^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\(.*\)$/.test(trimmed)) {
      return evaluateExpression(trimmed, context);
    }

    // Check if it's a numeric literal
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed);
    }
    
    // Check if it's a string literal (quoted)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Otherwise, treat as variable reference
    if (context[trimmed] !== undefined) {
      return context[trimmed];
    }

    throw new Error(`Unresolved argument reference: "${trimmed}" in expression "${expression}"`);
  }) : [];

  return fn.apply(domain, args);
}
