import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serve } from '@upstash/workflow';
import { redis, workflowDataKey, execRunKey, execIndexKey, durableExecStateKey, EXEC_RUN_TTL, MAX_RUNS_PER_WORKFLOW } from '../_lib/redis.js';
import { ExecutionContext } from '../_lib/engine/context.js';
import { topologicalSort, getConditionalBranches, getErrorBranchTargets, getNormalDownstream } from '../_lib/engine/graphUtils.js';
import { runNode } from '../_lib/engine/runners.js';
import { saveDurableState, loadDurableState } from '../_lib/engine/durableContext.js';
import type { ServerWorkflow, ServerWorkflowNode, ServerWorkflowEdge, ExecutionRun, NodeExecutionResult } from '../_lib/engine/types.js';
import { generateId, now } from '../_lib/engine/utils.js';
import { verifyQStashSignature } from '../_lib/qstash.js';
import { isValidId } from '../_lib/validation.js';

interface DurablePayload {
  workflowId: string;
  runId: string;
  userId: string;
  triggerData?: Record<string, unknown>;
}

const { handler } = serve<DurablePayload>(
  async (upstashContext) => {
    const { workflowId, runId, userId, triggerData } = upstashContext.requestPayload;

    // Step 1: Load workflow and initialize
    const workflow = await upstashContext.run('load-workflow', async () => {
      const data = await redis.get<string>(workflowDataKey(userId, workflowId));
      if (!data) throw new Error('Workflow not found');
      return (typeof data === 'string' ? JSON.parse(data) : data) as ServerWorkflow;
    });

    // Step 2: Compute execution order
    const executionOrder = await upstashContext.run('compute-order', async () => {
      return topologicalSort(workflow.nodes, workflow.edges);
    });

    // Initialize execution context state
    const abortController = new AbortController();
    const context = new ExecutionContext(abortController);
    if (userId) context.setUserId(userId);
    if (triggerData) {
      context.setVariable('$webhookPayload', triggerData);
    }

    const run: ExecutionRun = {
      id: runId,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      nodeStatuses: {},
      logs: [],
    };

    // FIX 11: Add to execution index at START so in-progress runs are visible
    await upstashContext.run('index-run-start', async () => {
      await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
      await redis.zadd(execIndexKey(workflowId), { score: Date.now(), member: runId });
    });

    const skippedNodes = new Set<string>();

    // Restore state if resuming
    const existingState = await upstashContext.run('restore-state', async () => {
      return await loadDurableState(runId);
    });

    if (existingState) {
      for (const [nodeId, output] of Object.entries(existingState.nodeOutputs)) {
        context.setNodeOutput(nodeId, output);
      }
      for (const [name, value] of Object.entries(existingState.variables)) {
        context.setVariable(name, value);
      }
      for (const nodeId of existingState.skippedNodes) {
        skippedNodes.add(nodeId);
      }
    }

    // Step 3+: Execute each node as a durable step
    for (const nodeId of executionOrder) {
      if (skippedNodes.has(nodeId)) continue;

      // Check if already completed (resuming)
      if (existingState?.nodeOutputs[nodeId] !== undefined) continue;

      const node = workflow.nodes.find((n: ServerWorkflowNode) => n.id === nodeId);
      if (!node) continue;

      // Handle delay nodes specially — use context.sleep for true durable delays
      if (node.data.type === 'delay') {
        const delayConfig = node.data.config as { type: string; duration: number; maxDuration?: number };
        let durationMs: number;
        if (delayConfig.type === 'fixed') {
          durationMs = delayConfig.duration;
        } else {
          const min = delayConfig.duration;
          const max = delayConfig.maxDuration ?? delayConfig.duration * 2;
          durationMs = min + Math.random() * (max - min);
        }
        // Durable sleep — survives function timeouts!
        await upstashContext.sleep(`delay-${nodeId}`, Math.ceil(durationMs / 1000));

        context.setNodeOutput(nodeId, { delayed: true, duration: durationMs });
        run.nodeStatuses[nodeId] = {
          nodeId,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: durationMs,
        };

        // Save state after each node
        await upstashContext.run(`save-state-${nodeId}`, async () => {
          await saveDurableState(runId, {
            nodeOutputs: Object.fromEntries(
              executionOrder
                .filter(id => context.getNodeOutput(id) !== undefined)
                .map(id => [id, context.getNodeOutput(id)])
            ),
            variables: context.getAllVariables(),
            skippedNodes: Array.from(skippedNodes),
          });
          await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
        });
        continue;
      }

      // Execute non-delay nodes as durable steps
      try {
        const output = await upstashContext.run(`node-${nodeId}`, async () => {
          return await runNode(node, context, {}, workflow.edges);
        });

        context.setNodeOutput(nodeId, output);
        run.nodeStatuses[nodeId] = {
          nodeId,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
        };

        // Handle conditional branching
        if (node.data.type === 'conditionalBranch') {
          const result = output as { result: boolean };
          const branches = getConditionalBranches(nodeId, workflow.edges);
          const skipBranch = result.result ? branches.falseBranch : branches.trueBranch;
          for (const skipId of skipBranch) {
            skippedNodes.add(skipId);
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for error branches
        const errorTargets = getErrorBranchTargets(nodeId, workflow.edges);

        if (errorTargets.length > 0) {
          const errorOutput = { error: { message: errorMessage, nodeId, nodeType: node.data.type } };
          context.setNodeOutput(nodeId, errorOutput);
          run.nodeStatuses[nodeId] = {
            nodeId,
            status: 'failed',
            error: errorMessage,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 0,
          };

          const normalDownstream = getNormalDownstream(nodeId, workflow.edges);
          for (const skipId of normalDownstream) {
            skippedNodes.add(skipId);
          }
          continue;
        }

        // No error branch — fail the whole workflow
        run.status = 'failed';
        run.error = errorMessage;
        run.nodeStatuses[nodeId] = {
          nodeId,
          status: 'failed',
          error: errorMessage,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 0,
        };

        // Save final state
        await upstashContext.run('save-failed-run', async () => {
          run.completedAt = new Date().toISOString();
          await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
        });
        return; // Stop execution
      }

      // Persist state after each step
      await upstashContext.run(`save-state-${nodeId}`, async () => {
        await saveDurableState(runId, {
          nodeOutputs: Object.fromEntries(
            executionOrder
              .filter(id => context.getNodeOutput(id) !== undefined)
              .map(id => [id, context.getNodeOutput(id)])
          ),
          variables: context.getAllVariables(),
          skippedNodes: Array.from(skippedNodes),
        });
        // Also update the run record so clients can poll progress
        await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
      });
    }

    // Final: mark run as completed
    await upstashContext.run('save-completed-run', async () => {
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      await redis.set(execRunKey(runId), JSON.stringify(run), { ex: EXEC_RUN_TTL });
      await redis.zadd(execIndexKey(workflowId), { score: Date.now(), member: runId });
      // Trim old runs
      const count = await redis.zcard(execIndexKey(workflowId));
      if (count > MAX_RUNS_PER_WORKFLOW) {
        await redis.zremrangebyrank(execIndexKey(workflowId), 0, count - MAX_RUNS_PER_WORKFLOW - 1);
      }
      // Clean up durable state
      await redis.del(durableExecStateKey(runId));
    });
  }
);

/**
 * Vercel Serverless handler.
 *
 * Bridges the VercelRequest/VercelResponse API with the standard
 * Request/Response API expected by @upstash/workflow's serve().
 */
export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  try {
    // FIX 1: Mandatory QStash signature verification
    const qstashSignature = req.headers['upstash-signature'];
    if (!qstashSignature) {
      return res.status(401).json({ error: { message: 'Missing QStash signature', code: 'UNAUTHORIZED' } });
    }
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const requestUrl = `${protocol}://${host}${req.url}`;
    const isValid = await verifyQStashSignature(
      Array.isArray(qstashSignature) ? qstashSignature[0] : qstashSignature,
      rawBody,
      requestUrl,
    );
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid QStash signature', code: 'UNAUTHORIZED' } });
    }

    // FIX 1: Validate IDs from the request payload
    const { workflowId: payloadWorkflowId } = req.query;
    if (typeof payloadWorkflowId === 'string' && !isValidId(payloadWorkflowId)) {
      return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
    }
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (payload) {
      if (payload.workflowId && !isValidId(payload.workflowId)) {
        return res.status(400).json({ error: { message: 'Invalid workflow ID format', code: 'VALIDATION_ERROR' } });
      }
      if (payload.runId && !isValidId(payload.runId)) {
        return res.status(400).json({ error: { message: 'Invalid run ID format', code: 'VALIDATION_ERROR' } });
      }
      if (payload.userId && !isValidId(payload.userId)) {
        return res.status(400).json({ error: { message: 'Invalid user ID format', code: 'VALIDATION_ERROR' } });
      }
    }

    // Build a standard Request from the VercelRequest
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const requestInit: RequestInit = {
      method: req.method || 'POST',
      headers,
    };

    // Include body for non-GET methods
    if (req.method !== 'GET' && req.body) {
      requestInit.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const request = new Request(url, requestInit);
    const response = await handler(request);

    // Convert the standard Response back to VercelResponse
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    return res.send(responseBody);
  } catch (err) {
    console.error('[api/workflow-run] Unhandled error:', err);
    return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
}
