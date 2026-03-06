import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, workflowIndexKey, workflowMetaKey, workflowDataKey, workflowOwnerKey } from '../_lib/redis.js';
import { isValidId } from '../_lib/validation.js';
import { authenticate, AuthError } from '../_lib/auth.js';
import type { Workflow, WorkflowMetadata } from '../_lib/types.js';

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
 * GET  /api/workflows  — List all workflows (metadata only)
 * POST /api/workflows  — Create a new workflow
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

    if (req.method === 'GET') {
      return await handleGet(userId, res);
    }
    if (req.method === 'POST') {
      return await handlePost(userId, req, res);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
  } catch (err) {
    console.error('[api/workflows] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, res: VercelResponse) {
  // Get all workflow IDs from the sorted set (most recent first)
  const ids = await redis.zrange<string[]>(workflowIndexKey(userId), 0, -1, { rev: true });

  if (ids.length === 0) {
    return res.status(200).json({ data: [] });
  }

  // Pipeline: fetch all metadata in one round-trip
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(workflowMetaKey(userId, id));
  }
  const results = await pipeline.exec<(WorkflowMetadata | null)[]>();

  const workflows = results.filter((m): m is WorkflowMetadata => m !== null);
  return res.status(200).json({ data: workflows });
}

async function handlePost(userId: string, req: VercelRequest, res: VercelResponse) {
  const body = req.body as Workflow | undefined;

  if (!body || !body.id || !body.name) {
    return res.status(400).json({ error: { message: 'Missing required fields: id, name', code: 'VALIDATION_ERROR' } });
  }

  if (typeof body.name !== 'string' || body.name.length > 255) {
    return res.status(400).json({ error: { message: 'Workflow name must be a string with max 255 characters', code: 'VALIDATION_ERROR' } });
  }

  // H6: Validate ID format
  if (!isValidId(body.id)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
  }

  // FIX 9: Workflow size limits
  if (Array.isArray(body.nodes) && body.nodes.length > 500) {
    return res.status(400).json({ error: { message: 'Workflow exceeds maximum of 500 nodes', code: 'VALIDATION_ERROR' } });
  }
  if (Array.isArray(body.edges) && body.edges.length > 2000) {
    return res.status(400).json({ error: { message: 'Workflow exceeds maximum of 2000 edges', code: 'VALIDATION_ERROR' } });
  }

  // M3: Check for duplicate ID
  const exists = await redis.exists(workflowDataKey(userId, body.id));
  if (exists) {
    return res.status(409).json({ error: { message: 'Workflow with this ID already exists', code: 'DUPLICATE' } });
  }

  // FIX 6: Strip plaintext API keys from nodes that have credentialId
  const sanitizedNodes = stripSensitiveFields(body.nodes ?? []);

  const now = new Date().toISOString();

  const workflow: Workflow = {
    id: body.id,
    name: body.name,
    description: body.description ?? '',
    nodes: sanitizedNodes as Workflow['nodes'],
    edges: body.edges ?? [],
    viewport: body.viewport ?? { x: 0, y: 0, zoom: 1 },
    createdAt: now, // Always set server-side
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

  // Pipeline: store data + meta + add to index
  const pipeline = redis.pipeline();
  pipeline.set(workflowDataKey(userId, workflow.id), JSON.stringify(workflow));
  pipeline.set(workflowMetaKey(userId, workflow.id), JSON.stringify(meta));
  pipeline.zadd(workflowIndexKey(userId), { score, member: workflow.id });
  pipeline.set(workflowOwnerKey(workflow.id), userId);
  await pipeline.exec();

  return res.status(201).json({ data: workflow });
}
