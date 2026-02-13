import type { ScheduleTriggerConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface ScheduleRunnerResult {
  cron: string;
  timezone: string;
  enabled: boolean;
  triggeredAt: string;
  triggered: true;
}

/**
 * Execute a Schedule Trigger node.
 *
 * This is a trigger node — it produces the initial data that kicks off
 * a workflow execution. In a real production system this would be fired
 * by a cron scheduler. For the client-side execution engine, it returns
 * simulated schedule trigger data.
 */
export async function runScheduleTrigger(
  config: ScheduleTriggerConfig,
  _context: ExecutionContext,
): Promise<ScheduleRunnerResult> {
  return {
    cron: config.cron,
    timezone: config.timezone,
    enabled: config.enabled,
    triggeredAt: new Date().toISOString(),
    triggered: true,
  };
}
