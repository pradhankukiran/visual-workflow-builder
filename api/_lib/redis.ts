import { Redis } from '@upstash/redis';

/**
 * Shared Redis client for all API routes.
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 */
export const redis = Redis.fromEnv();

// ─── Key Schema ─────────────────────────────────────────────────────────────

/** Sorted set of workflow IDs for a user, scored by updatedAt epoch ms. */
export function workflowIndexKey(userId: string): string {
  return `vwb:user:${userId}:workflow:index`;
}

/** String (JSON) key for a workflow's metadata. ID must be pre-validated at route level. */
export function workflowMetaKey(userId: string, id: string): string {
  return `vwb:user:${userId}:workflow:meta:${id}`;
}

/** String (JSON) key for a full workflow document. ID must be pre-validated at route level. */
export function workflowDataKey(userId: string, id: string): string {
  return `vwb:user:${userId}:workflow:data:${id}`;
}

/** String key mapping a workflowId to its owner userId (for webhook lookups). */
export function workflowOwnerKey(workflowId: string): string {
  return `vwb:workflow:owner:${workflowId}`;
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

// ─── Version Keys ──────────────────────────────────────────────────────────

/** Sorted set of version IDs for a workflow, scored by timestamp. */
export function workflowVersionIndexKey(userId: string, workflowId: string): string {
  return `vwb:user:${userId}:workflow:versions:${workflowId}`;
}

/** String (JSON) key for a single workflow version snapshot. */
export function workflowVersionKey(userId: string, workflowId: string, versionId: string): string {
  return `vwb:user:${userId}:workflow:version:${workflowId}:${versionId}`;
}

/** Maximum number of versions stored per workflow. */
export const MAX_VERSIONS_PER_WORKFLOW = 20;

/** TTL for version data (30 days). */
export const VERSION_TTL = 2592000;

// ─── Schedule Keys ──────────────────────────────────────────────────────────

/** String key storing the QStash schedule ID for a workflow. ID must be pre-validated at route level. */
export function scheduleKey(workflowId: string): string {
  return `vwb:schedule:${workflowId}`;
}

/** Rate limit prefix for execution requests. */
export const EXEC_RATE_PREFIX = 'vwb:exec:rate:';

/** Rate limit counter for execution requests, keyed by IP. */
export function execRateKey(ip: string): string {
  return `${EXEC_RATE_PREFIX}${ip}`;
}

/** String (JSON) key for durable execution state (Upstash Workflow). */
export function durableExecStateKey(runId: string): string {
  return `vwb:exec:durable:${runId}`;
}

// ─── Credential Keys ─────────────────────────────────────────────────────────

/** String (JSON) key for a single credential. */
export function credentialKey(userId: string, id: string): string {
  return `vwb:user:${userId}:cred:${id}`;
}

/** Sorted set of credential IDs for a user, scored by creation epoch ms. */
export function credentialIndexKey(userId: string): string {
  return `vwb:user:${userId}:cred:index`;
}

/** Rate limit counter for credential requests, keyed by userId. */
export function credentialRateKey(userId: string): string {
  return `vwb:cred:rate:${userId}`;
}
