import { get } from 'lodash-es';
import type { LoopConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { isExpression, evaluateExpression } from '../expressionEvaluator';

export interface LoopRunnerResult {
  iterations: number;
  results: unknown[];
  breakReason?: 'maxIterations' | 'breakCondition' | 'endOfArray' | 'aborted';
}

/**
 * Evaluate the break condition. Returns true if the loop should stop.
 */
function shouldBreak(breakCondition: string, context: ExecutionContext): boolean {
  if (!breakCondition) return false;

  const resolved = isExpression(breakCondition)
    ? evaluateExpression(breakCondition, context)
    : breakCondition;

  // Truthy check: "true", true, or non-empty/non-zero
  if (typeof resolved === 'boolean') return resolved;
  if (typeof resolved === 'string') return resolved.toLowerCase() === 'true';
  if (typeof resolved === 'number') return resolved !== 0;
  return Boolean(resolved);
}

/**
 * Resolve the array to iterate over from the loopOver expression.
 */
function resolveLoopArray(loopOver: string, context: ExecutionContext): unknown[] | null {
  if (!loopOver) return null;

  let resolved: unknown;

  if (isExpression(loopOver)) {
    resolved = evaluateExpression(loopOver, context);
  } else {
    // Treat as a path against all outputs
    resolved = get(context.getAllOutputs(), loopOver);
  }

  if (Array.isArray(resolved)) {
    return resolved;
  }

  return null;
}

/**
 * Execute a Loop node.
 *
 * Two modes:
 * 1. **Array iteration**: if `loopOver` is set and resolves to an array,
 *    iterate over each item (up to `maxIterations`).
 * 2. **Counter loop**: loop `maxIterations` times.
 *
 * In both modes:
 * - The `breakCondition` is checked before each iteration.
 * - The abort signal is checked each iteration.
 * - Each iteration's item (or index) is stored as the loop output.
 */
export async function runLoop(
  config: LoopConfig,
  context: ExecutionContext,
): Promise<LoopRunnerResult> {
  const results: unknown[] = [];
  const maxIter = Math.min(Math.max(1, config.maxIterations), 10_000);

  // Mode 1: iterate over an array
  if (config.loopOver) {
    const items = resolveLoopArray(config.loopOver, context);

    if (items !== null) {
      const limit = Math.min(items.length, maxIter);

      for (let i = 0; i < limit; i++) {
        // Check abort
        if (context.isAborted()) {
          return { iterations: i, results, breakReason: 'aborted' };
        }

        // M18: Yield to event loop periodically to avoid blocking UI
        if (i > 0 && i % 100 === 0) {
          await new Promise<void>((r) => setTimeout(r, 0));
        }

        // Update context variables so breakCondition can observe iteration state
        context.setVariable('$loopIndex', i);
        context.setVariable('$loopItem', items[i]);
        context.setVariable('$loopCount', results.length);

        // Check break condition
        if (config.breakCondition && shouldBreak(config.breakCondition, context)) {
          return { iterations: i, results, breakReason: 'breakCondition' };
        }

        results.push(items[i]);
      }

      const breakReason = items.length <= maxIter ? 'endOfArray' : 'maxIterations';
      return { iterations: results.length, results, breakReason };
    }
  }

  // Mode 2: counter loop
  for (let i = 0; i < maxIter; i++) {
    // Check abort
    if (context.isAborted()) {
      return { iterations: i, results, breakReason: 'aborted' };
    }

    // M18: Yield to event loop periodically to avoid blocking UI
    if (i > 0 && i % 100 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    // Update context variables so breakCondition can observe iteration state
    context.setVariable('$loopIndex', i);
    context.setVariable('$loopItem', undefined);
    context.setVariable('$loopCount', results.length);

    // Check break condition
    if (config.breakCondition && shouldBreak(config.breakCondition, context)) {
      return { iterations: i, results, breakReason: 'breakCondition' };
    }

    results.push({ index: i, iteration: i + 1 });
  }

  return { iterations: results.length, results, breakReason: 'maxIterations' };
}
