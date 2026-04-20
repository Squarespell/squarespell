/**
 * fetchWithRetry - wraps fetch with exponential backoff.
 *
 * Retries on network errors and 5xx responses.
 * Does NOT retry 4xx (client errors) since those won't self-heal.
 *
 * Usage:
 *   var data = await fetchWithRetry('/api/quizzes', { headers: { Authorization: 'Bearer ...' } });
 */

var DEFAULT_RETRIES = 3;
var BASE_DELAY_MS = 1000;

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: { retries?: number; baseDelay?: number }
): Promise<Response> {
  var maxRetries = (options && options.retries != null) ? options.retries : DEFAULT_RETRIES;
  var baseDelay = (options && options.baseDelay != null) ? options.baseDelay : BASE_DELAY_MS;

  var lastError: Error | null = null;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      var response = await fetch(url, init);

      // Don't retry client errors (4xx) - they won't self-heal
      if (response.status < 500) {
        return response;
      }

      // 5xx - worth retrying
      if (attempt < maxRetries) {
        var delay = baseDelay * Math.pow(2, attempt);
        // Add jitter: 0.5x to 1.5x
        delay = delay * (0.5 + Math.random());
        await new Promise(function(resolve) { setTimeout(resolve, delay); });
        continue;
      }

      // Final attempt, return whatever we got
      return response;
    } catch (err: any) {
      lastError = err;

      // Network error - retry if we have attempts left
      if (attempt < maxRetries) {
        var netDelay = baseDelay * Math.pow(2, attempt);
        netDelay = netDelay * (0.5 + Math.random());
        await new Promise(function(resolve) { setTimeout(resolve, netDelay); });
        continue;
      }
    }
  }

  // All retries exhausted with network errors
  throw lastError || new Error('fetchWithRetry: all retries exhausted');
}
