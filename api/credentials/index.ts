import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, credentialKey, credentialIndexKey, credentialRateKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import { encrypt } from '../_lib/crypto.js';
import { randomUUID } from 'crypto';

const CRED_RATE_LIMIT_MAX = 30;
const CRED_RATE_LIMIT_WINDOW = 60; // seconds

/**
 * GET  /api/credentials  — List user's credentials (metadata only)
 * POST /api/credentials  — Create a new credential
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let userId: string;
    try {
      const auth = await authenticate(req);
      userId = auth.userId;
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
      }
      throw err;
    }

    // FIX 5: Rate limiting — 30 requests per 60 seconds per userId
    try {
      const key = credentialRateKey(userId);
      const wasSet = await redis.set(key, 1, { ex: CRED_RATE_LIMIT_WINDOW, nx: true });
      let count: number;
      if (wasSet) {
        count = 1;
      } else {
        count = await redis.incr(key);
      }
      if (count > CRED_RATE_LIMIT_MAX) {
        return res.status(429).json({ error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' } });
      }
    } catch (err) {
      console.warn('[api/credentials] Redis rate limit check failed:', err);
    }

    if (req.method === 'GET') {
      return await handleGet(userId, res);
    }
    if (req.method === 'POST') {
      return await handlePost(userId, req, res);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  } catch (err) {
    console.error('[api/credentials] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, res: VercelResponse) {
  // Get credential IDs from sorted set (most recent first, limit 50)
  const ids = await redis.zrange<string[]>(credentialIndexKey(userId), 0, 49, { rev: true });

  if (ids.length === 0) {
    return res.status(200).json({ data: [] });
  }

  // Pipeline: fetch all credential records
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(credentialKey(userId, id));
  }
  const results = await pipeline.exec<(string | null)[]>();

  const credentials = results
    .filter((raw): raw is string => raw !== null)
    .map((raw) => {
      const cred = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // Return metadata only — no encrypted value
      return { id: cred.id, name: cred.name, type: cred.type, createdAt: cred.createdAt };
    });

  return res.status(200).json({ data: credentials });
}

async function handlePost(userId: string, req: VercelRequest, res: VercelResponse) {
  const { name, type, value } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: { message: 'Missing required field: name', code: 'VALIDATION_ERROR' } });
  }
  if (!type || !['api-key', 'bearer-token'].includes(type)) {
    return res.status(400).json({ error: { message: 'Invalid type. Must be "api-key" or "bearer-token"', code: 'VALIDATION_ERROR' } });
  }
  if (!value || typeof value !== 'string') {
    return res.status(400).json({ error: { message: 'Missing required field: value', code: 'VALIDATION_ERROR' } });
  }
  if (name.length > 255) {
    return res.status(400).json({ error: { message: 'Credential name must be 255 characters or less', code: 'VALIDATION_ERROR' } });
  }
  if (value.length > 10240) {
    return res.status(400).json({ error: { message: 'Credential value must be 10KB or less', code: 'VALIDATION_ERROR' } });
  }

  // Generate credential ID
  const id = `cred_${randomUUID().replace(/-/g, '').slice(0, 21)}`;
  const createdAt = new Date().toISOString();

  // Encrypt the value
  const encryptedValue = encrypt(value);

  // Store credential
  const credRecord = { id, name, type, encryptedValue, createdAt };
  const pipeline = redis.pipeline();
  pipeline.set(credentialKey(userId, id), JSON.stringify(credRecord));
  pipeline.zadd(credentialIndexKey(userId), { score: Date.now(), member: id });
  await pipeline.exec();

  // Return metadata only — no encrypted value
  return res.status(201).json({ data: { id, name, type, createdAt } });
}
