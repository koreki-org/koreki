import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './logger';

/**
 * Saeule 1: Rate Limiting nach Subjekt statt nach IP.
 * 🛡️
 *
 * Der Limiter zaehlte bisher ausschliesslich pro IP. Das ist die falsche
 * Einheit, sobald die Identitaet bekannt ist, und bricht in zwei realen Faellen:
 *
 * 1. Eine Klassenkorrektur mit 30 Schuelern sind 30 Anfragen. Bei 10/min war
 *    nach dem zehnten Schueler Schluss.
 * 2. Eine Schule hinter NAT ist genau eine IP. Im Community-Multi-User-Betrieb
 *    haette sich das gesamte Kollegium ein Kontingent geteilt.
 *
 * Deshalb zwei Stufen: eine weit gefasste IP-Bremse VOR der Authentifizierung,
 * die nur echte Fluten abfaengt und den Auth-Pfad selbst schuetzt — und danach
 * das eigentliche Limit auf der Nutzer-ID. Anonyme Anfragen behalten die
 * bisherigen, strengeren IP-Grenzen, weil es dort keine bessere Handhabe gibt.
 */

/**
 * Flut-Schutz vor der Authentifizierung. Bewusst weit: hinter dieser IP kann
 * ein ganzes Kollegium sitzen, das Limit darf legitimen Unterricht nicht
 * treffen. Es geht hier allein darum, dass eine Flut nicht bis zur
 * Token-Pruefung und in die Datenbank durchschlaegt.
 */
const ipFloodLimiter = new RateLimiterMemory({ points: 600, duration: 60 });

/** Anonyme Anfragen: die IP ist die einzige verfuegbare Handhabe. */
const anonymousLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
const anonymousAiLimiter = new RateLimiterMemory({ points: 10, duration: 60 });

/**
 * Angemeldete Anfragen: die Nutzer-ID ist die richtige Einheit.
 * 60/min auf KI-Routen traegt eine Klassenkorrektur in einem Durchgang.
 */
const userLimiter = new RateLimiterMemory({ points: 300, duration: 60 });
const userAiLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

const consume = async (limiter: RateLimiterMemory, key: string, label: string): Promise<boolean> => {
    try {
        await limiter.consume(key);
        return true;
    } catch {
        logger.warn('[SECURITY] Rate Limit triggered', { limit: label });
        return false;
    }
};

/**
 * Erste Stufe: greift fuer JEDE Anfrage, bevor Identitaet oder Rolle bekannt
 * sind. Bewusst grosszuegig — die eigentliche Begrenzung passiert danach.
 */
export async function checkIpFloodLimit(ip: string): Promise<boolean> {
    return consume(ipFloodLimiter, ip, 'ip-flood');
}

/**
 * Zweite Stufe: das eigentliche Limit.
 *
 * @param subject Nutzer-ID bei angemeldeten Anfragen, sonst die IP.
 * @param isAuthenticated Entscheidet ueber Kontingent und Zaehleinheit.
 * @param isAi Route ruft einen KI-Anbieter auf — das teure Kontingent.
 */
export async function checkSubjectLimit(
    subject: string,
    isAuthenticated: boolean,
    isAi: boolean
): Promise<boolean> {
    if (isAuthenticated) {
        return isAi
            ? consume(userAiLimiter, subject, 'user-ai')
            : consume(userLimiter, subject, 'user');
    }

    return isAi
        ? consume(anonymousAiLimiter, subject, 'anonymous-ai')
        : consume(anonymousLimiter, subject, 'anonymous');
}
