import { redis, durableExecStateKey } from '../redis.js';

export interface DurableState {
  nodeOutputs: Record<string, unknown>;
  variables: Record<string, unknown>;
  skippedNodes: string[];
}

export async function saveDurableState(runId: string, state: DurableState): Promise<void> {
  await redis.set(durableExecStateKey(runId), JSON.stringify(state), { ex: 86400 }); // 24h TTL
}

export async function loadDurableState(runId: string): Promise<DurableState | null> {
  try {
    const state = await redis.get<DurableState>(durableExecStateKey(runId));
    if (!state) return null;
    return state;
  } catch {
    return null;
  }
}
