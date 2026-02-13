import type { WebhookTriggerConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface WebhookRunnerResult {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  timestamp: string;
  triggered: true;
}

/**
 * Execute a Webhook Trigger node.
 *
 * This is a trigger node — it produces the initial data that kicks off
 * a workflow execution. In a real production system this would listen
 * for incoming HTTP requests on the specified path. For the client-side
 * execution engine, it returns simulated webhook data.
 */
export async function runWebhookTrigger(
  config: WebhookTriggerConfig,
  _context: ExecutionContext,
): Promise<WebhookRunnerResult> {
  return {
    method: config.method,
    path: config.path,
    headers: { ...config.headers },
    body: {},
    timestamp: new Date().toISOString(),
    triggered: true,
  };
}
