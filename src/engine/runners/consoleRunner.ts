import type { ConsoleOutputConfig, WorkflowEdge } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { getDirectParents } from '../graphUtils';

export interface ConsoleRunnerResult {
  output: string;
  format: ConsoleOutputConfig['format'];
  label?: string;
}

/**
 * Collect upstream data for the console output.
 */
function collectUpstreamData(
  nodeId: string,
  context: ExecutionContext,
  edges: WorkflowEdge[],
): unknown {
  const upstreamIds = getDirectParents(nodeId, edges);

  if (upstreamIds.length === 0) {
    return null;
  }

  if (upstreamIds.length === 1) {
    return context.getNodeOutput(upstreamIds[0]);
  }

  // Multiple upstream: combine into keyed object
  const combined: Record<string, unknown> = {};
  for (const upId of upstreamIds) {
    const output = context.getNodeOutput(upId);
    if (output !== undefined) {
      combined[upId] = output;
    }
  }
  return combined;
}

/**
 * Format data as an ASCII table.
 * Handles arrays of objects, single objects, and primitive values.
 */
function formatAsTable(data: unknown): string {
  if (data === null || data === undefined) {
    return '(empty)';
  }

  // Array of objects: tabular format
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
    const keys = Array.from(
      new Set(data.flatMap((item) => (typeof item === 'object' && item !== null ? Object.keys(item) : []))),
    );

    if (keys.length === 0) {
      return JSON.stringify(data, null, 2);
    }

    // L11: Calculate column widths without Math.max(...spread) to avoid RangeError
    const colWidths = keys.map((key) => {
      let max = key.length;
      for (const item of data) {
        const val = (item as Record<string, unknown>)[key];
        const len = val !== undefined ? String(val).length : 0;
        if (len > max) max = len;
      }
      return max;
    });

    // Build header
    const header = keys.map((key, i) => key.padEnd(colWidths[i])).join(' | ');
    const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');

    // Build rows
    const rows = data.map((item) =>
      keys
        .map((key, i) => {
          const val = (item as Record<string, unknown>)[key];
          return (val !== undefined ? String(val) : '').padEnd(colWidths[i]);
        })
        .join(' | '),
    );

    return [header, separator, ...rows].join('\n');
  }

  // Single object: key-value table
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

  // Array of primitives
  if (Array.isArray(data)) {
    return data.map((item, i) => `[${i}] ${String(item)}`).join('\n');
  }

  return String(data);
}

/**
 * Execute a Console Output node.
 *
 * Formats upstream data according to the configured format and logs it.
 */
export async function runConsoleOutput(
  config: ConsoleOutputConfig,
  context: ExecutionContext,
  nodeId: string,
  edges: WorkflowEdge[] = [],
): Promise<ConsoleRunnerResult> {
  const data = collectUpstreamData(nodeId, context, edges);

  let output: string;

  switch (config.format) {
    case 'json':
      output = JSON.stringify(data, null, 2);
      break;

    case 'text':
      if (typeof data === 'object' && data !== null) {
        output = JSON.stringify(data);
      } else {
        output = String(data ?? '');
      }
      break;

    case 'table':
      output = formatAsTable(data);
      break;

    default:
      output = String(data ?? '');
  }

  // Log to actual console for debugging
  const label = config.label ? `[${config.label}]` : '[Console Output]';
  console.log(`${label}:\n${output}`);

  return {
    output,
    format: config.format,
    label: config.label,
  };
}
