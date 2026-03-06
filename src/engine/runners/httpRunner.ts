import type { HttpRequestConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { withRetry, isRetryableHttpError, isRetryableStatusCode } from '../retry';

/** Symbol to tag errors that carry an HTTP result (retryable status codes). */
const HTTP_RESULT_ERROR = Symbol('HttpResultError');

interface HttpResultError extends Error {
  [HTTP_RESULT_ERROR]: true;
  result: HttpRunnerResult;
}

function createHttpResultError(message: string, result: HttpRunnerResult): HttpResultError {
  const err = new Error(message) as HttpResultError;
  err[HTTP_RESULT_ERROR] = true;
  err.result = result;
  return err;
}

function isHttpResultError(error: unknown): error is HttpResultError {
  return typeof error === 'object' && error !== null && HTTP_RESULT_ERROR in error;
}

export interface HttpRunnerResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

/**
 * Check if a URL points to a different origin than the current page.
 */
function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/**
 * Route a cross-origin request through the server-side proxy to bypass CORS.
 */
async function fetchViaProxy(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeout: number,
  signal: AbortSignal,
  followRedirects?: boolean,
): Promise<HttpRunnerResult> {
  const startTime = performance.now();

  const proxyResponse = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Client-Source': 'visual-workflow-builder' },
    body: JSON.stringify({ url, method, headers, body, timeout, followRedirects }),
    signal,
  });

  const duration = performance.now() - startTime;

  if (!proxyResponse.ok) {
    const errorData = await proxyResponse.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(
      errorData?.error?.message ?? `Proxy request failed with status ${proxyResponse.status}`,
    );
  }

  const result = await proxyResponse.json() as {
    data: { status: number; statusText: string; headers: Record<string, string>; body: unknown };
  };

  return {
    status: result.data.status,
    statusText: result.data.statusText,
    headers: result.data.headers,
    body: result.data.body,
    duration: Math.round(duration),
  };
}

/**
 * Execute an HTTP Request node.
 *
 * Makes a real `fetch()` request with the configured method, headers, and body.
 * Expression templates in the URL, body, and header values are resolved from the
 * execution context before the request is sent.
 *
 * Cross-origin requests are routed through `/api/proxy` to bypass CORS.
 */
export async function runHttpRequest(
  config: HttpRequestConfig,
  context: ExecutionContext,
): Promise<HttpRunnerResult> {
  // Resolve expression templates in config values
  const resolvedUrl = String(context.resolveExpression(config.url));
  const resolvedBody = config.body
    ? String(context.resolveExpression(config.body))
    : undefined;

  const resolvedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.headers ?? {})) {
    resolvedHeaders[key] = String(context.resolveExpression(value));
  }

  const timeoutMs = config.timeout > 0 ? config.timeout : 30_000;

  // Wrap the entire fetch logic (both cross-origin and same-origin) in a
  // helper so it can be retried via withRetry.
  const doFetch = async (): Promise<HttpRunnerResult> => {
    // Route cross-origin requests through server-side proxy
    if (isCrossOrigin(resolvedUrl)) {
      const combinedController = new AbortController();
      const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), timeoutMs);
      const onContextAbort = () => combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
      if (context.signal.aborted) {
        clearTimeout(timeoutId);
        combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
      } else {
        context.signal.addEventListener('abort', onContextAbort, { once: true });
      }

      try {
        const result = await fetchViaProxy(
          resolvedUrl,
          config.method,
          resolvedHeaders,
          config.method !== 'GET' ? resolvedBody : undefined,
          timeoutMs,
          combinedController.signal,
          config.followRedirects,
        );

        // If retries are enabled and this is a retryable status, throw to trigger retry
        if (config.retry?.enabled && isRetryableStatusCode(result.status)) {
          throw createHttpResultError(`HTTP ${result.status}: ${result.statusText}`, result);
        }

        return result;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (context.isAborted()) {
            throw new Error('HTTP request cancelled: workflow execution was aborted');
          }
          throw new Error(
            `HTTP request timed out after ${timeoutMs}ms for ${config.method} ${resolvedUrl}`,
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        context.signal.removeEventListener('abort', onContextAbort);
      }
    }

    // Same-origin: direct fetch
    const combinedController = new AbortController();
    const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), timeoutMs);
    const onContextAbort = () => combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
    if (context.signal.aborted) {
      clearTimeout(timeoutId);
      combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
    } else {
      context.signal.addEventListener('abort', onContextAbort, { once: true });
    }

    const fetchOptions: RequestInit = {
      method: config.method,
      headers: resolvedHeaders,
      signal: combinedController.signal,
    };

    if (config.method !== 'GET' && resolvedBody) {
      fetchOptions.body = resolvedBody;
    }

    if (!config.followRedirects) {
      fetchOptions.redirect = 'manual';
    }

    const startTime = performance.now();

    try {
      let response: Response;
      try {
        response = await fetch(resolvedUrl, fetchOptions);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (context.isAborted()) {
            throw new Error('HTTP request cancelled: workflow execution was aborted');
          }
          throw new Error(
            `HTTP request timed out after ${timeoutMs}ms for ${config.method} ${resolvedUrl}`,
          );
        }

        if (error instanceof TypeError) {
          throw new Error(
            `HTTP request failed: network error for ${config.method} ${resolvedUrl} — ${error.message}`,
          );
        }

        throw new Error(
          `HTTP request failed for ${config.method} ${resolvedUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const duration = performance.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body: unknown;
      const contentType = response.headers.get('content-type') ?? '';

      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          const text = await response.text();
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
      } catch {
        body = null;
      }

      const result: HttpRunnerResult = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        duration: Math.round(duration),
      };

      // If retries are enabled and this is a retryable status, throw to trigger retry
      if (config.retry?.enabled && isRetryableStatusCode(response.status)) {
        throw createHttpResultError(`HTTP ${response.status}: ${response.statusText}`, result);
      }

      return result;
    } finally {
      clearTimeout(timeoutId);
      context.signal.removeEventListener('abort', onContextAbort);
    }
  };

  try {
    return await withRetry(
      doFetch,
      config.retry,
      (error) => isRetryableHttpError(error) || isHttpResultError(error),
      undefined,
      () => context.isAborted(),
    );
  } catch (error: unknown) {
    // If the last retry still got a response, return it instead of throwing
    if (isHttpResultError(error)) return error.result;
    throw error;
  }
}
