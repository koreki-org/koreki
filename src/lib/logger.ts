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
        masked = masked.replace(pattern, mask as any);
    });
    return masked;
}

export const logger = {
    info: (msg: string, ...args: any[]) => {
        console.info(`[INFO] ${sanitize(msg)}`, ...args.map(a => typeof a === 'string' ? sanitize(a) : a));
    },
    warn: (msg: string, ...args: any[]) => {
        console.warn(`[WARN] ${sanitize(msg)}`, ...args.map(a => typeof a === 'string' ? sanitize(a) : a));
    },
    error: (msg: string, ...args: any[]) => {
        console.error(`[ERROR] ${sanitize(msg)}`, ...args.map(a => typeof a === 'string' ? sanitize(a) : a));
    },
    security: (msg: string, ...args: any[]) => {
        console.warn(`[SECURITY] 🛡️ ${sanitize(msg)}`, ...args.map(a => typeof a === 'string' ? sanitize(a) : a));
    }
};
