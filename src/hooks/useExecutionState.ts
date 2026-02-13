import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { executeWorkflow } from '@/features/execution/executionThunks';
import { clearExecutionHistory } from '@/features/execution/executionSlice';
import {
  selectIsExecuting,
  selectCurrentRun,
  selectCurrentRunStatus,
  selectCurrentRunLogs,
} from '@/features/execution/executionSelectors';

/**
 * Custom hook for execution state and control.
 *
 * Provides selectors for reading execution state and action dispatchers
 * for controlling workflow execution (run, stop, clear).
 *
 * The `stopExecution` function works by storing a reference to the
 * thunk promise returned by `dispatch(executeWorkflow())` and calling
 * its `.abort()` method, which triggers the `AbortController` signal
 * wired to the `WorkflowExecutor.cancel()` method.
 */
export function useExecutionState() {
  const dispatch = useAppDispatch();

  const isExecuting = useAppSelector(selectIsExecuting);
  const currentRun = useAppSelector(selectCurrentRun);
  const status = useAppSelector(selectCurrentRunStatus);
  const logs = useAppSelector(selectCurrentRunLogs);

  // Keep a ref to the active thunk promise so we can abort it.
  // The dispatch return of createAsyncThunk is a promise with an .abort() method.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thunkPromiseRef = useRef<any>(null);

  const runWorkflow = useCallback(() => {
    const promise = dispatch(executeWorkflow());
    thunkPromiseRef.current = promise;
    return promise;
  }, [dispatch]);

  const stopExecution = useCallback(() => {
    if (thunkPromiseRef.current?.abort) {
      thunkPromiseRef.current.abort();
      thunkPromiseRef.current = null;
    }
  }, []);

  const clearResults = useCallback(() => {
    dispatch(clearExecutionHistory());
    thunkPromiseRef.current = null;
  }, [dispatch]);

  return {
    isExecuting,
    currentRun,
    status,
    logs,
    runWorkflow,
    stopExecution,
    clearResults,
  } as const;
}
