import type { LlmConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface LlmRunnerResult {
  response: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  provider: string;
}

/**
 * Call the Anthropic Messages API.
 */
async function callAnthropic(
  config: LlmConfig,
  resolvedSystemPrompt: string,
  resolvedUserPrompt: string,
  context: ExecutionContext,
): Promise<LlmRunnerResult> {
  const combinedController = new AbortController();
  const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), 30_000);
  const onContextAbort = () => combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  if (context.signal.aborted) {
    clearTimeout(timeoutId);
    combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  } else {
    context.signal.addEventListener('abort', onContextAbort, { once: true });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: resolvedSystemPrompt || undefined,
        messages: [{ role: 'user', content: resolvedUserPrompt }],
      }),
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(
        errorData?.error?.message ?? `Anthropic API request failed with status ${response.status}`,
      );
    }

    const data = await response.json() as {
      content: { text: string }[];
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    if (!data.content || data.content.length === 0) {
      throw new Error('Anthropic API returned an empty response (no content)');
    }

    return {
      response: data.content[0].text,
      model: data.model,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
      provider: 'anthropic',
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (context.isAborted()) {
        throw new Error('LLM request cancelled: workflow execution was aborted');
      }
      throw new Error('LLM request to Anthropic timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    context.signal.removeEventListener('abort', onContextAbort);
  }
}

/**
 * Call the OpenAI Chat Completions API.
 */
async function callOpenAI(
  config: LlmConfig,
  resolvedSystemPrompt: string,
  resolvedUserPrompt: string,
  context: ExecutionContext,
): Promise<LlmRunnerResult> {
  const combinedController = new AbortController();
  const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), 30_000);
  const onContextAbort = () => combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  if (context.signal.aborted) {
    clearTimeout(timeoutId);
    combinedController.abort(context.signal.reason ?? new Error('Workflow cancelled'));
  } else {
    context.signal.addEventListener('abort', onContextAbort, { once: true });
  }

  const messages: { role: string; content: string }[] = [];
  if (resolvedSystemPrompt) {
    messages.push({ role: 'system', content: resolvedSystemPrompt });
  }
  messages.push({ role: 'user', content: resolvedUserPrompt });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages,
      }),
      signal: combinedController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(
        errorData?.error?.message ?? `OpenAI API request failed with status ${response.status}`,
      );
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenAI API returned an empty response (no choices)');
    }

    return {
      response: data.choices[0].message.content,
      model: data.model,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
      provider: 'openai',
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (context.isAborted()) {
        throw new Error('LLM request cancelled: workflow execution was aborted');
      }
      throw new Error('LLM request to OpenAI timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    context.signal.removeEventListener('abort', onContextAbort);
  }
}

/**
 * Execute an LLM node — dispatches to the configured provider (Anthropic or OpenAI).
 *
 * Expression templates in the system and user prompts are resolved from the
 * execution context before the request is sent.
 */
export async function runLlm(
  config: LlmConfig,
  context: ExecutionContext,
): Promise<LlmRunnerResult> {
  const resolvedUserPrompt = String(context.resolveExpression(config.userPrompt));
  const resolvedSystemPrompt = config.systemPrompt
    ? String(context.resolveExpression(config.systemPrompt))
    : '';

  if (!config.apiKey) {
    throw new Error('LLM API key is required. Add your API key in the node configuration.');
  }

  if (config.provider === 'anthropic') {
    return callAnthropic(config, resolvedSystemPrompt, resolvedUserPrompt, context);
  } else {
    return callOpenAI(config, resolvedSystemPrompt, resolvedUserPrompt, context);
  }
}
