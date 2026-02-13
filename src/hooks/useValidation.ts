import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectIsValid,
  selectValidationErrors,
  selectValidationSummary,
  selectErrorsForNode,
} from '@/features/validation/validationSelectors';
import { setValidationResult } from '@/features/validation/validationSlice';
import { validateWorkflow } from '@/features/validation/validationEngine';
import {
  selectAllNodes,
  selectAllEdges,
} from '@/features/workflow/workflowSelectors';
import type { RootState } from '@/app/store';
import type { ValidationError } from '@/types';

/**
 * Custom hook for workflow validation state and actions.
 *
 * Provides read access to validation state and a manual `validateNow()`
 * trigger. Auto-validation is handled by the workflow listener middleware,
 * but this hook allows components to force an immediate validation pass.
 */
export function useValidation() {
  const dispatch = useAppDispatch();

  const isValid = useAppSelector(selectIsValid);
  const errors = useAppSelector(selectValidationErrors);
  const summary = useAppSelector(selectValidationSummary);
  const nodes = useAppSelector(selectAllNodes);
  const edges = useAppSelector(selectAllEdges);

  const validateNow = useCallback(() => {
    const result = validateWorkflow(nodes, edges);
    dispatch(setValidationResult(result));
    return result;
  }, [dispatch, nodes, edges]);

  /**
   * Returns a function that retrieves validation errors for a specific node.
   * Usage: `const nodeErrors = errorsForNode('node_abc123');`
   */
  const errorsForNode = useCallback(
    (nodeId: string): ValidationError[] => {
      return errors.filter((e) => e.nodeId === nodeId);
    },
    [errors],
  );

  return {
    isValid,
    errors,
    summary,
    errorsForNode,
    validateNow,
  } as const;
}
