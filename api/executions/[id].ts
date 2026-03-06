import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, execRunKey, workflowOwnerKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import type { ExecutionRun } from '../_lib/engine/types.js';

/**
 * GET /api/executions/:id  — Get a full execution run with all outputs and logs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let userId: string;
  try {
    const auth = await authenticate(req);
    userId = auth.userId;
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid execution ID', code: 'VALIDATION_ERROR' } });
  }

  // M4: Validate ID format before using in Redis keys
  if (!isValidId(id)) {
    return res.status(400).json({ error: { message: 'Invalid execution ID format', code: 'VALIDATION_ERROR' } });
  }

  try {
    const raw = await redis.get<string>(execRunKey(id));

    if (raw === null) {
      // L2: Don't include ID in error response
      return res.status(404).json({ error: { message: 'Execution not found', code: 'NOT_FOUND' } });
    }

    const run: ExecutionRun = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Ownership check: verify the authenticated user owns this workflow
    const owner = await redis.get<string>(workflowOwnerKey(run.workflowId));
    if (owner !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    }

    return res.status(200).json({ data: run });
  } catch (err) {
    console.error('[api/executions] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}
