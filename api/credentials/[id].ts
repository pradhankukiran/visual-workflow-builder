import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, credentialKey, credentialIndexKey, credentialRateKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';

const CRED_RATE_LIMIT_MAX = 30;
const CRED_RATE_LIMIT_WINDOW = 60; // seconds

/**
 * GET    /api/credentials/:id — Get single credential metadata
 * DELETE /api/credentials/:id — Delete a credential
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid credential ID', code: 'VALIDATION_ERROR' } });
  }

  if (!isValidId(id)) {
    return res.status(400).json({ error: { message: 'Invalid credential ID format', code: 'VALIDATION_ERROR' } });
  }

  // FIX 4: Wrap entire handler body (including auth) in a single try/catch
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

    switch (req.method) {
      case 'GET':
        return await handleGet(userId, id, res);
      case 'DELETE':
        return await handleDelete(userId, id, res);
      default:
        res.setHeader('Allow', 'GET, DELETE');
        return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
    }
  } catch (err) {
    console.error('[api/credentials] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, id: string, res: VercelResponse) {
  const raw = await redis.get<string>(credentialKey(userId, id));

  if (raw === null) {
    return res.status(404).json({ error: { message: 'Credential not found', code: 'NOT_FOUND' } });
  }

  const cred = typeof raw === 'string' ? JSON.parse(raw) : raw;
  // Return metadata only — no decrypted value
  return res.status(200).json({ data: { id: cred.id, name: cred.name, type: cred.type, createdAt: cred.createdAt } });
}

async function handleDelete(userId: string, id: string, res: VercelResponse) {
  const exists = await redis.exists(credentialKey(userId, id));
  if (!exists) {
    return res.status(404).json({ error: { message: 'Credential not found', code: 'NOT_FOUND' } });
  }

  const pipeline = redis.pipeline();
  pipeline.del(credentialKey(userId, id));
  pipeline.zrem(credentialIndexKey(userId), id);
  await pipeline.exec();

  return res.status(200).json({ data: { id } });
}
