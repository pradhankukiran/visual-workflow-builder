import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type {
  ExecutionRun,
  ExecutionLog,
  NodeExecutionResult,
  ExecutionStatus,
} from '../../types';
import { executionAdapter } from './executionSlice';

// ─── Adapter Selectors ───────────────────────────────────────────────────────

const selectExecutionState = (state: RootState) => state.execution;

const adapterSelectors = executionAdapter.getSelectors(selectExecutionState);

/** Select all execution runs (sorted by startedAt descending). */
export const selectAllRuns = adapterSelectors.selectAll;

/** Select a specific execution run by ID. */
export const selectRunById = adapterSelectors.selectById;

/** Select the total number of execution runs. */
export const selectRunCount = adapterSelectors.selectTotal;

/** Select all execution run IDs. */
export const selectRunIds = adapterSelectors.selectIds;

// ─── Derived Selectors ───────────────────────────────────────────────────────

/** Select the currently active execution run (if any). */
export const selectCurrentRun = createSelector(
  selectExecutionState,
  (exec): ExecutionRun | undefined => {
    if (!exec.currentRunId) return undefined;
    return exec.entities[exec.currentRunId];
  },
);

/** Select the status of the current execution. */
export const selectCurrentRunStatus = createSelector(
  selectExecutionState,
  (exec): ExecutionStatus => exec.status,
);

/** Select logs from the current execution run. */
export const selectCurrentRunLogs = createSelector(
  selectCurrentRun,
  (run): ExecutionLog[] => run?.logs ?? [],
);

/**
 * M13: Select the execution status of a specific node within the current run.
 * Plain O(1) function instead of createSelector to avoid cache thrashing
 * when called with different nodeId arguments across many node components.
 */
export function selectNodeExecutionStatus(state: RootState, nodeId: string): NodeExecutionResult | undefined {
  const { currentRunId, entities } = state.execution;
  if (!currentRunId) return undefined;
  return entities[currentRunId]?.nodeStatuses[nodeId];
}

/** Whether any execution is currently in progress. */
export const selectIsExecuting = createSelector(
  selectCurrentRunStatus,
  (status): boolean => status === 'running' || status === 'paused',
);
