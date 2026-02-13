import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, WORKFLOW_INDEX_KEY, workflowMetaKey, workflowDataKey, execIndexKey, execRunKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import type { Workflow, WorkflowMetadata } from '../_lib/types.js';

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

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(id, res);
      case 'PUT':
        return await handlePut(id, req, res);
      case 'DELETE':
        return await handleDelete(id, res);
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

async function handleGet(id: string, res: VercelResponse) {
  const raw = await redis.get<string>(workflowDataKey(id));

  if (raw === null) {
    // L2: Don't include ID in error response
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  const workflow: Workflow = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return res.status(200).json({ data: workflow });
}

async function handlePut(id: string, req: VercelRequest, res: VercelResponse) {
  const body = req.body as Workflow | undefined;

  if (!body || !body.name) {
    return res.status(400).json({ error: { message: 'Missing required field: name', code: 'VALIDATION_ERROR' } });
  }

  // Preserve createdAt from existing record if available
  const existingRaw = await redis.get<string>(workflowDataKey(id));
  const existing: Workflow | null = existingRaw
    ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw)
    : null;

  const now = new Date().toISOString();

  const workflow: Workflow = {
    id,
    name: body.name,
    description: body.description ?? '',
    nodes: body.nodes ?? [],
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

  // Pipeline: store data + meta + update index score
  const pipeline = redis.pipeline();
  pipeline.set(workflowDataKey(id), JSON.stringify(workflow));
  pipeline.set(workflowMetaKey(id), JSON.stringify(meta));
  pipeline.zadd(WORKFLOW_INDEX_KEY, { score, member: id });
  await pipeline.exec();

  return res.status(200).json({ data: workflow });
}

async function handleDelete(id: string, res: VercelResponse) {
  // M5: Check existence before deleting
  const exists = await redis.exists(workflowDataKey(id));
  if (!exists) {
    return res.status(404).json({ error: { message: 'Workflow not found', code: 'NOT_FOUND' } });
  }

  // L3: Clean up associated execution data
  const execRunIds = await redis.zrange<string[]>(execIndexKey(id), 0, -1);

  const pipeline = redis.pipeline();
  pipeline.del(workflowDataKey(id));
  pipeline.del(workflowMetaKey(id));
  pipeline.zrem(WORKFLOW_INDEX_KEY, id);

  // Delete all execution runs and the exec index
  for (const runId of execRunIds) {
    pipeline.del(execRunKey(runId));
  }
  pipeline.del(execIndexKey(id));

  await pipeline.exec();

  return res.status(200).json({ data: { id } });
}
