import type { EmailConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface EmailRunnerResult {
  id: string;
  from: string;
  to: string;
  subject: string;
}

/**
 * Execute an Email node — sends an email via the Resend API.
 *
 * Expression templates in the to, from, subject, and body fields are resolved
 * from the execution context before the request is sent.
 */
export async function runEmail(
  config: EmailConfig,
  context: ExecutionContext,
): Promise<EmailRunnerResult> {
  const resolvedTo = String(context.resolveExpression(config.to));
  const resolvedFrom = String(context.resolveExpression(config.from));
  const resolvedSubject = String(context.resolveExpression(config.subject));
  const resolvedBody = String(context.resolveExpression(config.body));

  if (!config.apiKey) {
    throw new Error('Resend API key is required. Add your API key in the node configuration.');
  }

  const combinedController = new AbortController();
  const timeoutMs = 30_000;
  const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), timeoutMs);
  const onContextAbort = () => combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  if (context.signal.aborted) {
    clearTimeout(timeoutId);
    combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  } else {
    context.signal.addEventListener('abort', onContextAbort, { once: true });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolvedFrom,
        to: [resolvedTo],
        subject: resolvedSubject,
        [config.bodyType === 'html' ? 'html' : 'text']: resolvedBody,
      }),
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return { id: data.id, from: resolvedFrom, to: resolvedTo, subject: resolvedSubject };
  } finally {
    clearTimeout(timeoutId);
    context.signal.removeEventListener('abort', onContextAbort);
  }
}
