import vm from 'node:vm';
import type {
  ServerWorkflowNode,
  ServerWorkflowEdge,
  ExecutionCallbacks,
  ExecutionLog,
  HttpRequestConfig,
  JsonTransformConfig,
  ConditionalBranchConfig,
  BranchCondition,
  DelayConfig,
  LoopConfig,
  MergeConfig,
  CodeConfig,
  ConsoleOutputConfig,
  WebhookTriggerConfig,
  ScheduleTriggerConfig,
  VariableSetConfig,
  VariableGetConfig,
} from './types';
import { ExecutionContext, isExpression, evaluateExpression } from './context';
import { getDirectParents } from './graphUtils';
import { getByPath, generateId, now } from './utils';
import { isPrivateUrl, isPrivateRedirectTarget } from '../ssrf.js';

// ─── HTTP Request Runner ────────────────────────────────────────────────────

async function runHttpRequest(
  config: HttpRequestConfig,
  context: ExecutionContext,
): Promise<unknown> {
  const resolvedUrl = String(context.resolveExpression(config.url));

  // H1: SSRF protection — block requests to private/internal addresses
  if (isPrivateUrl(resolvedUrl)) {
    throw new Error('Requests to private/internal addresses are not allowed');
  }

  const resolvedBody = config.body
    ? String(context.resolveExpression(config.body))
    : undefined;

  const resolvedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.headers)) {
    resolvedHeaders[key] = String(context.resolveExpression(value));
  }

  const combinedController = new AbortController();
  const timeoutMs = Math.min(config.timeout > 0 ? config.timeout : 30_000, 7_000);
  const timeoutId = setTimeout(() => combinedController.abort(new Error('Request timed out')), timeoutMs);
  const onContextAbort = () => combinedController.abort(context.signal.reason);
  if (context.signal.aborted) {
    clearTimeout(timeoutId);
    combinedController.abort(context.signal.reason);
  } else {
    context.signal.addEventListener('abort', onContextAbort, { once: true });
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers: resolvedHeaders,
    signal: combinedController.signal,
    redirect: 'manual', // Always handle redirects manually for SSRF safety
  };

  if (config.method !== 'GET' && resolvedBody) {
    fetchOptions.body = resolvedBody;
  }

  const startTime = Date.now();

  try {
    let response: Response;
    try {
      response = await fetch(resolvedUrl, fetchOptions);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (context.isAborted()) {
          throw new Error('HTTP request cancelled: workflow execution was aborted');
        }
        throw new Error(
          `HTTP request timed out after ${timeoutMs}ms for ${config.method} ${resolvedUrl}`,
        );
      }
      if (error instanceof TypeError) {
        throw new Error(
          `HTTP request failed: network error for ${config.method} ${resolvedUrl} — ${error.message}`,
        );
      }
      throw new Error(
        `HTTP request failed for ${config.method} ${resolvedUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Handle redirects: validate redirect target against SSRF before following
    if (config.followRedirects && response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        if (isPrivateRedirectTarget(location, resolvedUrl)) {
          throw new Error('Redirect target points to a private/internal address');
        }
        // Follow the safe redirect
        response = await fetch(new URL(location, resolvedUrl).toString(), {
          ...fetchOptions,
          redirect: 'manual',
        });
      }
    }

    const duration = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let body: unknown;
    const contentType = response.headers.get('content-type') ?? '';

    try {
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const text = await response.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      body = null;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
      duration,
    };
  } finally {
    clearTimeout(timeoutId);
    context.signal.removeEventListener('abort', onContextAbort);
  }
}

// ─── Code Runner ────────────────────────────────────────────────────────────

function collectInputData(
  nodeId: string,
  context: ExecutionContext,
  edges: ServerWorkflowEdge[],
): Record<string, unknown> {
  const inputData: Record<string, unknown> = {};
  const upstreamIds = getDirectParents(nodeId, edges);

  for (const upId of upstreamIds) {
    const output = context.getNodeOutput(upId);
    if (output !== undefined) {
      inputData[upId] = output;
    }
  }

  return inputData;
}

function safeStringify(a: unknown): string {
  if (typeof a !== 'object' || a === null) return String(a);
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

/**
 * Deep-freeze an object so user code cannot mutate input/context.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

async function runCode(
  config: CodeConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: ServerWorkflowEdge[],
): Promise<unknown> {
  const input = collectInputData(nodeId, context, edges);
  const variables = context.getAllVariables();
  const CODE_TIMEOUT = 5_000;
  const logs: string[] = [];

  const customConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(safeStringify).join(' '));
    },
    warn: (...args: unknown[]) => {
      logs.push(`[WARN] ${args.map(safeStringify).join(' ')}`);
    },
    error: (...args: unknown[]) => {
      logs.push(`[ERROR] ${args.map(safeStringify).join(' ')}`);
    },
    info: (...args: unknown[]) => {
      logs.push(`[INFO] ${args.map(safeStringify).join(' ')}`);
    },
  };

  try {
    // C1+C2: Use vm.runInNewContext instead of new Function() for proper sandboxing.
    // Build a minimal sandbox with only safe globals.
    const sandbox: Record<string, unknown> = {
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      Error,
      TypeError,
      RangeError,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      Promise,
      undefined,
      NaN,
      Infinity,
      input: deepFreeze(structuredClone(input)),
      context: deepFreeze(structuredClone(variables)),
      console: customConsole,
    };

    // Wrap user code in an async IIFE so return statements and await work
    const wrappedCode = `(async function() { ${config.code} })()`;
    const script = new vm.Script(wrappedCode, { filename: 'user-code.js' });

    // Run with V8-level timeout (kills sync infinite loops)
    const resultPromise = script.runInNewContext(sandbox, { timeout: CODE_TIMEOUT });

    // For async code, add a secondary Promise.race timeout
    let settled = false;
    const result = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error(`Code execution timed out after ${CODE_TIMEOUT}ms`));
          }
        }, CODE_TIMEOUT);
      }),
    ]);
    settled = true;

    return { returned: result, logs };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Code execution failed: ${message}`);
  }
}

// ─── Conditional Runner ─────────────────────────────────────────────────────

function resolveFieldValue(field: string, context: ExecutionContext): unknown {
  if (field.includes('{{')) {
    return context.resolveExpression(field);
  }
  const allOutputs = context.getAllOutputs();
  return getByPath(allOutputs, field);
}

function evaluateCondition(
  condition: BranchCondition,
  context: ExecutionContext,
): { field: string; operator: string; expectedValue: string; actualValue: unknown; result: boolean } {
  const actualValue = resolveFieldValue(condition.field, context);
  const expectedValue = condition.value;
  let result = false;

  switch (condition.operator) {
    case 'eq': {
      const strActual = typeof actualValue === 'object' && actualValue !== null
        ? JSON.stringify(actualValue) : String(actualValue);
      result = strActual === expectedValue;
      break;
    }
    case 'neq': {
      const strActual = typeof actualValue === 'object' && actualValue !== null
        ? JSON.stringify(actualValue) : String(actualValue);
      result = strActual !== expectedValue;
      break;
    }
    case 'gt': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      break;
    }
    case 'lt': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      break;
    }
    case 'gte': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
      break;
    }
    case 'lte': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
      break;
    }
    case 'contains':
      result = String(actualValue).includes(expectedValue);
      break;
    case 'startsWith':
      result = String(actualValue).startsWith(expectedValue);
      break;
    case 'endsWith':
      result = String(actualValue).endsWith(expectedValue);
      break;
    case 'matches': {
      try {
        // H8: ReDoS protection — cap pattern and input length
        if (expectedValue.length > 200 || String(actualValue).length > 10_000) {
          result = false;
        } else {
          const regex = new RegExp(expectedValue);
          result = regex.test(String(actualValue));
        }
      } catch {
        result = false;
      }
      break;
    }
    case 'exists':
      result = actualValue !== undefined && actualValue !== null;
      break;
    case 'notExists':
      result = actualValue === undefined || actualValue === null;
      break;
    default:
      result = false;
  }

  return { field: condition.field, operator: condition.operator, expectedValue, actualValue, result };
}

async function runConditional(
  config: ConditionalBranchConfig,
  context: ExecutionContext,
): Promise<unknown> {
  if (config.conditions.length === 0) {
    return { result: true, evaluatedConditions: [] };
  }

  const evaluatedConditions = config.conditions.map((c) => evaluateCondition(c, context));

  let combinedResult = evaluatedConditions[0].result;
  for (let i = 1; i < config.conditions.length; i++) {
    const logicalOp = config.conditions[i].logicalOp;
    const conditionResult = evaluatedConditions[i].result;
    if (logicalOp === 'and') {
      combinedResult = combinedResult && conditionResult;
    } else {
      combinedResult = combinedResult || conditionResult;
    }
  }

  return { result: combinedResult, evaluatedConditions };
}

// ─── Delay Runner ───────────────────────────────────────────────────────────

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Delay cancelled: workflow execution was aborted'));
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new Error('Delay cancelled: workflow execution was aborted'));
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function runDelay(
  config: DelayConfig,
  context: ExecutionContext,
): Promise<unknown> {
  let actualDuration: number;

  if (config.type === 'random') {
    const min = config.duration;
    const max = config.maxDuration ?? config.duration * 2;
    actualDuration = Math.floor(Math.random() * (max - min + 1)) + min;
  } else {
    actualDuration = config.duration;
  }

  // Cap at 5s for Vercel timeout budget
  actualDuration = Math.max(0, Math.min(actualDuration, 5000));

  if (actualDuration > 0) {
    await abortableDelay(actualDuration, context.signal);
  }

  return { delayed: actualDuration, type: config.type };
}

// ─── Loop Runner ────────────────────────────────────────────────────────────

function shouldBreak(breakCondition: string, context: ExecutionContext): boolean {
  if (!breakCondition) return false;

  const resolved = isExpression(breakCondition)
    ? evaluateExpression(breakCondition, context)
    : breakCondition;

  if (typeof resolved === 'boolean') return resolved;
  if (typeof resolved === 'string') return resolved.toLowerCase() === 'true';
  if (typeof resolved === 'number') return resolved !== 0;
  return Boolean(resolved);
}

function resolveLoopArray(loopOver: string, context: ExecutionContext): unknown[] | null {
  if (!loopOver) return null;

  let resolved: unknown;
  if (isExpression(loopOver)) {
    resolved = evaluateExpression(loopOver, context);
  } else {
    resolved = getByPath(context.getAllOutputs(), loopOver);
  }

  return Array.isArray(resolved) ? resolved : null;
}

async function runLoop(
  config: LoopConfig,
  context: ExecutionContext,
): Promise<unknown> {
  const results: unknown[] = [];
  // M9: Cap iterations to prevent excessive server usage
  const maxIter = Math.min(Math.max(1, config.maxIterations), 1000);

  if (config.loopOver) {
    const items = resolveLoopArray(config.loopOver, context);

    if (items !== null) {
      const limit = Math.min(items.length, maxIter);

      for (let i = 0; i < limit; i++) {
        if (context.isAborted()) {
          return { iterations: i, results, breakReason: 'aborted' };
        }

        context.setVariable('$loopIndex', i);
        context.setVariable('$loopItem', items[i]);
        context.setVariable('$loopCount', results.length);

        if (config.breakCondition && shouldBreak(config.breakCondition, context)) {
          return { iterations: i, results, breakReason: 'breakCondition' };
        }

        results.push(items[i]);
      }

      const breakReason = items.length <= maxIter ? 'endOfArray' : 'maxIterations';
      return { iterations: results.length, results, breakReason };
    }
  }

  for (let i = 0; i < maxIter; i++) {
    if (context.isAborted()) {
      return { iterations: i, results, breakReason: 'aborted' };
    }

    context.setVariable('$loopIndex', i);
    context.setVariable('$loopItem', undefined);
    context.setVariable('$loopCount', results.length);

    if (config.breakCondition && shouldBreak(config.breakCondition, context)) {
      return { iterations: i, results, breakReason: 'breakCondition' };
    }

    results.push({ index: i, iteration: i + 1 });
  }

  return { iterations: results.length, results, breakReason: 'maxIterations' };
}

// ─── Merge Runner ───────────────────────────────────────────────────────────

function collectUpstreamOutputs(
  nodeId: string,
  context: ExecutionContext,
  edges: ServerWorkflowEdge[],
): unknown[] {
  const upstreamIds = getDirectParents(nodeId, edges);
  const outputs: unknown[] = [];

  for (const upId of upstreamIds) {
    const output = context.getNodeOutput(upId);
    if (output !== undefined) {
      outputs.push(output);
    }
  }

  return outputs;
}

async function runMerge(
  config: MergeConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: ServerWorkflowEdge[],
): Promise<unknown> {
  const upstreamOutputs = collectUpstreamOutputs(nodeId, context, edges);
  let merged: unknown;

  switch (config.strategy) {
    case 'waitAll':
      merged = upstreamOutputs;
      break;
    case 'waitAny':
      merged = upstreamOutputs.find((o) => o !== null && o !== undefined) ?? null;
      break;
    case 'combineArrays': {
      const combined: unknown[] = [];
      for (const output of upstreamOutputs) {
        if (Array.isArray(output)) {
          combined.push(...output);
        } else if (output !== null && output !== undefined) {
          combined.push(output);
        }
      }
      merged = combined;
      break;
    }
    default:
      merged = upstreamOutputs;
  }

  return { merged, strategy: config.strategy, sourceCount: upstreamOutputs.length };
}

// ─── JSON Transform Runner ─────────────────────────────────────────────────

async function runJsonTransform(
  config: JsonTransformConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: ServerWorkflowEdge[],
): Promise<unknown> {
  const allOutputs = context.getAllOutputs();
  const upstreamData = edges.length > 0
    ? collectInputData(nodeId, context, edges)
    : allOutputs;

  let result: unknown;
  if (config.expression.includes('{{')) {
    result = context.resolveExpression(config.expression);
  } else if (config.expression) {
    result = getByPath(upstreamData, config.expression);
    if (result === undefined) {
      result = getByPath(allOutputs, config.expression);
    }
  } else {
    result = upstreamData;
  }

  if (
    config.inputMapping &&
    Object.keys(config.inputMapping).length > 0 &&
    result !== null &&
    typeof result === 'object'
  ) {
    const mapped: Record<string, unknown> = {};
    const source = result as Record<string, unknown>;

    for (const [sourcePath, destName] of Object.entries(config.inputMapping)) {
      const value = getByPath(source, sourcePath);
      if (value !== undefined) {
        mapped[destName] = value;
      }
    }

    return { transformed: mapped, inputKeys: Object.keys(config.inputMapping) };
  }

  return { transformed: result, inputKeys: [] };
}

// ─── Console Output Runner ──────────────────────────────────────────────────

function formatAsTable(data: unknown): string {
  if (data === null || data === undefined) return '(empty)';

  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
    const keys = Array.from(
      new Set(data.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : []))),
    );
    if (keys.length === 0) return JSON.stringify(data, null, 2);

    // L11: Avoid Math.max(...spread) which can throw RangeError on large arrays
    const colWidths = keys.map((key) => {
      let max = key.length;
      for (const item of data) {
        const val = (item as Record<string, unknown>)[key];
        const len = val !== undefined ? String(val).length : 0;
        if (len > max) max = len;
      }
      return max;
    });

    const header = keys.map((key, i) => key.padEnd(colWidths[i])).join(' | ');
    const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
    const rows = data.map((item) =>
      keys.map((key, i) => {
        const val = (item as Record<string, unknown>)[key];
        return (val !== undefined ? String(val) : '').padEnd(colWidths[i]);
      }).join(' | '),
    );

    return [header, separator, ...rows].join('\n');
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return '(empty object)';
    let maxKeyLen = 0;
    for (const [k] of entries) {
      if (k.length > maxKeyLen) maxKeyLen = k.length;
    }
    return entries
      .map(([key, value]) => `${key.padEnd(maxKeyLen)} | ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join('\n');
  }

  if (Array.isArray(data)) {
    return data.map((item, i) => `[${i}] ${String(item)}`).join('\n');
  }

  return String(data);
}

function collectConsoleData(
  nodeId: string,
  context: ExecutionContext,
  edges: ServerWorkflowEdge[],
): unknown {
  const upstreamIds = getDirectParents(nodeId, edges);

  if (upstreamIds.length === 0) return null;
  if (upstreamIds.length === 1) return context.getNodeOutput(upstreamIds[0]);

  const combined: Record<string, unknown> = {};
  for (const upId of upstreamIds) {
    const output = context.getNodeOutput(upId);
    if (output !== undefined) {
      combined[upId] = output;
    }
  }
  return combined;
}

async function runConsoleOutput(
  config: ConsoleOutputConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: ServerWorkflowEdge[],
): Promise<unknown> {
  const data = collectConsoleData(nodeId, context, edges);
  let output: string;

  switch (config.format) {
    case 'json':
      output = JSON.stringify(data, null, 2);
      break;
    case 'text':
      output = typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data ?? '');
      break;
    case 'table':
      output = formatAsTable(data);
      break;
    default:
      output = String(data ?? '');
  }

  const label = config.label ? `[${config.label}]` : '[Console Output]';
  console.log(`${label}:\n${output}`);

  return { output, format: config.format, label: config.label };
}

// ─── Webhook Trigger Runner ─────────────────────────────────────────────────

async function runWebhookTrigger(
  config: WebhookTriggerConfig,
  context: ExecutionContext,
): Promise<unknown> {
  // Real implementation: read trigger data from context variable
  const webhookPayload = context.getVariable('$webhookPayload');
  if (webhookPayload && typeof webhookPayload === 'object') {
    return {
      ...(webhookPayload as Record<string, unknown>),
      triggered: true,
    };
  }

  // Fallback: simulated data (same as client)
  return {
    method: config.method,
    path: config.path,
    headers: { ...config.headers },
    body: {},
    timestamp: new Date().toISOString(),
    triggered: true,
  };
}

// ─── Schedule Trigger Runner ────────────────────────────────────────────────

async function runScheduleTrigger(
  config: ScheduleTriggerConfig,
  _context: ExecutionContext,
): Promise<unknown> {
  return {
    cron: config.cron,
    timezone: config.timezone,
    enabled: config.enabled,
    triggeredAt: new Date().toISOString(),
    triggered: true,
  };
}

// ─── Variable Set Runner ────────────────────────────────────────────────────

async function runVariableSet(
  config: VariableSetConfig,
  context: ExecutionContext,
): Promise<unknown> {
  let resolvedValue: unknown;

  if (isExpression(config.value)) {
    resolvedValue = context.resolveExpression(config.value);
  } else {
    try {
      resolvedValue = JSON.parse(config.value);
    } catch {
      resolvedValue = config.value;
    }
  }

  context.setVariable(config.variableName, resolvedValue);

  return { variable: config.variableName, value: resolvedValue };
}

// ─── Variable Get Runner ────────────────────────────────────────────────────

async function runVariableGet(
  config: VariableGetConfig,
  context: ExecutionContext,
): Promise<unknown> {
  const stored = context.getVariable(config.variableName);

  if (stored !== undefined) {
    return { variable: config.variableName, value: stored, usedDefault: false };
  }

  let defaultValue: unknown = config.defaultValue;
  if (typeof config.defaultValue === 'string') {
    try {
      defaultValue = JSON.parse(config.defaultValue);
    } catch {
      defaultValue = config.defaultValue;
    }
  }

  return { variable: config.variableName, value: defaultValue ?? null, usedDefault: true };
}

// ─── Node Dispatcher ────────────────────────────────────────────────────────

/**
 * Dispatch execution to the correct runner based on node type.
 * Wraps execution with timing, logging, and uniform error handling.
 */
export async function runNode(
  node: ServerWorkflowNode,
  context: ExecutionContext,
  callbacks: Partial<ExecutionCallbacks>,
  edges: ServerWorkflowEdge[] = [],
): Promise<unknown> {
  const nodeType = node.data.type;
  const config = node.data.config;

  const logMessage = (level: ExecutionLog['level'], message: string, data?: unknown) => {
    if (callbacks.onLog) {
      callbacks.onLog({
        id: generateId('log'),
        timestamp: now(),
        nodeId: node.id,
        level,
        message,
        data,
      });
    }
  };

  logMessage('debug', `Starting execution of ${nodeType} node "${node.data.label}"`);

  const startTime = Date.now();

  try {
    let output: unknown;

    switch (nodeType) {
      case 'httpRequest':
        output = await runHttpRequest(config as HttpRequestConfig, context);
        break;
      case 'jsonTransform':
        output = await runJsonTransform(config as JsonTransformConfig, context, node.id, edges);
        break;
      case 'conditionalBranch':
        output = await runConditional(config as ConditionalBranchConfig, context);
        break;
      case 'delay':
        output = await runDelay(config as DelayConfig, context);
        break;
      case 'loop':
        output = await runLoop(config as LoopConfig, context);
        break;
      case 'merge':
        output = await runMerge(config as MergeConfig, context, node.id, edges);
        break;
      case 'code':
        output = await runCode(config as CodeConfig, context, node.id, edges);
        break;
      case 'consoleOutput':
        output = await runConsoleOutput(config as ConsoleOutputConfig, context, node.id, edges);
        break;
      case 'webhookTrigger':
        output = await runWebhookTrigger(config as WebhookTriggerConfig, context);
        break;
      case 'scheduleTrigger':
        output = await runScheduleTrigger(config as ScheduleTriggerConfig, context);
        break;
      case 'variableSet':
        output = await runVariableSet(config as VariableSetConfig, context);
        break;
      case 'variableGet':
        output = await runVariableGet(config as VariableGetConfig, context);
        break;
      default: {
        const exhaustiveCheck: never = nodeType;
        throw new Error(`Unknown node type: ${exhaustiveCheck}`);
      }
    }

    const duration = Date.now() - startTime;
    logMessage('info', `Node "${node.data.label}" completed in ${duration}ms`, { duration });

    return output;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logMessage('error', `Node "${node.data.label}" failed after ${duration}ms: ${errorMessage}`, {
      duration,
      error: errorMessage,
    });

    throw error;
  }
}
