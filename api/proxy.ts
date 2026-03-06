import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, proxyRateKey } from './_lib/redis.js';
import { isPrivateUrl, isPrivateRedirectTarget } from './_lib/ssrf.js';
import { authenticate, AuthError } from './_lib/auth.js';

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_BODY_SIZE = 1_048_576; // 1MB
const MAX_RESPONSE_SIZE = 5_242_880; // 5MB
const FETCH_TIMEOUT = 8_000; // ms

/** H3: Strict origin validation using exact hostname comparison. */
function isAllowedOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin ?? '';
  const host = req.headers.host ?? '';

  // Allow same-origin requests (no Origin header = same-origin)
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const originHostname = originUrl.hostname;

    // Allow localhost in development (strict equality)
    if (originHostname === 'localhost' || originHostname === '127.0.0.1') {
      return true;
    }

    // Allow if origin matches the host
    if (originUrl.host === host) return true;

    // Allow Vercel production/preview deployment (exact match)
    const allowedHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    if (allowedHost && originHostname === allowedHost) return true;
  } catch {
    // Invalid origin URL — reject
    return false;
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // FIX 8: Check origin BEFORE handling preflight so disallowed origins are rejected
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: { message: 'Forbidden origin', code: 'FORBIDDEN_ORIGIN' } });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Source');
    res.setHeader('Vary', 'Origin');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    await authenticate(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }

  // Origin validated — set CORS headers for the actual response
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Source');
  res.setHeader('Vary', 'Origin');

  try {
    // M1: Atomic rate limiting — use SET NX EX for atomic TTL, then INCR
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
    try {
      const key = proxyRateKey(ip);
      // Try to set with NX (only if not exists) and EX (TTL)
      const wasSet = await redis.set(key, 1, { ex: RATE_LIMIT_WINDOW, nx: true });
      let count: number;
      if (wasSet) {
        count = 1;
      } else {
        count = await redis.incr(key);
      }
      if (count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' } });
      }
    } catch (err) {
      console.warn('[api/proxy] Redis rate limit check failed:', err);
    }

    // Parse request
    const { url, method, headers, body, timeout } = req.body ?? {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: { message: 'Missing or invalid "url" field', code: 'INVALID_REQUEST' } });
    }

    // H2: Use shared SSRF validation
    if (isPrivateUrl(url)) {
      return res.status(400).json({ error: { message: 'Requests to private/internal addresses are not allowed', code: 'PRIVATE_ADDRESS' } });
    }

    // Validate body size
    if (body && JSON.stringify(body).length > MAX_BODY_SIZE) {
      return res.status(400).json({ error: { message: 'Request body exceeds 1MB limit', code: 'BODY_TOO_LARGE' } });
    }

    const fetchMethod = (method ?? 'GET').toUpperCase();
    const fetchHeaders: Record<string, string> = headers ?? {};
    const fetchTimeout = Math.min(timeout ?? FETCH_TIMEOUT, FETCH_TIMEOUT);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

    try {
      const fetchOptions: RequestInit = {
        method: fetchMethod,
        headers: fetchHeaders,
        signal: controller.signal,
        redirect: 'manual', // Handle redirects manually for SSRF safety
      };

      if (fetchMethod !== 'GET' && fetchMethod !== 'HEAD' && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      let response = await fetch(url, fetchOptions);

      // Validate redirect targets against SSRF before following
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          if (isPrivateRedirectTarget(location, url)) {
            return res.status(400).json({
              error: { message: 'Redirect target points to a private/internal address', code: 'PRIVATE_ADDRESS' },
            });
          }
          response = await fetch(new URL(location, url).toString(), {
            ...fetchOptions,
            redirect: 'manual',
          });
        }
      }

      // M8: Check response size before reading body — abort early to avoid buffering
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        controller.abort();
        return res.status(502).json({
          error: { message: 'Response too large (exceeds 5MB limit)', code: 'RESPONSE_TOO_LARGE' },
        });
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = response.headers.get('content-type') ?? '';

      try {
        const text = await response.text();

        // M8: Check actual response size
        if (text.length > MAX_RESPONSE_SIZE) {
          return res.status(502).json({
            error: { message: 'Response too large (exceeds 5MB limit)', code: 'RESPONSE_TOO_LARGE' },
          });
        }

        if (contentType.includes('application/json')) {
          responseBody = JSON.parse(text);
        } else {
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text;
          }
        }
      } catch {
        responseBody = null;
      }

      return res.status(200).json({
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return res.status(504).json({
          error: { message: `Proxy request timed out after ${fetchTimeout}ms`, code: 'TIMEOUT' },
        });
      }

      // L5: Sanitize error responses — log details, return generic message
      console.error('[api/proxy] Fetch error:', error);
      return res.status(502).json({
        error: { message: 'Proxy request failed', code: 'PROXY_ERROR' },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: unknown) {
    console.error('[api/proxy] Unhandled error:', error);
    return res.status(500).json({
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    });
  }
}
