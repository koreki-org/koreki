import { logger } from './logger';
import { toErrorMessage } from './error-message';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delay = 2000
): Promise<Response> {
    try {
        const response = await fetch(url, options);

        // Retry logic for transient errors
        // 429: Too Many Requests (Rate limit)
        // 503: Service Unavailable (Current issue with Mistral)
        // 502: Bad Gateway
        // 504: Gateway Timeout
        const transientStatuses = [429, 502, 503, 504];

        if (transientStatuses.includes(response.status) && retries > 0) {
            logger.warn(`Transient API error ${response.status}`, { message: `Retrying in ${delay}ms... (${retries} retries left)` });
            await sleep(delay);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }

        return response;
    } catch (error) {
        // Retry logic for network errors (e.g., connection reset/overflow)
        if (retries > 0) {
            logger.warn(`Network error`, { message: `${toErrorMessage(error)}. Retrying in ${delay}ms... (${retries} retries left)` });
            await sleep(delay);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}
