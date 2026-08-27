import { apiClient } from '../api-client';

/**
 * Feste Modellversionen — bewusst KEINE `-latest`-Kennungen.
 * 🏛️
 *
 * Hinter `mistral-medium-latest` kann der Anbieter jederzeit ein anderes Modell
 * legen. Fuer ein Bewertungssystem ist das zweifach untragbar: Eine gemessene
 * Genauigkeit ist am Tag darauf womoeglich wertlos, und das Protokoll benennt
 * dann ein Modell, das so nie geantwortet hat. Art. 13 Abs. 3 lit. c verlangt
 * ausserdem, vorab bestimmte Aenderungen zu beschreiben — was bei einem
 * beweglichen Ziel nicht geht.
 *
 * Die Zuordnung wurde am 27.08.2026 gegen `GET /v1/models/<alias>` ermittelt
 * (Feld `aliases`) und jede Zielversion mit einem echten Aufruf geprueft:
 *
 *   mistral-ocr-latest    -> mistral-ocr-4-1      (POST /v1/ocr, HTTP 200)
 *   mistral-large-latest  -> mistral-large-2512   (HTTP 200)
 *   mistral-small-latest  -> mistral-small-2603   (HTTP 200)
 *   mistral-medium-latest -> mistral-medium-2604  (HTTP 200)
 *
 * WARTUNG: Feste Versionen werden vom Anbieter irgendwann abgekuendigt. Das ist
 * der Preis dafuer, den Wechsel selbst zu bestimmen statt ihn zu erleiden. Vor
 * einem Wechsel gehoert die neue Version gemessen, nicht nur eingetragen —
 * sonst ist die Zahl in der Betriebsanleitung wieder unbelegt. Das Feld
 * `deprecation` der Modell-Abfrage zeigt eine Abkuendigung an.
 */
export const MISTRAL_OCR_MODEL = 'mistral-ocr-4-1';
export const MISTRAL_CORE_MODEL = 'mistral-large-2512';
export const MISTRAL_UTILS_MODEL = 'mistral-small-2603';
export const MISTRAL_CHATS_MODEL = 'mistral-large-2512'; // Hardened: Using flagship instead of pixtral for better instruction following
export const MISTRAL_MEDIUM_MODEL = 'mistral-medium-2604'; // math-optimiertes Modell, traegt die Korrektur

export const DEFAULT_OPENAI_COMPATIBLE_BASE_URL = 'https://llm.aihosting.mittwald.de/v1';

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
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 300s (5 min) timeout per request
  const fetchOptions = { ...options, signal: options.signal || controller.signal };
  
  let response;
  try {
    response = await apiClient.fetch(url, fetchOptions);
  } catch (err) {
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
