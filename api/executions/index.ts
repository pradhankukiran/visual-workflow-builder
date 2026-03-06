import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowDataKey, workflowOwnerKey, execRunKey, execIndexKey, execRateKey, EXEC_RUN_TTL, MAX_RUNS_PER_WORKFLOW } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import type { Workflow } from '../_lib/types.js';
import type { ServerWorkflowNode, ServerWorkflowEdge, ExecutionRun, ExecutionRunSummary } from '../_lib/engine/types.js';
import { ServerWorkflowExecutor } from '../_lib/engine/executor.js';

const EXEC_RATE_LIMIT_MAX = 20;
const EXEC_RATE_LIMIT_WINDOW = 60; // seconds

/**
 * POST /api/executions  — Trigger a server-side workflow execution
 * GET  /api/executions  — List execution history for a workflow
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

    if (req.method === 'POST') {
      return await handlePost(userId, req, res);
    }
    if (req.method === 'GET') {
      return await handleGet(userId, req, res);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  } catch (err) {
    // L2: Don't include IDs in error messages
    console.error('[api/executions] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handlePost(userId: string, req: VercelRequest, res: VercelResponse) {
  const { workflowId, triggerData, mode = 'quick' } = req.body ?? {};

  if (!workflowId || typeof workflowId !== 'string') {
    return res.status(400).json({ error: { message: 'Missing required field: workflowId', code: 'VALIDATION_ERROR' } });
  }

  // M4: Validate workflowId format
  if (!isValidId(workflowId)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
  }

  // M6: Rate limiting for execution requests
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const key = execRateKey(ip);
    const wasSet = await redis.set(key, 1, { ex: EXEC_RATE_LIMIT_WINDOW, nx: true });
    let count: number;
    if (wasSet) {
      count = 1;
    } else {
      count = await redis.incr(key);
    }
    if (count > EXEC_RATE_LIMIT_MAX) {
      return res.status(429).json({ error: { message: 'Rate limit exceeded', code: 'RATE_LIMITED' } });
    }
  } catch (err) {
    console.warn('[api/executions] Redis rate limit check failed:', err);
  }

  // Fetch workflow from Redis
  const raw = await redis.get<string>(workflowDataKey(userId, workflowId));
  if (raw === null) {
    // L2: Don't include ID in error response
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  const workflowData: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Durable mode: trigger Upstash Workflow for long-running execution
  if (mode === 'durable') {
    const { generateId } = await import('../_lib/engine/utils.js');
    const runId = generateId('exec');
    const run: ExecutionRun = {
      id: runId,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      nodeStatuses: {},
      logs: [],
    };
    await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
    await redis.zadd(execIndexKey(workflowId), { score: Date.now(), member: runId });

    // Trigger the durable workflow via QStash
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:3000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';

    const { Client } = await import('@upstash/qstash');
    const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
    await qstash.publishJSON({
      url: `${protocol}://${baseUrl}/api/workflow-run/${workflowId}`,
      body: { workflowId, runId, userId, triggerData },
    });

    return res.status(202).json({ data: run });
  }

  // Quick mode (default): execute synchronously within the request
  // Cast to server engine shapes
  const serverWorkflow = {
    id: workflowData.id,
    name: workflowData.name,
    description: workflowData.description,
    nodes: workflowData.nodes as ServerWorkflowNode[],
    edges: workflowData.edges as ServerWorkflowEdge[],
  };

  // Execute on server
  const executor = new ServerWorkflowExecutor();
  executor.setUserId(userId);
  const run = await executor.execute(serverWorkflow, triggerData);

  // Store result in Redis
  const pipeline = redis.pipeline();
  pipeline.set(execRunKey(run.id), JSON.stringify(run), { ex: EXEC_RUN_TTL });
  pipeline.zadd(execIndexKey(workflowId), { score: Date.now(), member: run.id });
  pipeline.zremrangebyrank(execIndexKey(workflowId), 0, -(MAX_RUNS_PER_WORKFLOW + 1));
  await pipeline.exec();

  return res.status(200).json({ data: run });
}

async function handleGet(userId: string, req: VercelRequest, res: VercelResponse) {
  const { workflowId } = req.query;

  if (typeof workflowId !== 'string') {
    return res.status(400).json({ error: { message: 'Missing query parameter: workflowId', code: 'VALIDATION_ERROR' } });
  }

  // M4: Validate workflowId format
  if (!isValidId(workflowId)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
  }

  // Ownership check: verify the authenticated user owns this workflow
  const owner = await redis.get<string>(workflowOwnerKey(workflowId));
  // FIX 12: Return 404 when workflow doesn't exist (owner is null), 403 for wrong owner
  if (!owner) {
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }
  if (owner !== userId) {
    return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
  }

  // Get latest 20 run IDs (most recent first)
  const runIds = await redis.zrange<string[]>(execIndexKey(workflowId), 0, 19, { rev: true });

  if (runIds.length === 0) {
    return res.status(200).json({ data: [] });
  }

  // Pipeline: fetch all runs
  const pipeline = redis.pipeline();
  for (const runId of runIds) {
    pipeline.get(execRunKey(runId));
  }
  const results = await pipeline.exec<(string | null)[]>();

  // Build lightweight summaries (strip node outputs)
  const summaries: ExecutionRunSummary[] = [];
  for (const raw of results) {
    if (raw === null) continue;
    const run: ExecutionRun = typeof raw === 'string' ? JSON.parse(raw) : raw;
    summaries.push({
      id: run.id,
      workflowId: run.workflowId,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      error: run.error,
      nodeCount: Object.keys(run.nodeStatuses).length,
    });
  }

  return res.status(200).json({ data: summaries });
}
