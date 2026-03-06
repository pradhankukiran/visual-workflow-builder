import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, AuthError } from '../../_lib/auth.js';
import { redis, workflowIndexKey, workflowVersionIndexKey, workflowVersionKey, workflowDataKey, workflowMetaKey, VERSION_TTL, MAX_VERSIONS_PER_WORKFLOW } from '../../_lib/redis.js';
import { isValidId } from '../../_lib/validation.js';
import type { Workflow, WorkflowMetadata } from '../../_lib/types.js';

interface VersionRecord {
  versionId: string;
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
  data: Workflow;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !isValidId(id)) {
    return res.status(400).json({ error: { message: 'Invalid workflow ID', code: 'VALIDATION_ERROR' } });
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
      case 'POST':
        return await handlePost(userId, id, req, res);
      default:
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });
    }
  } catch (err) {
    console.error('[api/versions] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}

async function handleGet(userId: string, workflowId: string, res: VercelResponse) {
  // Fetch version IDs from sorted set (most recent first)
  const versionIds = await redis.zrange<string[]>(
    workflowVersionIndexKey(userId, workflowId),
    0,
    -1,
    { rev: true },
  );

  if (versionIds.length === 0) {
    return res.status(200).json({ data: [] });
  }

  // Pipeline fetch each version record
  const pipeline = redis.pipeline();
  for (const versionId of versionIds) {
    pipeline.get(workflowVersionKey(userId, workflowId, versionId));
  }
  const results = await pipeline.exec<(string | null)[]>();

  // Return summaries only (no full workflow data)
  const summaries: { versionId: string; timestamp: string; nodeCount: number; edgeCount: number }[] = [];
  for (const raw of results) {
    if (raw === null) continue;
    const record: VersionRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;
    summaries.push({
      versionId: record.versionId,
      timestamp: record.timestamp,
      nodeCount: record.nodeCount,
      edgeCount: record.edgeCount,
    });
  }

  return res.status(200).json({ data: summaries });
}

async function handlePost(userId: string, workflowId: string, req: VercelRequest, res: VercelResponse) {
  const { versionId } = req.body ?? {};

  if (!versionId || typeof versionId !== 'string') {
    return res.status(400).json({ error: { message: 'Missing required field: versionId', code: 'VALIDATION_ERROR' } });
  }

  // FIX 3: Validate versionId format before using in Redis key construction
  if (!isValidId(versionId)) {
    return res.status(400).json({ error: { message: 'Invalid version ID format', code: 'VALIDATION_ERROR' } });
  }

  // Fetch the requested version data
  const versionRaw = await redis.get<string>(workflowVersionKey(userId, workflowId, versionId));
  if (versionRaw === null) {
    return res.status(404).json({ error: { message: 'Version not found', code: 'NOT_FOUND' } });
  }

  const versionRecord: VersionRecord = typeof versionRaw === 'string' ? JSON.parse(versionRaw) : versionRaw;
  const restoredWorkflow = versionRecord.data;

  // Save current state as a "pre-restore" version so the restore is reversible
  const currentRaw = await redis.get<string>(workflowDataKey(userId, workflowId));
  if (currentRaw !== null) {
    const currentWorkflow: Workflow = typeof currentRaw === 'string' ? JSON.parse(currentRaw) : currentRaw;
    try {
      const preRestoreId = `ver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const preRestoreMeta = {
        versionId: preRestoreId,
        timestamp: new Date().toISOString(),
        nodeCount: Array.isArray(currentWorkflow.nodes) ? currentWorkflow.nodes.length : 0,
        edgeCount: Array.isArray(currentWorkflow.edges) ? currentWorkflow.edges.length : 0,
      };

      const preRestorePipeline = redis.pipeline();
      preRestorePipeline.set(
        workflowVersionKey(userId, workflowId, preRestoreId),
        JSON.stringify({ ...preRestoreMeta, data: currentWorkflow }),
        { ex: VERSION_TTL },
      );
      preRestorePipeline.zadd(workflowVersionIndexKey(userId, workflowId), {
        score: Date.now(),
        member: preRestoreId,
      });
      preRestorePipeline.zremrangebyrank(
        workflowVersionIndexKey(userId, workflowId),
        0,
        -(MAX_VERSIONS_PER_WORKFLOW + 1),
      );
      await preRestorePipeline.exec();
    } catch (err) {
      console.error('[versions] Failed to save pre-restore version:', err);
    }
  }

  // Overwrite workflow data and metadata with the restored version
  const now = new Date().toISOString();
  const restored: Workflow = {
    ...restoredWorkflow,
    id: workflowId,
    updatedAt: now,
  };

  const meta: WorkflowMetadata = {
    id: restored.id,
    name: restored.name,
    description: restored.description,
    createdAt: restored.createdAt,
    updatedAt: restored.updatedAt,
    tags: restored.tags,
    nodeCount: Array.isArray(restored.nodes) ? restored.nodes.length : 0,
    edgeCount: Array.isArray(restored.edges) ? restored.edges.length : 0,
  };

  const score = new Date(restored.updatedAt).getTime();
  const pipeline = redis.pipeline();
  pipeline.set(workflowDataKey(userId, workflowId), JSON.stringify(restored));
  pipeline.set(workflowMetaKey(userId, workflowId), JSON.stringify(meta));
  pipeline.zadd(workflowIndexKey(userId), { score, member: workflowId });
  await pipeline.exec();

  return res.status(200).json({ data: restored });
}
