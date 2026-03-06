import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionRun,
  ExecutionCallbacks,
  NodeExecutionResult,
} from '../types';
import { ExecutionContext } from './ExecutionContext';
import { topologicalSort, getConditionalBranches, getErrorBranchTargets, getNormalDownstream } from './graphUtils';
import { runNode } from './NodeRunner';
import { generateExecutionId, generateLogId } from '../utils/idGenerator';
import { now } from '../utils/dateUtils';

/**
 * The main workflow execution orchestrator.
 *
 * Executes nodes in topological order, handles conditional branching
 * (skipping nodes on the "not taken" branch), manages the execution
 * context, and reports progress through callbacks.
 *
 * This class is pure TypeScript — no Redux, no React.
 */
export class WorkflowExecutor {
  private context!: ExecutionContext;
  private abortController!: AbortController;
  private callbacks: ExecutionCallbacks;
  private _wrappedOnLog?: (log: ExecutionRun['logs'][number]) => void;

  constructor(callbacks: Partial<ExecutionCallbacks>) {
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
   * H12: AbortController and ExecutionContext are created fresh per execution
   * so the executor can safely be reused.
   *
   * 1. Topological sort the nodes.
   * 2. Execute each node in order, respecting conditional branches.
   * 3. Return a complete ExecutionRun with all results.
   */
  async execute(workflow: Workflow): Promise<ExecutionRun> {
    // H12: Create fresh abort controller and context per execution
    this.abortController = new AbortController();
    this.context = new ExecutionContext(this.abortController);

    const runId = generateExecutionId();
    const startedAt = now();

    const run: ExecutionRun = {
      id: runId,
      workflowId: workflow.id,
      status: 'running',
      startedAt,
      nodeStatuses: {},
      logs: [],
    };

    // M17: Wrap onLog to also push to run.logs[] (matching server pattern)
    // Use a local variable to avoid mutating this.callbacks.onLog (stale closure on re-entrant calls)
    const wrappedOnLog = (log: ExecutionRun['logs'][number]) => {
      run.logs.push(log);
      this.callbacks.onLog(log);
    };
    this._wrappedOnLog = wrappedOnLog;

    try {
      return await this._executeInner(workflow, run);
    } finally {
      this._wrappedOnLog = undefined;
    }
  }

  private async _executeInner(workflow: Workflow, run: ExecutionRun): Promise<ExecutionRun> {
    // Build node lookup for fast access
    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of workflow.nodes) {
      nodeMap.set(node.id, node);
    }

    // Topological sort to get execution order
    let sortedNodeIds: string[];
    try {
      sortedNodeIds = topologicalSort(workflow.nodes, workflow.edges);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to determine execution order: ${errorMessage}`);
      run.status = 'failed';
      run.error = errorMessage;
      run.completedAt = now();
      return run;
    }

    this.log('info', `Executing workflow "${workflow.name}" with ${sortedNodeIds.length} nodes`);

    // Track which nodes to skip (due to conditional branching)
    const skippedNodes = new Set<string>();

    // Track conditional branch results: conditionalNodeId → boolean result
    const branchResults = new Map<string, boolean>();

    for (const nodeId of sortedNodeIds) {
      // Check for abort
      if (this.context.isAborted()) {
        run.status = 'cancelled';
        run.completedAt = now();
        this.log('warn', 'Workflow execution was cancelled');

        // Mark remaining nodes as skipped
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

      // Check if this node should be skipped due to conditional branching
      if (skippedNodes.has(nodeId)) {
        this.log('debug', `Skipping node "${node.data.label}" (not on taken branch)`);

        const skipResult: NodeExecutionResult = {
          nodeId,
          status: 'skipped',
          startedAt: now(),
          completedAt: now(),
        };

        run.nodeStatuses[nodeId] = skipResult;
        this.callbacks.onNodeStart(nodeId);
        this.callbacks.onNodeComplete(nodeId, skipResult);
        continue;
      }

      // ── Execute the node ──────────────────────────────────────────────
      const nodeStartedAt = now();

      const startResult: NodeExecutionResult = {
        nodeId,
        status: 'running',
        startedAt: nodeStartedAt,
      };

      run.nodeStatuses[nodeId] = startResult;
      this.callbacks.onNodeStart(nodeId);

      const execStartTime = performance.now();

      try {
        const output = await runNode(
          node,
          this.context,
          this.callbacks,
          workflow.edges,
        );

        const duration = Math.round(performance.now() - execStartTime);

        // Store output in context for downstream nodes
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

        // Skip error-branch targets (and their transitive downstream) on success
        const errorTargets = getErrorBranchTargets(nodeId, workflow.edges);
        for (const target of errorTargets) {
          skippedNodes.add(target);
        }
        for (const target of errorTargets) {
          for (const downstream of getNormalDownstream(target, workflow.edges)) {
            skippedNodes.add(downstream);
          }
        }

        // Handle conditional branching
        if (node.data.type === 'conditionalBranch' && output !== null && typeof output === 'object') {
          const condResult = (output as { result?: boolean }).result;
          if (typeof condResult === 'boolean') {
            branchResults.set(nodeId, condResult);

            const branches = getConditionalBranches(nodeId, workflow.edges);

            // Mark nodes on the "not taken" branch as skipped
            const notTakenBranch = condResult
              ? branches.falseBranch
              : branches.trueBranch;

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
        const duration = Math.round(performance.now() - execStartTime);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check for error branch edges
        const errorTargets = getErrorBranchTargets(nodeId, workflow.edges);

        if (errorTargets.length > 0) {
          // Node has error edges — follow error path instead of failing
          const errorOutput = {
            error: { message: errorMessage, nodeId, nodeType: node.data.type },
          };
          this.context.setNodeOutput(nodeId, errorOutput);

          // Mark node as failed but don't stop workflow
          run.nodeStatuses[nodeId] = {
            nodeId,
            status: 'failed',
            error: errorMessage,
            startedAt: nodeStartedAt,
            completedAt: now(),
            duration,
          };

          this.callbacks.onNodeError(nodeId, errorMessage);
          this.log('info', `Node "${node.data.label}" failed, following error branch`, nodeId);

          // Skip all NORMAL downstream nodes (error branch will still execute)
          const normalDownstream = getNormalDownstream(nodeId, workflow.edges);
          for (const skipId of normalDownstream) {
            skippedNodes.add(skipId);
          }

          continue; // Don't stop the workflow
        }

        // No error edges — existing behavior (fail the workflow)
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

        // Fail the entire workflow on node failure
        run.status = 'failed';
        run.error = `Node "${node.data.label}" failed: ${errorMessage}`;
        run.completedAt = now();

        this.log('error', `Workflow failed at node "${node.data.label}": ${errorMessage}`);

        // Mark remaining nodes as skipped
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

    // All nodes completed successfully
    run.status = 'completed';
    run.completedAt = now();

    this.log('info', `Workflow "${workflow.name}" completed successfully`);

    return run;
  }

  /**
   * Cancel the running workflow execution.
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * Emit a log entry through the callbacks.
   */
  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: unknown,
  ): void {
    const logEntry = {
      id: generateLogId(),
      timestamp: now(),
      level,
      message,
      data,
    };
    const onLog = this._wrappedOnLog ?? this.callbacks.onLog;
    onLog(logEntry);
  }
}
