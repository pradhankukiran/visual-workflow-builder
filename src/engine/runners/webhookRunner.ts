import type { WebhookTriggerConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { now } from '../../utils/dateUtils';

export interface WebhookRunnerResult {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, string>;
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
  const testData = config.testData;

  let body: Record<string, unknown> = {};
  if (testData?.body) {
    try {
      body = JSON.parse(testData.body);
    } catch {
      body = { raw: testData.body };
    }
  }

  return {
    method: testData?.method ?? config.method,
    path: config.path,
    headers: testData?.headers ?? { ...config.headers },
    body,
    query: testData?.queryParams ?? {},
    timestamp: now(),
    triggered: true,
  };
}
