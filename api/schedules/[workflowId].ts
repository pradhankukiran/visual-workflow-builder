import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, scheduleKey, workflowOwnerKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import { deleteSchedule } from '../_lib/qstash.js';

/**
 * GET    /api/schedules/:workflowId — Check if a schedule is active
 * DELETE /api/schedules/:workflowId — Delete an active schedule
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { workflowId } = req.query;

  if (typeof workflowId !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid workflow ID', code: 'VALIDATION_ERROR' } });
  }

  if (!isValidId(workflowId)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
  }

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

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(userId, workflowId, res);
      case 'DELETE':
        return await handleDelete(userId, workflowId, res);
      default:
        res.setHeader('Allow', 'GET, DELETE');
        return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
    }
  } catch (err) {
    console.error('[api/schedules] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, workflowId: string, res: VercelResponse) {
  // Ownership check: verify the authenticated user owns this workflow
  const owner = await redis.get<string>(workflowOwnerKey(workflowId));
  // FIX 12: Return 404 when workflow doesn't exist (owner is null), 403 for wrong owner
  if (!owner) {
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }
  if (owner !== userId) {
    return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
  }

  const scheduleId = await redis.get<string>(scheduleKey(workflowId));

  if (scheduleId) {
    return res.status(200).json({ data: { scheduleId, active: true } });
  }

  return res.status(200).json({ data: null });
}

async function handleDelete(userId: string, workflowId: string, res: VercelResponse) {
  // Ownership check: verify the authenticated user owns this workflow
  const owner = await redis.get<string>(workflowOwnerKey(workflowId));
  // FIX 12: Return 404 when workflow doesn't exist (owner is null), 403 for wrong owner
  if (!owner) {
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }
  if (owner !== userId) {
    return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
  }

  const scheduleId = await redis.get<string>(scheduleKey(workflowId));

  if (!scheduleId) {
    return res.status(200).json({ data: null });
  }

  await deleteSchedule(scheduleId);
  await redis.del(scheduleKey(workflowId));

  return res.status(200).json({ data: { id: workflowId } });
}
