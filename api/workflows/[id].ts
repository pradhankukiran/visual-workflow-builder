import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, WORKFLOW_INDEX_KEY, workflowMetaKey, workflowDataKey } from '../_lib/redis';
import type { Workflow, WorkflowMetadata } from '../_lib/types';

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
    console.error(`[api/workflows/${id}] Unhandled error:`, err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(id: string, res: VercelResponse) {
  const raw = await redis.get<string>(workflowDataKey(id));

  if (raw === null) {
    return res.status(404).json({ error: { message: `Workflow "${id}" not found`, code: 'NOT_FOUND' } });
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

  const workflow: Workflow = {
    id,
    name: body.name,
    description: body.description ?? '',
    nodes: body.nodes ?? [],
    edges: body.edges ?? [],
    viewport: body.viewport ?? { x: 0, y: 0, zoom: 1 },
    createdAt: existing?.createdAt ?? body.createdAt ?? new Date().toISOString(),
    updatedAt: body.updatedAt ?? new Date().toISOString(),
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
  // Pipeline: delete data + meta + remove from index
  const pipeline = redis.pipeline();
  pipeline.del(workflowDataKey(id));
  pipeline.del(workflowMetaKey(id));
  pipeline.zrem(WORKFLOW_INDEX_KEY, id);
  await pipeline.exec();

  return res.status(200).json({ data: { id } });
}
