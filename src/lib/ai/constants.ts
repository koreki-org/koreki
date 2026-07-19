import { apiClient } from '../api-client';

export const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';
export const MISTRAL_CORE_MODEL = 'mistral-large-latest';
export const MISTRAL_UTILS_MODEL = 'mistral-small-latest';
export const MISTRAL_CHATS_MODEL = 'mistral-large-latest'; // Hardened: Using flagship instead of pixtral for better instruction following
export const MISTRAL_MEDIUM_MODEL = 'mistral-large-latest'; // Math-optimized flagship model

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Adds ±20% jitter to a delay value to prevent thundering herd on shared API keys.
 */
function withJitter(ms: number): number {
  const jitter = ms * 0.2 * (Math.random() * 2 - 1); // ±20%
  return Math.max(500, Math.round(ms + jitter));
}

/**
 * Industrial-Grade Fetch with Retry, Backoff, Jitter & Retry-After Support.
 * 
 * Fixes the self-reinforcing retry storm: When Mistral returns 429, the old code
 * created up to 4 parallel retry chains on the same shared API key, keeping the
 * rate limit window permanently active. This version:
 * 1. Respects Mistral's `Retry-After` header (authoritative wait time)
 * 2. Adds ±20% jitter to prevent synchronized retries
 * 3. Consumes response body before retry to prevent connection pool leaks
 * 4. Uses 5 retries with 2s initial delay (~2 min max total wait)
 */
export async function fetchWithRetry(url: string, options: any, retries = 5, delay = 2000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per request
  const fetchOptions = { ...options, signal: options.signal || controller.signal };
  
  let response;
  try {
    response = await apiClient.fetch(url, fetchOptions);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (retries > 0) {
      const nextDelay = withJitter(delay * 2);
      await sleep(nextDelay);
      return fetchWithRetry(url, options, retries - 1, nextDelay);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  
  if ((response.status === 429 || response.status >= 500) && retries > 0) {
    // Consume response body to release the connection before retrying
    try { await response.text(); } catch (_) { /* ignore */ }

    let nextDelay: number;

    if (response.status === 429) {
      // Respect Mistral's Retry-After header if present (value in seconds)
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter && !isNaN(Number(retryAfter))) {
        nextDelay = withJitter(Number(retryAfter) * 1000);
      } else {
        nextDelay = withJitter(delay * 3); // Conservative backoff for rate limits
      }
    } else {
      nextDelay = withJitter(delay * 2); // Standard backoff for 5xx
    }

    await sleep(nextDelay);
    return fetchWithRetry(url, options, retries - 1, nextDelay);
  }
  return response;
}
