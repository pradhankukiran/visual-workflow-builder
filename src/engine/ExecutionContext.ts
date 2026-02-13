import { evaluateExpression } from './expressionEvaluator';

/**
 * Shared execution context that is passed through all node runners
 * during a workflow execution. Holds node outputs, variables, and
 * provides abort signal access.
 *
 * This class is engine-only (no Redux, no React).
 */
export class ExecutionContext {
  private nodeOutputs: Map<string, unknown> = new Map();
  private variables: Map<string, unknown> = new Map();
  private abortController: AbortController;

  constructor(abortController: AbortController) {
    this.abortController = abortController;
  }

  // ─── Node Outputs ──────────────────────────────────────────────────────────

  /**
   * Store the output of a completed node.
   */
  setNodeOutput(nodeId: string, output: unknown): void {
    this.nodeOutputs.set(nodeId, output);
  }

  /**
   * Retrieve the output of a previously executed node.
   */
  getNodeOutput(nodeId: string): unknown | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  /**
   * Get all node outputs as a plain record (for serialization/debugging).
   */
  getAllOutputs(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    for (const [key, value] of this.nodeOutputs) {
      outputs[key] = value;
    }
    return outputs;
  }

  // ─── Variables ─────────────────────────────────────────────────────────────

  /**
   * Set a workflow-scoped variable.
   */
  setVariable(name: string, value: unknown): void {
    this.variables.set(name, value);
  }

  /**
   * Get a workflow-scoped variable by name.
   */
  getVariable(name: string): unknown | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all workflow-scoped variables as a plain record.
   */
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

  /**
   * The abort signal from the underlying AbortController.
   * Pass to fetch(), timers, or any cancellable operation.
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Whether execution has been cancelled.
   */
  isAborted(): boolean {
    return this.abortController.signal.aborted;
  }
}
