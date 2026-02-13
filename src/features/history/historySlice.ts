import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MAX_HISTORY_SIZE } from '../../constants/defaults';
import { resetApp } from '../workflow/workflowActions';
import { captureSnapshot, undo, redo, type WorkflowSnapshot } from './historyActions';

// ─── State ───────────────────────────────────────────────────────────────────

export interface HistoryState {
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
  maxHistory: number;
}

const initialState: HistoryState = {
  past: [],
  future: [],
  maxHistory: MAX_HISTORY_SIZE,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    /**
     * Push a snapshot onto the undo stack.
     * Clears the redo stack (new action invalidates forward history).
     */
    pushState(state, action: PayloadAction<WorkflowSnapshot>) {
      state.past.push(action.payload);
      if (state.past.length > state.maxHistory) {
        state.past.shift();
      }
      state.future = [];
    },

    /** Clear the entire undo/redo history. */
    clearHistory(state) {
      state.past = [];
      state.future = [];
    },
  },
  extraReducers: (builder) => {
    // Capture a snapshot into the undo stack
    builder.addCase(captureSnapshot, (state, action) => {
      state.past.push(action.payload);
      if (state.past.length > state.maxHistory) {
        state.past.shift();
      }
      state.future = [];
    });

    // Undo: save the current state (payload) to future, pop from past
    builder.addCase(undo, (state, action) => {
      if (state.past.length === 0) return;
      // Push the current workflow state onto the redo stack
      state.future.push(action.payload);
      // Pop the last past snapshot (the hook will apply it to the workflow)
      state.past.pop();
    });

    // Redo: save the current state (payload) to past, pop from future
    builder.addCase(redo, (state, action) => {
      if (state.future.length === 0) return;
      // Push the current workflow state onto the undo stack
      state.past.push(action.payload);
      if (state.past.length > state.maxHistory) {
        state.past.shift();
      }
      // Pop the last future snapshot (the hook will apply it to the workflow)
      state.future.pop();
    });

    // Reset app clears history
    builder.addCase(resetApp, () => {
      return { ...initialState };
    });
  },
});

export const { pushState, clearHistory } = historySlice.actions;
export default historySlice.reducer;
