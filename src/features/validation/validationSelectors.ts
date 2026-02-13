import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { ValidationError } from '../../types';

const selectValidationState = (state: RootState) => state.validation;

/** Select all validation errors and warnings. */
export const selectValidationErrors = createSelector(
  selectValidationState,
  (validation): ValidationError[] => validation.errors,
);

/** Whether the workflow is currently valid. */
export const selectIsValid = createSelector(
  selectValidationState,
  (validation): boolean => validation.isValid,
);

/** Select validation errors for a specific node. */
export const selectErrorsForNode = createSelector(
  [selectValidationErrors, (_state: RootState, nodeId: string) => nodeId],
  (errors, nodeId): ValidationError[] =>
    errors.filter((e) => e.nodeId === nodeId),
);

/** Select validation errors for a specific edge. */
export const selectErrorsForEdge = createSelector(
  [selectValidationErrors, (_state: RootState, edgeId: string) => edgeId],
  (errors, edgeId): ValidationError[] =>
    errors.filter((e) => e.edgeId === edgeId),
);

/** Select a summary of the validation state. */
export const selectValidationSummary = createSelector(
  selectValidationState,
  (validation) => {
    const errorCount = validation.errors.filter(
      (e) => e.type === 'error',
    ).length;
    const warningCount = validation.errors.filter(
      (e) => e.type === 'warning',
    ).length;

    return {
      isValid: validation.isValid,
      errorCount,
      warningCount,
      totalIssues: errorCount + warningCount,
      lastValidatedAt: validation.lastValidatedAt,
    };
  },
);
