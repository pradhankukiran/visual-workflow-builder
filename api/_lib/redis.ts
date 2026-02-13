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

/** String (JSON) key for a workflow's metadata. ID must be pre-validated at route level. */
export function workflowMetaKey(id: string): string {
  return `${PREFIX}:meta:${id}`;
}

/** String (JSON) key for a full workflow document. ID must be pre-validated at route level. */
export function workflowDataKey(id: string): string {
  return `${PREFIX}:data:${id}`;
}

// ─── Execution Keys ─────────────────────────────────────────────────────────

/** TTL for execution run data (7 days). */
export const EXEC_RUN_TTL = 604800;

/** Maximum number of execution runs stored per workflow. */
export const MAX_RUNS_PER_WORKFLOW = 50;

/** String (JSON) key for a single execution run. ID must be pre-validated at route level. */
export function execRunKey(runId: string): string {
  return `vwb:exec:run:${runId}`;
}

/** Sorted set of execution run IDs for a workflow, scored by timestamp. ID must be pre-validated at route level. */
export function execIndexKey(workflowId: string): string {
  return `vwb:exec:index:${workflowId}`;
}

/**
 * Rate limit counter for proxy requests, keyed by IP.
 * Note: IPs are not user-controlled IDs so no format validation needed.
 */
export function proxyRateKey(ip: string): string {
  return `vwb:proxy:rate:${ip}`;
}

/** Rate limit prefix for execution requests. */
export const EXEC_RATE_PREFIX = 'vwb:exec:rate:';

/** Rate limit counter for execution requests, keyed by IP. */
export function execRateKey(ip: string): string {
  return `${EXEC_RATE_PREFIX}${ip}`;
}
