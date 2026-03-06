import { Client, Receiver } from '@upstash/qstash';

/**
 * Lazily create a QStash client, validating the env var at call time
 * rather than at module load (which would break imports when env is missing).
 */
function getQStashClient(): Client {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error('QSTASH_TOKEN environment variable is not set');
  return new Client({ token });
}

/**
 * Create or update a QStash schedule for a workflow.
 * If `existingScheduleId` is provided, the existing schedule is updated in-place.
 * Returns the schedule ID.
 */
export async function upsertSchedule(
  workflowId: string,
  cron: string,
  timezone: string,
  webhookUrl: string,
  existingScheduleId?: string,
): Promise<string> {
  const client = getQStashClient();
  const opts: Parameters<typeof client.schedules.create>[0] = {
    destination: webhookUrl,
    cron,
    headers: {
      'Content-Type': 'application/json',
      'X-Workflow-Id': workflowId,
    },
    body: JSON.stringify({ source: 'qstash', workflowId }),
  };

  if (existingScheduleId) {
    opts.scheduleId = existingScheduleId;
  }

  const result = await client.schedules.create(opts);
  return result.scheduleId;
}

/**
 * Delete a QStash schedule by ID.
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const client = getQStashClient();
  await client.schedules.delete(scheduleId);
}

/**
 * Verify a QStash webhook signature.
 * Uses QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY from env.
 * Returns true if valid, false otherwise.
 */
export async function verifyQStashSignature(
  signature: string,
  body: string,
  url: string,
): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    throw new Error('QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY environment variables are required');
  }
  const receiver = new Receiver({ currentSigningKey, nextSigningKey });

  try {
    await receiver.verify({ signature, body, url });
    return true;
  } catch {
    return false;
  }
}
