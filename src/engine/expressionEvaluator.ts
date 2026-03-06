import { get } from 'lodash-es';
import type { ExecutionContext } from './ExecutionContext';

/**
 * Regex to match expression templates: {{nodeId.output.path}} or {{$variables.name}}
 * Non-global version for test() calls; create a new regex with /g inside functions
 * that need global matching to avoid stateful lastIndex bugs.
 */
const EXPRESSION_PATTERN = /\{\{([^}]+)\}\}/;

/**
 * Parsed reference from an expression template.
 */
export interface ExpressionReference {
  nodeId: string;
  path: string;
}

/**
 * Check if a string value contains expression template patterns.
 */
export function isExpression(value: string): boolean {
  return EXPRESSION_PATTERN.test(value);
}

/**
 * Extract all node/path references from an expression template string.
 *
 * For example, `"Hello {{node1.data.name}}, you have {{node2.count}} items"`
 * returns:
 * ```
 * [
 *   { nodeId: 'node1', path: 'data.name' },
 *   { nodeId: 'node2', path: 'count' },
 * ]
 * ```
 */
export function extractExpressionReferences(
  template: string,
): ExpressionReference[] {
  const references: ExpressionReference[] = [];
  const globalPattern = /\{\{([^}]+)\}\}/g;

  let match: RegExpExecArray | null;
  while ((match = globalPattern.exec(template)) !== null) {
    const expression = match[1].trim();
    const dotIndex = expression.indexOf('.');
    if (dotIndex === -1) {
      references.push({ nodeId: expression, path: '' });
    } else {
      references.push({
        nodeId: expression.substring(0, dotIndex),
        path: expression.substring(dotIndex + 1),
      });
    }
  }

  return references;
}

/**
 * Resolve a single expression reference against the execution context.
 *
 * Special prefixes:
 * - `$variables.name` resolves against context variables
 * - Everything else resolves against node outputs
 */
function resolveReference(
  nodeId: string,
  path: string,
  context: ExecutionContext,
): unknown {
  // $variables.name → context variable
  if (nodeId === '$variables') {
    if (path) {
      return context.getVariable(path);
    }
    return context.getAllVariables();
  }

  // Node output resolution
  const output = context.getNodeOutput(nodeId);
  if (output === undefined) {
    return undefined;
  }

  if (!path) {
    return output;
  }

  return get(output, path);
}

/**
 * Evaluate an expression template string, replacing all `{{...}}` patterns
 * with their resolved values from the execution context.
 *
 * - If the entire string is a single expression (e.g., `"{{node1.output}}"`)
 *   the raw value is returned (preserving type — objects, numbers, etc.).
 * - If the string contains mixed text and expressions, all resolved values
 *   are stringified and interpolated.
 * - If a reference cannot be resolved, the raw template `{{...}}` is left in place.
 */
export function evaluateExpression(
  template: string,
  context: ExecutionContext,
): unknown {
  // Fast path: not an expression at all
  if (!isExpression(template)) {
    return template;
  }

  // Check if the entire string is a single expression
  const trimmed = template.trim();
  const singleExprMatch = /^\{\{([^}]+)\}\}$/.exec(trimmed);

  if (singleExprMatch) {
    const expression = singleExprMatch[1].trim();
    const dotIndex = expression.indexOf('.');
    let nodeId: string;
    let path: string;

    if (dotIndex === -1) {
      nodeId = expression;
      path = '';
    } else {
      nodeId = expression.substring(0, dotIndex);
      path = expression.substring(dotIndex + 1);
    }

    const resolved = resolveReference(nodeId, path, context);
    return resolved !== undefined ? resolved : template;
  }

  // Mixed template: interpolate all expressions as strings
  const globalPattern = /\{\{([^}]+)\}\}/g;
  return template.replace(globalPattern, (_fullMatch, expression: string) => {
    const trimmedExpr = expression.trim();
    const dotIndex = trimmedExpr.indexOf('.');
    let nodeId: string;
    let path: string;

    if (dotIndex === -1) {
      nodeId = trimmedExpr;
      path = '';
    } else {
      nodeId = trimmedExpr.substring(0, dotIndex);
      path = trimmedExpr.substring(dotIndex + 1);
    }

    const resolved = resolveReference(nodeId, path, context);
    if (resolved === undefined) {
      return `{{${expression}}}`;
    }

    if (typeof resolved === 'object' && resolved !== null) {
      return JSON.stringify(resolved);
    }

    return String(resolved);
  });
}
