import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, WORKFLOW_INDEX_KEY, workflowMetaKey, workflowDataKey } from '../_lib/redis';
import type { Workflow, WorkflowMetadata } from '../_lib/types';

/**
 * GET  /api/workflows  — List all workflows (metadata only)
 * POST /api/workflows  — Create a new workflow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return await handleGet(res);
    }
    if (req.method === 'POST') {
      return await handlePost(req, res);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  } catch (err) {
    console.error('[api/workflows] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(res: VercelResponse) {
  // Get all workflow IDs from the sorted set (most recent first)
  const ids = await redis.zrange<string[]>(WORKFLOW_INDEX_KEY, 0, -1, { rev: true });

  if (ids.length === 0) {
    return res.status(200).json({ data: [] });
  }

  // Pipeline: fetch all metadata in one round-trip
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(workflowMetaKey(id));
  }
  const results = await pipeline.exec<(WorkflowMetadata | null)[]>();

  const workflows = results.filter((m): m is WorkflowMetadata => m !== null);
  return res.status(200).json({ data: workflows });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = req.body as Workflow | undefined;

  if (!body || !body.id || !body.name) {
    return res.status(400).json({ error: { message: 'Missing required fields: id, name', code: 'VALIDATION_ERROR' } });
  }

  const workflow: Workflow = {
    id: body.id,
    name: body.name,
    description: body.description ?? '',
    nodes: body.nodes ?? [],
    edges: body.edges ?? [],
    viewport: body.viewport ?? { x: 0, y: 0, zoom: 1 },
    createdAt: body.createdAt ?? new Date().toISOString(),
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

  // Pipeline: store data + meta + add to index
  const pipeline = redis.pipeline();
  pipeline.set(workflowDataKey(workflow.id), JSON.stringify(workflow));
  pipeline.set(workflowMetaKey(workflow.id), JSON.stringify(meta));
  pipeline.zadd(WORKFLOW_INDEX_KEY, { score, member: workflow.id });
  await pipeline.exec();

  return res.status(201).json({ data: workflow });
}
