import {
  createSlice,
  createEntityAdapter,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type {
  ExecutionRun,
  ExecutionStatus,
  NodeExecutionResult,
  ExecutionLog,
} from '../../types';
import { resetApp } from '../workflow/workflowActions';
import {
  executionStarted,
  executionCompleted,
  executionFailed,
  executionCancelled,
} from './executionActions';
import { now } from '../../utils/dateUtils';

// ─── Entity Adapter ──────────────────────────────────────────────────────────

const executionAdapter = createEntityAdapter<ExecutionRun, string>({
  selectId: (run) => run.id,
  sortComparer: (a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
});

// ─── State ───────────────────────────────────────────────────────────────────

export interface ExecutionState
  extends ReturnType<typeof executionAdapter.getInitialState> {
  currentRunId?: string;
  status: ExecutionStatus;
}

const initialState: ExecutionState = executionAdapter.getInitialState({
  currentRunId: undefined,
  status: 'idle' as ExecutionStatus,
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const executionSlice = createSlice({
  name: 'execution',
  initialState,
  reducers: {
    /** Set the active execution run. */
    setCurrentRun(state, action: PayloadAction<ExecutionRun>) {
      executionAdapter.upsertOne(state, action.payload);
      state.currentRunId = action.payload.id;
      state.status = action.payload.status;
    },

    /** Update the execution status of a single node within the current run. */
    updateNodeStatus(state, action: PayloadAction<NodeExecutionResult>) {
      if (!state.currentRunId) return;
      const run = state.entities[state.currentRunId];
      if (run) {
        run.nodeStatuses[action.payload.nodeId] = action.payload;
      }
    },

    /** Append a log entry to the current execution run. */
    addLog(state, action: PayloadAction<ExecutionLog>) {
      if (!state.currentRunId) return;
      const run = state.entities[state.currentRunId];
      if (run) {
        run.logs.push(action.payload);
      }
    },

    /** Directly set the overall execution status. */
    setExecutionStatus(state, action: PayloadAction<ExecutionStatus>) {
      state.status = action.payload;
      if (state.currentRunId) {
        const run = state.entities[state.currentRunId];
        if (run) {
          run.status = action.payload;
        }
      }
    },

    /** Clear all execution history. */
    clearExecutionHistory(state) {
      executionAdapter.removeAll(state);
      state.currentRunId = undefined;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetApp, () => {
      return { ...initialState };
    });

    builder.addCase(executionStarted, (state, action) => {
      const { runId, workflowId } = action.payload;
      const newRun: ExecutionRun = {
        id: runId,
        workflowId,
        status: 'running',
        startedAt: now(),
        nodeStatuses: {},
        logs: [],
      };
      executionAdapter.addOne(state, newRun);
      state.currentRunId = runId;
      state.status = 'running';
    });

    builder.addCase(executionCompleted, (state, action) => {
      const { runId } = action.payload;
      const run = state.entities[runId];
      if (run) {
        run.status = 'completed';
        run.completedAt = now();
      }
      if (state.currentRunId === runId) {
        state.status = 'completed';
      }
    });

    builder.addCase(executionFailed, (state, action) => {
      const { runId, error } = action.payload;
      const run = state.entities[runId];
      if (run) {
        run.status = 'failed';
        run.completedAt = now();
        run.error = error;
      }
      if (state.currentRunId === runId) {
        state.status = 'failed';
      }
    });

    builder.addCase(executionCancelled, (state, action) => {
      const { runId } = action.payload;
      const run = state.entities[runId];
      if (run) {
        run.status = 'cancelled';
        run.completedAt = now();
      }
      if (state.currentRunId === runId) {
        state.status = 'cancelled';
      }
    });
  },
});

export const {
  setCurrentRun,
  updateNodeStatus,
  addLog,
  setExecutionStatus,
  clearExecutionHistory,
} = executionSlice.actions;

export { executionAdapter };
export default executionSlice.reducer;
