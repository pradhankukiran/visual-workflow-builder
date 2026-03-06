import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowDataKey, workflowOwnerKey, execRunKey, execIndexKey, EXEC_RUN_TTL, MAX_RUNS_PER_WORKFLOW } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import type { Workflow } from '../_lib/types.js';
import type { ServerWorkflowNode, ServerWorkflowEdge } from '../_lib/engine/types.js';
import { ServerWorkflowExecutor } from '../_lib/engine/executor.js';
import { verifyQStashSignature } from '../_lib/qstash.js';

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

  // FIX 2: Mandatory authentication — QStash signature OR webhook secret
  let authenticated = false;

  // Method 1: Verify QStash signature if present
  const qstashSignature = req.headers['upstash-signature'];
  if (qstashSignature) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const protocol = req.headers['x-forwarded-proto'] ?? 'https';
    const host = req.headers['host'] ?? '';
    const requestUrl = `${protocol}://${host}${req.url}`;
    const isValid = await verifyQStashSignature(
      Array.isArray(qstashSignature) ? qstashSignature[0] : qstashSignature,
      rawBody,
      requestUrl,
    );
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid QStash signature', code: 'UNAUTHORIZED' } });
    }
    authenticated = true;
  }

  // Method 2: Check x-webhook-secret header against per-workflow secret
  if (!authenticated) {
    const webhookSecret = req.headers['x-webhook-secret'] as string | undefined;
    if (webhookSecret) {
      // Look up workflow to check webhookSecret — we'll do a lightweight check here
      const userId = await redis.get<string>(workflowOwnerKey(workflowId));
      if (userId) {
        const raw = await redis.get<string>(workflowDataKey(userId, workflowId));
        if (raw) {
          const workflowData = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (workflowData.webhookSecret && webhookSecret === workflowData.webhookSecret) {
            authenticated = true;
          }
        }
      }
    }
  }

  if (!authenticated) {
    return res.status(401).json({ error: { message: 'Unauthorized: provide upstash-signature or x-webhook-secret header', code: 'UNAUTHORIZED' } });
  }

  // Rate limit: 30 requests per 60 seconds per IP — atomic pattern
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  const rateLimitKey = `vwb:ratelimit:webhook:${ip}`;
  try {
    const wasSet = await redis.set(rateLimitKey, 1, { ex: 60, nx: true });
    let count: number;
    if (wasSet) {
      count = 1;
    } else {
      count = await redis.incr(rateLimitKey);
    }
    if (count > 30) {
      return res.status(429).json({ error: { message: 'Too many requests', code: 'RATE_LIMITED' } });
    }
  } catch {
    // Continue on rate limit check failure
  }

  try {
    // Look up the workflow owner
    const userId = await redis.get<string>(workflowOwnerKey(workflowId));
    if (!userId) {
      return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
    }

    // Fetch workflow from Redis
    const raw = await redis.get<string>(workflowDataKey(userId, workflowId));
    if (raw === null) {
      // L2: Don't include ID in error response
      return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
    }

    const workflowData: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Cast to server engine shapes
    const nodes = workflowData.nodes as ServerWorkflowNode[];
    const edges = workflowData.edges as ServerWorkflowEdge[];

    // Verify the workflow has a webhook trigger or schedule trigger node
    const webhookNode = nodes.find((n) => n.data.type === 'webhookTrigger');
    const scheduleNode = nodes.find((n) => n.data.type === 'scheduleTrigger');
    if (!webhookNode && !scheduleNode) {
      return res.status(400).json({
        error: { message: 'Workflow does not have a webhook or schedule trigger node', code: 'NO_TRIGGER' },
      });
    }

    // Build trigger data from the incoming request
    // FIX 2: Strip sensitive headers before passing to the engine
    const SENSITIVE_HEADER_PREFIXES = ['x-vercel-', 'x-forwarded-', 'upstash-'];
    const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'x-webhook-secret']);
    const sanitizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers as Record<string, string>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_HEADERS.has(lowerKey)) continue;
      if (SENSITIVE_HEADER_PREFIXES.some(prefix => lowerKey.startsWith(prefix))) continue;
      sanitizedHeaders[key] = value;
    }

    const triggerData: Record<string, unknown> = {
      method: req.method,
      path: req.url,
      headers: sanitizedHeaders,
      body: req.body ?? {},
      query: req.query,
      timestamp: new Date().toISOString(),
      source: qstashSignature ? 'schedule' : 'webhook',
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
    executor.setUserId(userId);
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
