import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowDataKey, execRunKey, execIndexKey, execRateKey, EXEC_RUN_TTL, MAX_RUNS_PER_WORKFLOW } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
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
    if (req.method === 'POST') {
      return await handlePost(req, res);
    }
    if (req.method === 'GET') {
      return await handleGet(req, res);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  } catch (err) {
    // L2: Don't include IDs in error messages
    console.error('[api/executions] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { workflowId, triggerData } = req.body ?? {};

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
  const raw = await redis.get<string>(workflowDataKey(workflowId));
  if (raw === null) {
    // L2: Don't include ID in error response
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  const workflowData: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;

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
  const run = await executor.execute(serverWorkflow, triggerData);

  // Store result in Redis
  const pipeline = redis.pipeline();
  pipeline.set(execRunKey(run.id), JSON.stringify(run), { ex: EXEC_RUN_TTL });
  pipeline.zadd(execIndexKey(workflowId), { score: Date.now(), member: run.id });
  pipeline.zremrangebyrank(execIndexKey(workflowId), 0, -(MAX_RUNS_PER_WORKFLOW + 1));
  await pipeline.exec();

  return res.status(200).json({ data: run });
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { workflowId } = req.query;

  if (typeof workflowId !== 'string') {
    return res.status(400).json({ error: { message: 'Missing query parameter: workflowId', code: 'VALIDATION_ERROR' } });
  }

  // M4: Validate workflowId format
  if (!isValidId(workflowId)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
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
