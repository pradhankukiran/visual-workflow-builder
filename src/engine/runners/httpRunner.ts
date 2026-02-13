import type { HttpRequestConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface HttpRunnerResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

/**
 * Execute an HTTP Request node.
 *
 * Makes a real `fetch()` request with the configured method, headers, and body.
 * Expression templates in the URL, body, and header values are resolved from the
 * execution context before the request is sent.
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
  for (const [key, value] of Object.entries(config.headers)) {
    resolvedHeaders[key] = String(context.resolveExpression(value));
  }

  // Build the abort signal: combine context signal with timeout using a manual
  // AbortController so we don't rely on AbortSignal.any() / AbortSignal.timeout()
  // which aren't available in all browsers.
  const combinedController = new AbortController();
  const timeoutMs = config.timeout > 0 ? config.timeout : 30_000;
  const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), timeoutMs);
  const onContextAbort = () => combinedController.abort(context.signal.reason);
  if (context.signal.aborted) {
    clearTimeout(timeoutId);
    combinedController.abort(context.signal.reason);
  } else {
    context.signal.addEventListener('abort', onContextAbort, { once: true });
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: config.method,
    headers: resolvedHeaders,
    signal: combinedController.signal,
  };

  // Attach body for non-GET requests
  if (config.method !== 'GET' && resolvedBody) {
    fetchOptions.body = resolvedBody;
  }

  // Handle redirect policy
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

    // Parse response headers into a plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body — try JSON first, fall back to text
    let body: unknown;
    const contentType = response.headers.get('content-type') ?? '';

    try {
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const text = await response.text();
        // Attempt JSON parse on text responses that might be JSON
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      body = null;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
      duration: Math.round(duration),
    };
  } finally {
    clearTimeout(timeoutId);
    context.signal.removeEventListener('abort', onContextAbort);
  }
}
