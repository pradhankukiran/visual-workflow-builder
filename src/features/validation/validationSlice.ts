import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ValidationError, ValidationResult } from '../../types';
import { resetApp } from '../workflow/workflowActions';
import {
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  updateNodeData,
  onConnect,
  loadWorkflow,
  newWorkflow,
} from '../workflow/workflowSlice';

// ─── State ───────────────────────────────────────────────────────────────────

export interface ValidationState {
  errors: ValidationError[];
  isValid: boolean;
  lastValidatedAt?: string;
}

const initialState: ValidationState = {
  errors: [],
  isValid: true,
  lastValidatedAt: undefined,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const validationSlice = createSlice({
  name: 'validation',
  initialState,
  reducers: {
    /** Set the full validation result (typically from a validation run). */
    setValidationResult(state, action: PayloadAction<ValidationResult>) {
      state.errors = action.payload.errors;
      state.isValid = action.payload.isValid;
      state.lastValidatedAt = new Date().toISOString();
    },

    /** Clear all validation state (reset to valid). */
    clearValidation(state) {
      state.errors = [];
      state.isValid = true;
      state.lastValidatedAt = undefined;
    },

    /** Append a single validation error. */
    addValidationError(state, action: PayloadAction<ValidationError>) {
      state.errors.push(action.payload);
      state.isValid = !state.errors.some((e) => e.type === 'error');
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetApp, () => {
      return { ...initialState };
    });

    // Mark validation as stale when the workflow graph changes,
    // but preserve previous errors until the debounced validator runs.
    const markStale = (state: ValidationState) => {
      state.lastValidatedAt = undefined;
    };

    builder.addCase(addNode, markStale);
    builder.addCase(removeNode, markStale);
    builder.addCase(addEdge, markStale);
    builder.addCase(removeEdge, markStale);
    builder.addCase(updateNodeData, markStale);
    builder.addCase(onConnect, markStale);
    builder.addCase(loadWorkflow, markStale);
    builder.addCase(newWorkflow, markStale);
  },
});

export const { setValidationResult, clearValidation, addValidationError } =
  validationSlice.actions;

export default validationSlice.reducer;
