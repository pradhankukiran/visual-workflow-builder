import type {
  ServerWorkflow,
  ServerWorkflowNode,
  ExecutionRun,
  ExecutionCallbacks,
  NodeExecutionResult,
} from './types';
import { ExecutionContext } from './context';
import { topologicalSort, getConditionalBranches } from './graphUtils';
import { runNode } from './runners';
import { generateId, now } from './utils';

/** Hard timeout for server-side execution (Vercel 10s limit). */
const EXECUTION_TIMEOUT_MS = 8_000;

/**
 * Server-side workflow execution orchestrator.
 *
 * Port of WorkflowExecutor from src/engine/ with adaptations:
 * - No Web Worker (uses Function directly)
 * - No performance.now (uses Date.now)
 * - 8s hard timeout for Vercel
 * - Supports trigger data injection via context variables
 */
export class ServerWorkflowExecutor {
  private context: ExecutionContext;
  private abortController: AbortController;
  private callbacks: ExecutionCallbacks;

  constructor(callbacks: Partial<ExecutionCallbacks> = {}) {
    this.abortController = new AbortController();
    this.context = new ExecutionContext(this.abortController);
    this.callbacks = {
      onNodeStart: callbacks.onNodeStart ?? (() => {}),
      onNodeComplete: callbacks.onNodeComplete ?? (() => {}),
      onNodeError: callbacks.onNodeError ?? (() => {}),
      onLog: callbacks.onLog ?? (() => {}),
    };
  }

  /**
   * Execute a workflow from start to finish.
   *
   * @param workflow - The workflow to execute (server-side shape)
   * @param triggerData - Optional data to inject as $webhookPayload
   */
  async execute(
    workflow: ServerWorkflow,
    triggerData?: Record<string, unknown>,
  ): Promise<ExecutionRun> {
    const runId = generateId('exec');
    const startedAt = now();

    const run: ExecutionRun = {
      id: runId,
      workflowId: workflow.id,
      status: 'running',
      startedAt,
      nodeStatuses: {},
      logs: [],
    };

    // Inject trigger data if provided
    if (triggerData) {
      this.context.setVariable('$webhookPayload', triggerData);
    }

    // Set up hard timeout
    const timeoutId = setTimeout(() => {
      this.abortController.abort(new Error('Execution timeout'));
    }, EXECUTION_TIMEOUT_MS);

    // Wire log collection into the run
    const originalOnLog = this.callbacks.onLog;
    this.callbacks.onLog = (log) => {
      run.logs.push(log);
      originalOnLog(log);
    };

    // Build node lookup
    const nodeMap = new Map<string, ServerWorkflowNode>();
    for (const node of workflow.nodes) {
      nodeMap.set(node.id, node);
    }

    // Topological sort
    let sortedNodeIds: string[];
    try {
      sortedNodeIds = topologicalSort(workflow.nodes, workflow.edges);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to determine execution order: ${errorMessage}`);
      run.status = 'failed';
      run.error = errorMessage;
      run.completedAt = now();
      return run;
    }

    this.log('info', `Executing workflow "${workflow.name}" with ${sortedNodeIds.length} nodes`);

    const skippedNodes = new Set<string>();

    try {
      for (const nodeId of sortedNodeIds) {
        // Check for abort (timeout or manual cancel)
        if (this.context.isAborted()) {
          run.status = 'cancelled';
          run.completedAt = now();
          this.log('warn', 'Workflow execution was cancelled');

          for (const remainingId of sortedNodeIds.slice(sortedNodeIds.indexOf(nodeId))) {
            if (!run.nodeStatuses[remainingId]) {
              run.nodeStatuses[remainingId] = {
                nodeId: remainingId,
                status: 'skipped',
                startedAt: now(),
                completedAt: now(),
              };
            }
          }
          return run;
        }

        const node = nodeMap.get(nodeId);
        if (!node) {
          this.log('warn', `Node ${nodeId} not found in workflow, skipping`);
          continue;
        }

        // Skip nodes on the "not taken" conditional branch
        if (skippedNodes.has(nodeId)) {
          this.log('debug', `Skipping node "${node.data.label}" (not on taken branch)`);

          const skipResult: NodeExecutionResult = {
            nodeId,
            status: 'skipped',
            startedAt: now(),
            completedAt: now(),
          };
          run.nodeStatuses[nodeId] = skipResult;
          this.callbacks.onNodeComplete(nodeId, skipResult);
          continue;
        }

        // Execute the node
        const nodeStartedAt = now();

        const startResult: NodeExecutionResult = {
          nodeId,
          status: 'running',
          startedAt: nodeStartedAt,
        };
        run.nodeStatuses[nodeId] = startResult;
        this.callbacks.onNodeStart(nodeId);

        const execStartTime = Date.now();

        try {
          const output = await runNode(node, this.context, this.callbacks, workflow.edges);
          const duration = Date.now() - execStartTime;

          this.context.setNodeOutput(nodeId, output);

          const completeResult: NodeExecutionResult = {
            nodeId,
            status: 'completed',
            startedAt: nodeStartedAt,
            completedAt: now(),
            output,
            duration,
          };
          run.nodeStatuses[nodeId] = completeResult;
          this.callbacks.onNodeComplete(nodeId, completeResult);

          // Handle conditional branching
          if (node.data.type === 'conditionalBranch' && output !== null && typeof output === 'object') {
            const condResult = (output as { result?: boolean }).result;
            if (typeof condResult === 'boolean') {
              const branches = getConditionalBranches(nodeId, workflow.edges);
              const notTakenBranch = condResult ? branches.falseBranch : branches.trueBranch;

              for (const skippedId of notTakenBranch) {
                skippedNodes.add(skippedId);
              }

              this.log(
                'info',
                `Conditional "${node.data.label}" evaluated to ${condResult}` +
                  ` — skipping ${notTakenBranch.length} nodes on ${condResult ? 'false' : 'true'} branch`,
              );
            }
          }
        } catch (error: unknown) {
          const duration = Date.now() - execStartTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          const failResult: NodeExecutionResult = {
            nodeId,
            status: 'failed',
            startedAt: nodeStartedAt,
            completedAt: now(),
            error: errorMessage,
            duration,
          };
          run.nodeStatuses[nodeId] = failResult;
          this.callbacks.onNodeError(nodeId, errorMessage);

          run.status = 'failed';
          run.error = `Node "${node.data.label}" failed: ${errorMessage}`;
          run.completedAt = now();

          this.log('error', `Workflow failed at node "${node.data.label}": ${errorMessage}`);

          // Mark remaining as skipped
          const currentIndex = sortedNodeIds.indexOf(nodeId);
          for (const remainingId of sortedNodeIds.slice(currentIndex + 1)) {
            if (!run.nodeStatuses[remainingId]) {
              run.nodeStatuses[remainingId] = {
                nodeId: remainingId,
                status: 'skipped',
                startedAt: now(),
                completedAt: now(),
              };
            }
          }

          return run;
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    run.status = 'completed';
    run.completedAt = now();
    this.log('info', `Workflow "${workflow.name}" completed successfully`);

    return run;
  }

  /** Cancel the running workflow execution. */
  cancel(): void {
    this.abortController.abort();
  }

  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: unknown,
  ): void {
    this.callbacks.onLog({
      id: generateId('log'),
      timestamp: now(),
      level,
      message,
      data,
    });
  }
}
