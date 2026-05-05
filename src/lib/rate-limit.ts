import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from './logger';

// GLOBAL: 100 Requests per Minute (per IP)
const globalLimiter = new RateLimiterMemory({
    points: 100, 
    duration: 60, // 60 seconds
});

// SENSITIVE (AI): 10 Requests per Minute (per IP)
const aiLimiter = new RateLimiterMemory({
    points: 10,
    duration: 60,
});

/**
 * Validates the rate limit for a given IP and action type.
 * @param ip Client IP address (Hashed or Plain)
 * @param isAi Whether this is a sensitive AI endpoint
 * @returns true if allowed, false if blocked
 */
export async function checkRateLimit(ip: string, isAi: boolean = false): Promise<boolean> {
    try {
        const limiter = isAi ? aiLimiter : globalLimiter;
        await limiter.consume(ip);
        return true;
    } catch (rejRes) {
        // Log rejection for audit/monitoring
        logger.warn(`[SECURITY] Rate Limit triggered`, { message: `IP: ${ip} (${isAi ? 'AI' : 'Global'})` });
        return false;
    }
}
