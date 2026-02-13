import type { CodeConfig, WorkflowEdge } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { getDirectParents } from '../graphUtils';

export interface CodeRunnerResult {
  returned: unknown;
  logs: string[];
}

/**
 * Collect input data from upstream nodes for the code runner.
 */
function collectInputData(
  nodeId: string,
  context: ExecutionContext,
  edges: WorkflowEdge[],
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

/**
 * Safely stringify a value, handling circular references.
 */
function safeStringify(a: unknown): string {
  if (typeof a !== 'object' || a === null) return String(a);
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

/**
 * Run user code inside a Web Worker so synchronous infinite loops
 * can be terminated. Returns a promise with {returned, logs}.
 */
function runInWorker(
  code: string,
  input: Record<string, unknown>,
  variables: Record<string, unknown>,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<{ returned: unknown; logs: string[] }> {
  return new Promise((resolve, reject) => {
    const workerSource = `
      self.onmessage = function (e) {
        var input = e.data.input;
        var variables = e.data.variables;
        var code = e.data.code;
        var logs = [];

        function safeStr(a) {
          if (typeof a !== 'object' || a === null) return String(a);
          try { return JSON.stringify(a); } catch(ex) { return String(a); }
        }

        var customConsole = {
          log: function() { var a = Array.prototype.slice.call(arguments); logs.push(a.map(safeStr).join(' ')); },
          warn: function() { var a = Array.prototype.slice.call(arguments); logs.push('[WARN] ' + a.map(safeStr).join(' ')); },
          error: function() { var a = Array.prototype.slice.call(arguments); logs.push('[ERROR] ' + a.map(safeStr).join(' ')); },
          info: function() { var a = Array.prototype.slice.call(arguments); logs.push('[INFO] ' + a.map(safeStr).join(' ')); }
        };

        try {
          var fn = new Function('input', 'context', 'console', '"use strict";\\n' + code);
          var result = fn(input, variables, customConsole);
          if (result && typeof result === 'object' && typeof result.then === 'function') {
            result.then(function(v) {
              self.postMessage({ ok: true, returned: v, logs: logs });
            }).catch(function(err) {
              self.postMessage({ ok: false, error: err && err.message ? err.message : String(err), logs: logs });
            });
          } else {
            self.postMessage({ ok: true, returned: result, logs: logs });
          }
        } catch (err) {
          self.postMessage({ ok: false, error: err && err.message ? err.message : String(err), logs: logs });
        }
      };
    `;

    const blob = new Blob([workerSource], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
      }
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`Code execution timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const onAbort = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Code execution cancelled: workflow was aborted'));
      }
    };

    signal.addEventListener('abort', onAbort, { once: true });

    worker.onmessage = (e: MessageEvent) => {
      if (settled) return;
      settled = true;
      const data = e.data as { ok: boolean; returned?: unknown; error?: string; logs: string[] };
      cleanup();
      if (data.ok) {
        resolve({ returned: data.returned, logs: data.logs });
      } else {
        reject(new Error(data.error ?? 'Unknown error in worker'));
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(e.message ?? 'Unknown worker error'));
    };

    // Check if already aborted before posting
    if (signal.aborted) {
      settled = true;
      cleanup();
      reject(new Error('Code execution cancelled: workflow was aborted'));
      return;
    }

    worker.postMessage({ code, input, variables });
  });
}

/**
 * Fallback: run user code on the main thread with a Promise.race timeout.
 * Used when Web Workers are unavailable.
 */
function runOnMainThread(
  code: string,
  input: Record<string, unknown>,
  variables: Record<string, unknown>,
  logs: string[],
  timeoutMs: number,
  signal: AbortSignal,
): Promise<unknown> {
  // Custom console that captures output
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

  const fn = new Function(
    'input',
    'context',
    'console',
    `"use strict";
${code}`,
  );

  let settled = false;

  return Promise.race([
    Promise.resolve().then(() => fn(input, variables, customConsole)),
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Code execution timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      const onAbort = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error('Code execution cancelled: workflow was aborted'));
        }
      };

      // Check if already aborted
      if (signal.aborted) {
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error('Code execution cancelled: workflow was aborted'));
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });

      // Cleanup helper: the winning promise branch of Promise.race will resolve/reject,
      // but we need to clean up the losing branch. We do this by attaching a .then on
      // the race result from the caller side. However, since we cannot do that from
      // inside, we rely on the settled flag + the fact that the timer/listener are
      // harmless once settled.
    }),
  ]).then(
    (result) => {
      settled = true;
      return result;
    },
    (err) => {
      settled = true;
      throw err;
    },
  );
}

/**
 * Execute a Code (JavaScript) node.
 *
 * Creates a sandboxed function using the `Function` constructor and provides:
 * - `input`: upstream node outputs keyed by node ID
 * - `context`: all workflow variables
 * - `console`: a custom console object that captures log/warn/error calls
 *
 * User code runs in a Web Worker when available so that synchronous infinite
 * loops can be terminated. Falls back to main-thread execution otherwise.
 * The default timeout is 10 seconds.
 */
export async function runCode(
  config: CodeConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: WorkflowEdge[] = [],
): Promise<CodeRunnerResult> {
  const input = collectInputData(nodeId, context, edges);
  const variables = context.getAllVariables();

  // Timeout for code execution (10 seconds)
  const CODE_TIMEOUT = 10_000;

  try {
    // Prefer Web Worker for safe termination of infinite loops
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
      const { returned, logs } = await runInWorker(
        config.code,
        input,
        variables,
        CODE_TIMEOUT,
        context.signal,
      );
      return { returned, logs };
    }

    // Fallback: main-thread execution (cannot kill sync infinite loops)
    const logs: string[] = [];
    const result = await runOnMainThread(
      config.code,
      input,
      variables,
      logs,
      CODE_TIMEOUT,
      context.signal,
    );
    return { returned: result, logs };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Code execution failed: ${message}`);
  }
}
