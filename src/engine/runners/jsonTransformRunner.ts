import { get } from 'lodash-es';
import type { JsonTransformConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { getDirectParents } from '../graphUtils';
import type { WorkflowEdge } from '../../types';

export interface JsonTransformResult {
  transformed: unknown;
  inputKeys: string[];
}

/**
 * Collect input data for a JSON Transform node.
 * Looks at all upstream node outputs and merges them into a single input object.
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
 * Execute a JSON Transform node.
 *
 * Applies the configured expression path and input mapping to transform
 * upstream node output data.
 *
 * - `expression`: a lodash `get()` path applied to the combined input data
 * - `inputMapping`: renames fields in the result. Keys are source paths,
 *   values are destination field names.
 *
 * The `edges` parameter is optional — when provided, upstream data is collected
 * automatically. When omitted, expression resolution uses the full context.
 */
export async function runJsonTransform(
  config: JsonTransformConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: WorkflowEdge[] = [],
): Promise<JsonTransformResult> {
  // Collect all upstream outputs as input
  const allOutputs = context.getAllOutputs();
  const upstreamData = edges.length > 0
    ? collectInputData(nodeId, context, edges)
    : allOutputs;

  // If the expression looks like a template expression, resolve it
  let result: unknown;
  if (config.expression.includes('{{')) {
    result = context.resolveExpression(config.expression);
  } else if (config.expression) {
    // Treat expression as a lodash get path against the combined input
    // First try against upstream data keyed by node ID
    result = get(upstreamData, config.expression);

    // If not found, try against the full outputs
    if (result === undefined) {
      result = get(allOutputs, config.expression);
    }
  } else {
    // No expression: pass through all upstream data
    result = upstreamData;
  }

  // Apply input mapping to rename fields
  if (
    config.inputMapping &&
    Object.keys(config.inputMapping).length > 0 &&
    result !== null &&
    typeof result === 'object'
  ) {
    const mapped: Record<string, unknown> = {};
    const source = result as Record<string, unknown>;

    for (const [sourcePath, destName] of Object.entries(config.inputMapping)) {
      const value = get(source, sourcePath);
      if (value !== undefined) {
        mapped[destName] = value;
      }
    }

    return {
      transformed: mapped,
      inputKeys: Object.keys(config.inputMapping),
    };
  }

  return {
    transformed: result,
    inputKeys: [],
  };
}
