import { Redis } from '@upstash/redis';

/**
 * Shared Redis client for all API routes.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 */
export const redis = Redis.fromEnv();

// ─── Key Schema ─────────────────────────────────────────────────────────────

const PREFIX = 'vwb:workflow';

/** Sorted set of workflow IDs scored by updatedAt epoch ms. */
export const WORKFLOW_INDEX_KEY = `${PREFIX}:index`;

/** String (JSON) key for a workflow's metadata. */
export function workflowMetaKey(id: string): string {
  return `${PREFIX}:meta:${id}`;
}

/** String (JSON) key for a full workflow document. */
export function workflowDataKey(id: string): string {
  return `${PREFIX}:data:${id}`;
}
