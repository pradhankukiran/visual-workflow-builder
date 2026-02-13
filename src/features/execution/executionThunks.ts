import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type {
  ExecutionRun,
  Workflow,
  NodeExecutionResult,
  ExecutionCallbacks,
} from '../../types';
import { WorkflowExecutor } from '../../engine/WorkflowExecutor';
import { selectWorkflowForSave } from '../workflow/workflowSelectors';
import {
  executionStarted,
  executionCompleted,
  executionFailed,
  executionCancelled,
} from './executionActions';
import { updateNodeStatus, addLog } from './executionSlice';
import { generateExecutionId, generateLogId } from '../../utils/idGenerator';
import { now } from '../../utils/dateUtils';

/**
 * Async thunk that bridges the pure engine to the Redux store.
 *
 * 1. Builds a Workflow from the current Redux state.
 * 2. Creates a WorkflowExecutor with callbacks that dispatch Redux actions.
 * 3. Executes the workflow and returns the ExecutionRun.
 *
 * The thunk's abort signal is wired to the executor's cancel() method
 * so that `dispatch(executeWorkflow()).abort()` cancels the execution.
 */
export const executeWorkflow = createAsyncThunk<
  ExecutionRun,
  void,
  { state: RootState; rejectValue: string }
>(
  'execution/executeWorkflow',
  async (_arg, { getState, dispatch, rejectWithValue, signal }) => {
    // 1. Build Workflow from current Redux state
    const state = getState();
    const workflowData = selectWorkflowForSave(state);

    const workflow: Workflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: workflowData.description,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      viewport: workflowData.viewport ?? { x: 0, y: 0, zoom: 1 },
      createdAt: now(),
      updatedAt: now(),
      tags: [],
      isTemplate: false,
    };

    const runId = generateExecutionId();

    // 2. Create executor with Redux-dispatching callbacks
    const callbacks: ExecutionCallbacks = {
      onNodeStart: (nodeId: string) => {
        dispatch(
          updateNodeStatus({
            nodeId,
            status: 'running',
            startedAt: now(),
          }),
        );
      },

      onNodeComplete: (nodeId: string, result: NodeExecutionResult) => {
        dispatch(
          updateNodeStatus({
            nodeId,
            status: 'completed',
            startedAt: result.startedAt,
            completedAt: result.completedAt,
            output: result.output,
            duration: result.duration,
          }),
        );
      },

      onNodeError: (nodeId: string, error: string) => {
        dispatch(
          updateNodeStatus({
            nodeId,
            status: 'failed',
            startedAt: now(),
            completedAt: now(),
            error,
          }),
        );
      },

      onLog: (log) => {
        dispatch(addLog(log));
      },
    };

    const executor = new WorkflowExecutor(callbacks);

    // Wire the thunk's abort signal to the executor's cancel
    signal.addEventListener('abort', () => {
      executor.cancel();
    }, { once: true });

    try {
      // 3. Dispatch execution started
      dispatch(executionStarted({ runId, workflowId: workflow.id }));

      dispatch(
        addLog({
          id: generateLogId(),
          timestamp: now(),
          level: 'info',
          message: `Starting workflow execution: ${workflow.name}`,
        }),
      );

      // 4. Execute the workflow
      const run = await executor.execute(workflow);

      // Override the run ID to match what we dispatched
      const finalRun: ExecutionRun = {
        ...run,
        id: runId,
      };

      // 5. Dispatch completion/failure based on result
      if (finalRun.status === 'completed') {
        dispatch(executionCompleted({ runId }));
        dispatch(
          addLog({
            id: generateLogId(),
            timestamp: now(),
            level: 'info',
            message: `Workflow execution completed successfully`,
          }),
        );
      } else if (finalRun.status === 'failed') {
        dispatch(executionFailed({ runId, error: finalRun.error ?? 'Unknown error' }));
      } else if (finalRun.status === 'cancelled') {
        dispatch(executionCancelled({ runId }));
      }

      return finalRun;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if this was an abort
      if (signal.aborted) {
        dispatch(executionCancelled({ runId }));
        dispatch(
          addLog({
            id: generateLogId(),
            timestamp: now(),
            level: 'warn',
            message: 'Workflow execution was cancelled by user',
          }),
        );
        return rejectWithValue('Execution cancelled');
      }

      dispatch(executionFailed({ runId, error: errorMessage }));
      dispatch(
        addLog({
          id: generateLogId(),
          timestamp: now(),
          level: 'error',
          message: `Workflow execution failed: ${errorMessage}`,
        }),
      );

      return rejectWithValue(errorMessage);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { execution } = getState();
      return execution.status !== 'running';
    },
  },
);
