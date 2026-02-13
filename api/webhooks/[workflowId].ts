import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowDataKey, execRunKey, execIndexKey, EXEC_RUN_TTL, MAX_RUNS_PER_WORKFLOW } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import type { Workflow } from '../_lib/types.js';
import type { ServerWorkflowNode, ServerWorkflowEdge } from '../_lib/engine/types.js';
import { ServerWorkflowExecutor } from '../_lib/engine/executor.js';

/**
 * ALL /api/webhooks/:workflowId — Webhook receiver
 *
 * Accepts any HTTP method. Finds the workflow, locates its webhook trigger
 * node, builds trigger data from the incoming request, and executes the
 * workflow on the server.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { workflowId } = req.query;

  if (typeof workflowId !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid workflow ID', code: 'VALIDATION_ERROR' } });
  }

  // M4: Validate ID format before using in Redis keys
  if (!isValidId(workflowId)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
  }

  try {
    // Fetch workflow from Redis
    const raw = await redis.get<string>(workflowDataKey(workflowId));
    if (raw === null) {
      // L2: Don't include ID in error response
      return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
    }

    const workflowData: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Cast to server engine shapes
    const nodes = workflowData.nodes as ServerWorkflowNode[];
    const edges = workflowData.edges as ServerWorkflowEdge[];

    // Verify the workflow has a webhook trigger node
    const webhookNode = nodes.find((n) => n.data.type === 'webhookTrigger');
    if (!webhookNode) {
      return res.status(400).json({
        error: { message: 'Workflow does not have a webhook trigger node', code: 'NO_WEBHOOK_TRIGGER' },
      });
    }

    // Build trigger data from the incoming request
    const triggerData: Record<string, unknown> = {
      method: req.method,
      path: req.url,
      headers: { ...(req.headers as Record<string, string>) },
      body: req.body ?? {},
      query: req.query,
      timestamp: new Date().toISOString(),
    };

    const serverWorkflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: workflowData.description,
      nodes,
      edges,
    };

    // Execute the workflow
    const executor = new ServerWorkflowExecutor();
    const run = await executor.execute(serverWorkflow, triggerData);

    // Store result in Redis
    const pipeline = redis.pipeline();
    pipeline.set(execRunKey(run.id), JSON.stringify(run), { ex: EXEC_RUN_TTL });
    pipeline.zadd(execIndexKey(workflowId), { score: Date.now(), member: run.id });
    pipeline.zremrangebyrank(execIndexKey(workflowId), 0, -(MAX_RUNS_PER_WORKFLOW + 1));
    await pipeline.exec();

    // Calculate duration
    const duration = run.completedAt
      ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      : undefined;

    return res.status(200).json({
      data: {
        executionId: run.id,
        status: run.status,
        duration,
      },
    });
  } catch (err) {
    // L2: Don't include ID in error messages
    console.error('[api/webhooks] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}
