import type { RetryConfig } from '../types';

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig | undefined,
  isRetryable: (error: unknown) => boolean,
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void,
  abortCheck?: () => boolean,
): Promise<T> {
  if (!config?.enabled) return fn();

  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === config.maxRetries || !isRetryable(error) || abortCheck?.()) {
        throw error;
      }
      const MAX_DELAY_MS = 30_000;
      const delay = Math.min(config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt), MAX_DELAY_MS);
      onRetry?.(attempt + 1, error, delay);
      if (abortCheck?.()) {
        throw error;
      }
      await new Promise<void>((resolve, reject) => {
        if (abortCheck?.()) {
          reject(new Error('Retry aborted'));
          return;
        }
        const timer = setTimeout(() => {
          clearInterval(poll);
          resolve();
        }, delay);
        const poll = setInterval(() => {
          if (abortCheck?.()) {
            clearTimeout(timer);
            clearInterval(poll);
            reject(new Error('Retry aborted'));
          }
        }, 250);
      });
    }
  }
  throw lastError;
}

export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof Error) {
    // AbortError means cancellation, not a transient failure — never retry
    if (error.name === 'AbortError') return false;
    // Network/timeout errors
    if (error.name === 'TypeError') return true;
    if (error.message.includes('fetch') || error.message.includes('network')) return true;
  }
  return false;
}

export function isRetryableStatusCode(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}
