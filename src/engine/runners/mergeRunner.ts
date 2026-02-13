import type { MergeConfig, WorkflowEdge } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { getDirectParents } from '../graphUtils';

export interface MergeRunnerResult {
  merged: unknown;
  strategy: MergeConfig['strategy'];
  sourceCount: number;
}

/**
 * Collect all upstream node outputs for a merge node.
 */
function collectUpstreamOutputs(
  nodeId: string,
  context: ExecutionContext,
  edges: WorkflowEdge[],
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

/**
 * Execute a Merge node.
 *
 * Strategies:
 * - `waitAll`: collects all upstream outputs into an array.
 * - `waitAny`: returns the first non-null/non-undefined upstream output.
 * - `combineArrays`: concatenates all upstream outputs that are arrays.
 *   Non-array outputs are wrapped in single-element arrays.
 */
export async function runMerge(
  config: MergeConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: WorkflowEdge[] = [],
): Promise<MergeRunnerResult> {
  const upstreamOutputs = collectUpstreamOutputs(nodeId, context, edges);

  let merged: unknown;

  switch (config.strategy) {
    case 'waitAll': {
      merged = upstreamOutputs;
      break;
    }

    case 'waitAny': {
      merged =
        upstreamOutputs.find(
          (output) => output !== null && output !== undefined,
        ) ?? null;
      break;
    }

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

    default: {
      merged = upstreamOutputs;
    }
  }

  return {
    merged,
    strategy: config.strategy,
    sourceCount: upstreamOutputs.length,
  };
}
