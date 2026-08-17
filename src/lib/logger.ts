/**
 * Security-First Logging Utility.
 * Masks PII and Secrets before they hit the console/log-aggregator.
 */

const PII_PATTERNS = [
    { 
        pattern: /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, 
        mask: (match: string) => '***@***.***' 
    },
    { 
        // Identifies key-value pairs and masks the value part
        pattern: /(api[-_]?key|bearer|token|secret)\s*[:= ]\s*["']?([a-zA-Z0-9_\-\.]{10,})["']?/gi,
        mask: (match: string, p1: string, p2: string) => `${p1}: ${p2.substring(0, 4)}**********`
    }
];

function sanitize(text: string): string {
    let masked = text;
    PII_PATTERNS.forEach(({ pattern, mask }) => {
        // Die Fallunterscheidung loest die Ueberladung von `replace` auf: mit
        // dem gemeinsamen Typ passt weder die Zeichenketten- noch die
        // Funktions-Variante, und genau dafuer stand hier ein `as any`.
        masked = typeof mask === 'string'
            ? masked.replace(pattern, mask)
            : masked.replace(pattern, mask);
    });
    return masked;
}

/**
 * Bereinigt Log-Argumente rekursiv.
 *
 * Frueher wurden ausschliesslich Strings maskiert. Der projektweite Aufrufstil
 * ist aber `logger.error('...', { endpoint, message })` — die eigentlichen
 * Nutzdaten stecken also in einem Objekt und liefen ungefiltert durch, obwohl
 * PII_PATTERNS ihr Muster kennt (Saeule 4).
 *
 * Die Tiefe ist begrenzt, damit zyklische oder sehr verschachtelte Strukturen
 * das Logging nicht blockieren.
 */
function sanitizeArg(value: unknown, depth = 0): unknown {
    if (typeof value === 'string') return sanitize(value);
    if (value === null || typeof value !== 'object' || depth >= 4) return value;

    if (value instanceof Error) {
        return `${value.name}: ${sanitize(value.message)}`;
    }

    if (Array.isArray(value)) {
        return value.map(entry => sanitizeArg(entry, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        result[key] = sanitizeArg(entry, depth + 1);
    }
    return result;
}

const sanitizeArgs = (args: unknown[]) => args.map(arg => sanitizeArg(arg));

export const logger = {
    info: (msg: string, ...args: unknown[]) => {
        console.info(`[INFO] ${sanitize(msg)}`, ...sanitizeArgs(args));
    },
    warn: (msg: string, ...args: unknown[]) => {
        console.warn(`[WARN] ${sanitize(msg)}`, ...sanitizeArgs(args));
    },
    error: (msg: string, ...args: unknown[]) => {
        console.error(`[ERROR] ${sanitize(msg)}`, ...sanitizeArgs(args));
    },
    debug: (msg: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${sanitize(msg)}`, ...sanitizeArgs(args));
        }
    },
    security: (msg: string, ...args: unknown[]) => {
        console.warn(`[SECURITY] 🛡️ ${sanitize(msg)}`, ...sanitizeArgs(args));
    }
};
