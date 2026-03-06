import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowIndexKey, workflowMetaKey, workflowDataKey, workflowOwnerKey, execIndexKey, execRunKey, scheduleKey, workflowVersionIndexKey, workflowVersionKey, MAX_VERSIONS_PER_WORKFLOW, VERSION_TTL } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import type { Workflow, WorkflowMetadata } from '../_lib/types.js';
import { upsertSchedule, deleteSchedule } from '../_lib/qstash.js';

/**
 * FIX 6: Strip plaintext API keys from node configs when a credentialId exists.
 */
function stripSensitiveFields(nodes: unknown[]): unknown[] {
  if (!Array.isArray(nodes)) return nodes;
  return nodes.map((node: any) => {
    if (node?.data?.config?.credentialId && node?.data?.config?.apiKey) {
      const { apiKey, ...restConfig } = node.data.config;
      return { ...node, data: { ...node.data, config: restConfig } };
    }
    return node;
  });
}

/**
 * FIX 10: Basic cron expression validation.
 * Accepts standard 5-field cron expressions with reasonable characters.
 */
const CRON_REGEX = /^(\S+\s+){4}\S+$/;
const CRON_FIELD_CHARS = /^[0-9*\/,\-?LW#]+$/;
function isValidCron(cron: string): boolean {
  if (!CRON_REGEX.test(cron)) return false;
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  for (const field of fields) {
    if (!CRON_FIELD_CHARS.test(field)) return false;
  }
  return true;
}

/**
 * FIX 10: Check if a cron expression runs more frequently than every minute.
 * We only need to reject if the minute field has more than one value per minute
 * (which is not possible with standard cron — every minute is the fastest).
 * But we check for second-level granularity patterns that don't belong in 5-field cron.
 */

/**
 * GET    /api/workflows/:id  — Get a single workflow
 * PUT    /api/workflows/:id  — Update a workflow
 * DELETE /api/workflows/:id  — Delete a workflow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid workflow ID', code: 'VALIDATION_ERROR' } });
  }

  // H6/M4: Validate ID format before using in Redis keys
  if (!isValidId(id)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
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

    switch (req.method) {
      case 'GET':
        return await handleGet(userId, id, res);
      case 'PUT':
        return await handlePut(userId, id, req, res);
      case 'DELETE':
        return await handleDelete(userId, id, res);
      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
    }
  } catch (err) {
    // L2: Don't include workflow ID in error messages
    console.error('[api/workflows] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, id: string, res: VercelResponse) {
  const raw = await redis.get<string>(workflowDataKey(userId, id));

  if (raw === null) {
    // L2: Don't include ID in error response
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  const workflow: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return res.status(200).json({ data: workflow });
}

async function handlePut(userId: string, id: string, req: VercelRequest, res: VercelResponse) {
  const body = req.body as Workflow | undefined;

  if (!body || !body.name) {
    return res.status(400).json({ error: { message: 'Missing required field: name', code: 'VALIDATION_ERROR' } });
  }

  // FIX 9: Workflow size limits
  if (Array.isArray(body.nodes) && body.nodes.length > 500) {
    return res.status(400).json({ error: { message: 'Workflow exceeds maximum of 500 nodes', code: 'VALIDATION_ERROR' } });
  }
  if (Array.isArray(body.edges) && body.edges.length > 2000) {
    return res.status(400).json({ error: { message: 'Workflow exceeds maximum of 2000 edges', code: 'VALIDATION_ERROR' } });
  }

  // Preserve createdAt from existing record if available
  const existingRaw = await redis.get<string>(workflowDataKey(userId, id));
  const existing: Workflow | null = existingRaw
    ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw)
    : null;

  const now = new Date().toISOString();

  // FIX 6: Strip plaintext API keys from nodes that have credentialId
  const sanitizedNodes = stripSensitiveFields(body.nodes ?? []);

  const workflow: Workflow = {
    id,
    name: body.name,
    description: body.description ?? '',
    nodes: sanitizedNodes as Workflow['nodes'],
    edges: body.edges ?? [],
    viewport: body.viewport ?? { x: 0, y: 0, zoom: 1 },
    createdAt: existing?.createdAt ?? body.createdAt ?? now,
    updatedAt: now, // Always set server-side
    tags: body.tags ?? [],
    isTemplate: body.isTemplate ?? false,
  };

  const meta: WorkflowMetadata = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    tags: workflow.tags,
    nodeCount: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
    edgeCount: Array.isArray(workflow.edges) ? workflow.edges.length : 0,
  };

  const score = new Date(workflow.updatedAt).getTime();

  // Pipeline: store data + meta + update index score + owner mapping
  const pipeline = redis.pipeline();
  pipeline.set(workflowDataKey(userId, id), JSON.stringify(workflow));
  pipeline.set(workflowMetaKey(userId, id), JSON.stringify(meta));
  pipeline.zadd(workflowIndexKey(userId), { score, member: id });
  pipeline.set(workflowOwnerKey(id), userId);
  await pipeline.exec();

  // ─── Sync QStash schedule ──────────────────────────────────────────────────
  try {
    type NodeShape = { data?: { type?: string; config?: Record<string, unknown> } };
    const scheduleTriggerNode = (workflow.nodes as NodeShape[]).find(
      (n) => n.data?.type === 'scheduleTrigger',
    );
    const existingScheduleId = await redis.get<string>(scheduleKey(id));
    const config = scheduleTriggerNode?.data?.config as
      | { cron?: string; timezone?: string; enabled?: boolean }
      | undefined;

    if (scheduleTriggerNode && config?.enabled === true) {
      // FIX 10: Validate cron expression before sending to QStash
      const cronExpr = config.cron ?? '* * * * *';
      if (!isValidCron(cronExpr)) {
        return res.status(400).json({ error: { message: 'Invalid cron expression', code: 'VALIDATION_ERROR' } });
      }

      const host =
        process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? 'localhost:3000';
      const webhookUrl = `https://${host}/api/webhooks/${id}`;
      const newScheduleId = await upsertSchedule(
        id,
        cronExpr,
        config.timezone ?? 'UTC',
        webhookUrl,
        existingScheduleId ?? undefined,
      );
      await redis.set(scheduleKey(id), newScheduleId);
    } else if (existingScheduleId) {
      await deleteSchedule(existingScheduleId);
      await redis.del(scheduleKey(id));
    }
  } catch (err) {
    // Schedule failures should NOT block the save
    console.error('[api/workflows] Failed to sync QStash schedule:', err);
  }

  // ─── Save version snapshot ────────────────────────────────────────────────
  try {
    const versionId = `ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const versionMeta = {
      versionId,
      timestamp: now,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    };

    const versionPipeline = redis.pipeline();
    // Store version data (full workflow snapshot)
    versionPipeline.set(
      workflowVersionKey(userId, id, versionId),
      JSON.stringify({ ...versionMeta, data: workflow }),
      { ex: VERSION_TTL },
    );
    // Add to version index (scored by timestamp for ordering)
    versionPipeline.zadd(workflowVersionIndexKey(userId, id), {
      score: Date.now(),
      member: versionId,
    });
    // Trim old versions (keep only MAX_VERSIONS_PER_WORKFLOW most recent)
    versionPipeline.zremrangebyrank(
      workflowVersionIndexKey(userId, id),
      0,
      -(MAX_VERSIONS_PER_WORKFLOW + 1),
    );
    await versionPipeline.exec();
  } catch (err) {
    // Version save failure should NOT block the workflow save
    console.error('[versions] Failed to save version:', err);
  }

  return res.status(200).json({ data: workflow });
}

async function handleDelete(userId: string, id: string, res: VercelResponse) {
  // M5: Check existence before deleting
  const exists = await redis.exists(workflowDataKey(userId, id));
  if (!exists) {
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  // Clean up QStash schedule if one exists
  try {
    const existingScheduleId = await redis.get<string>(scheduleKey(id));
    if (existingScheduleId) {
      await deleteSchedule(existingScheduleId);
    }
  } catch (err) {
    console.error('[api/workflows] Failed to delete QStash schedule:', err);
  }

  // L3: Clean up associated execution data
  const execRunIds = await redis.zrange<string[]>(execIndexKey(id), 0, -1);

  // Clean up version data
  const versionIds = await redis.zrange<string[]>(workflowVersionIndexKey(userId, id), 0, -1);

  const pipeline = redis.pipeline();
  pipeline.del(workflowDataKey(userId, id));
  pipeline.del(workflowMetaKey(userId, id));
  pipeline.zrem(workflowIndexKey(userId), id);
  pipeline.del(workflowOwnerKey(id));

  // Delete all execution runs and the exec index
  for (const runId of execRunIds) {
    pipeline.del(execRunKey(runId));
  }
  pipeline.del(execIndexKey(id));
  pipeline.del(scheduleKey(id));

  // Delete all version snapshots and the version index
  for (const versionId of versionIds) {
    pipeline.del(workflowVersionKey(userId, id, versionId));
  }
  pipeline.del(workflowVersionIndexKey(userId, id));

  await pipeline.exec();

  return res.status(200).json({ data: { id } });
}
