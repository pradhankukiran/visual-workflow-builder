import type { DelayConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface DelayRunnerResult {
  delayed: number;
  type: 'fixed' | 'random';
}

/**
 * Create a delay that respects the abort signal.
 * Resolves with true on normal completion, throws on abort.
 */
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

/**
 * Execute a Delay node.
 *
 * - `fixed` type: waits exactly `duration` milliseconds.
 * - `random` type: waits a random duration between `duration` and `maxDuration` ms.
 *
 * The delay respects the abort signal so it can be cancelled mid-wait.
 */
export async function runDelay(
  config: DelayConfig,
  context: ExecutionContext,
): Promise<DelayRunnerResult> {
  let actualDuration: number;

  if (config.type === 'random') {
    const min = config.duration;
    const max = config.maxDuration ?? config.duration * 2;
    actualDuration = Math.floor(Math.random() * (max - min + 1)) + min;
  } else {
    actualDuration = config.duration;
  }

  // Ensure non-negative
  actualDuration = Math.max(0, actualDuration);

  if (actualDuration > 0) {
    await abortableDelay(actualDuration, context.signal);
  }

  return {
    delayed: actualDuration,
    type: config.type,
  };
}
