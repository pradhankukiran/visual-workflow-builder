import { getByPath } from './utils';

/**
 * Regex to match expression templates: {{nodeId.output.path}} or {{$variables.name}}
 * Non-global version for simple tests; create new RegExp with /g for stateful iteration.
 */
const EXPRESSION_PATTERN = /\{\{([^}]+)\}\}/;

/**
 * Check if a string value contains expression template patterns.
 */
export function isExpression(value: string): boolean {
  return EXPRESSION_PATTERN.test(value);
}

/**
 * Shared execution context for the server engine.
 *
 * Holds node outputs, variables, and provides expression resolution
 * and abort signal access. Combines ExecutionContext + expressionEvaluator
 * from the client engine.
 */
export class ExecutionContext {
  private nodeOutputs: Map<string, unknown> = new Map();
  private variables: Map<string, unknown> = new Map();
  private abortController: AbortController;
  private userId?: string;

  constructor(abortController: AbortController) {
    this.abortController = abortController;
  }

  // ─── User Context ───────────────────────────────────────────────────────────

  setUserId(id: string): void {
    this.userId = id;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  // ─── Node Outputs ──────────────────────────────────────────────────────────

  setNodeOutput(nodeId: string, output: unknown): void {
    this.nodeOutputs.set(nodeId, output);
  }

  getNodeOutput(nodeId: string): unknown | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  getAllOutputs(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    for (const [key, value] of this.nodeOutputs) {
      outputs[key] = value;
    }
    return outputs;
  }

  // ─── Variables ─────────────────────────────────────────────────────────────

  setVariable(name: string, value: unknown): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): unknown | undefined {
    return this.variables.get(name);
  }

  getAllVariables(): Record<string, unknown> {
    const vars: Record<string, unknown> = {};
    for (const [key, value] of this.variables) {
      vars[key] = value;
    }
    return vars;
  }

  // ─── Expression Resolution ─────────────────────────────────────────────────

  /**
   * Resolve a template string containing `{{...}}` expressions against
   * node outputs and variables in this context.
   */
  resolveExpression(template: string): unknown {
    return evaluateExpression(template, this);
  }

  // ─── Abort Signal ──────────────────────────────────────────────────────────

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  isAborted(): boolean {
    return this.abortController.signal.aborted;
  }
}

// ─── Expression Evaluator ───────────────────────────────────────────────────

/**
 * Resolve a single expression reference against the execution context.
 */
function resolveReference(
  nodeId: string,
  path: string,
  context: ExecutionContext,
): unknown {
  if (nodeId === '$variables') {
    if (path) {
      return context.getVariable(path);
    }
    return context.getAllVariables();
  }

  const output = context.getNodeOutput(nodeId);
  if (output === undefined) {
    return undefined;
  }

  if (!path) {
    return output;
  }

  return getByPath(output, path);
}

/**
 * Evaluate an expression template string, replacing all `{{...}}` patterns
 * with their resolved values from the execution context.
 *
 * - Single expression `"{{node1.output}}"` returns raw value (preserving type).
 * - Mixed template interpolates all resolved values as strings.
 * - Unresolved references are left as `{{...}}`.
 */
export function evaluateExpression(
  template: string,
  context: ExecutionContext,
): unknown {
  if (!isExpression(template)) {
    return template;
  }

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
