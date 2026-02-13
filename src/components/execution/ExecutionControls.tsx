import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { executeWorkflow } from '@/features/execution/executionThunks';
import { clearExecutionHistory, setCurrentRun, setExecutionStatus } from '@/features/execution/executionSlice';
import { addToast } from '@/features/toast/toastSlice';
import {
  selectCurrentRun,
  selectCurrentRunStatus,
  selectIsExecuting,
} from '@/features/execution/executionSelectors';
import { selectAllNodes } from '@/features/workflow/workflowSelectors';
import { useTriggerExecutionMutation } from '@/features/execution/executionApi';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDuration } from '@/utils/dateUtils';

/**
 * Main execution control bar.
 *
 * Provides Run / Run on Server / Stop / Clear buttons, an execution status
 * indicator, and a live elapsed-time counter while the workflow is executing.
 */
export default function ExecutionControls() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCurrentRunStatus);
  const isExecuting = useAppSelector(selectIsExecuting);
  const currentRun = useAppSelector(selectCurrentRun);
  const nodes = useAppSelector(selectAllNodes);
  const workflowId = useAppSelector((state) => state.workflow.id);

  // Store the thunk promise so we can abort it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thunkPromiseRef = useRef<any>(null);

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Server execution mutation
  const [triggerExecution, { isLoading: isServerExecuting }] = useTriggerExecutionMutation();

  // Elapsed time counter while running
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Start / stop the elapsed timer based on execution state.
  useEffect(() => {
    if ((isExecuting || isServerExecuting) && currentRun?.startedAt) {
      const startTime = new Date(currentRun.startedAt).getTime();

      // Immediately set the current elapsed value
      setElapsed(Date.now() - startTime);

      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // When execution ends, freeze the elapsed time from the run data.
      if (currentRun?.startedAt && currentRun?.completedAt) {
        const start = new Date(currentRun.startedAt).getTime();
        const end = new Date(currentRun.completedAt).getTime();
        setElapsed(end - start);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isExecuting, isServerExecuting, currentRun?.startedAt, currentRun?.completedAt]);

  const handleRun = useCallback(() => {
    if (isExecuting || nodes.length === 0) return;
    setElapsed(0);
    const promise = dispatch(executeWorkflow());
    thunkPromiseRef.current = promise;
    setShowDropdown(false);
  }, [dispatch, isExecuting, nodes.length]);

  const handleRunOnServer = useCallback(async () => {
    if (isExecuting || isServerExecuting || nodes.length === 0) return;
    setElapsed(0);
    setShowDropdown(false);

    dispatch(setExecutionStatus('running'));

    try {
      const run = await triggerExecution({ workflowId }).unwrap();
      // Dispatch the returned ExecutionRun into the existing execution slice
      // so node status overlays render from the same data path
      dispatch(setCurrentRun(run));
    } catch (error: unknown) {
      console.error('Server execution failed:', error);
      dispatch(setExecutionStatus('failed'));
      // M11: Extract error from RTK Query shape
      const rtkError = error as { data?: { error?: { message?: string } }; message?: string };
      const errorMessage = rtkError?.data?.error?.message ?? rtkError?.message ?? 'Unknown error';
      dispatch(addToast({
        type: 'error',
        message: `Server execution failed: ${errorMessage}`,
      }));
    }
  }, [dispatch, isExecuting, isServerExecuting, nodes.length, triggerExecution, workflowId]);

  const handleStop = useCallback(() => {
    if (thunkPromiseRef.current?.abort) {
      thunkPromiseRef.current.abort();
      thunkPromiseRef.current = null;
    } else if (isServerExecuting) {
      // H9: Server executions cannot be cancelled — update UI state and warn
      dispatch(setExecutionStatus('cancelled'));
      dispatch(addToast({
        type: 'warning',
        message: 'Server execution cannot be stopped remotely. It will complete on the server.',
      }));
    }
  }, [dispatch, isServerExecuting]);

  const handleClear = useCallback(() => {
    dispatch(clearExecutionHistory());
    setElapsed(0);
    thunkPromiseRef.current = null;
  }, [dispatch]);

  const isEmpty = nodes.length === 0;
  const anyExecuting = isExecuting || isServerExecuting;
  const showStatus = status !== 'idle';

  return (
    <div className="flex items-center gap-2">
      {/* Run button with dropdown */}
      {!anyExecuting && (
        <div className="relative" ref={dropdownRef}>
          <div className="flex">
            {/* Main run button */}
            <button
              type="button"
              onClick={handleRun}
              disabled={anyExecuting || isEmpty}
              title={isEmpty ? 'Add nodes to your workflow first' : 'Run workflow'}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-medium',
                'transition-all-fast active:scale-[0.97]',
                anyExecuting || isEmpty
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
              )}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
              Run
            </button>

            {/* Dropdown chevron */}
            <button
              type="button"
              onClick={() => setShowDropdown((prev) => !prev)}
              disabled={anyExecuting || isEmpty}
              title="More execution options"
              className={clsx(
                'flex items-center px-1.5 py-1.5 rounded-r-lg text-xs font-medium border-l',
                'transition-all-fast',
                anyExecuting || isEmpty
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60 border-[var(--color-border)]'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-emerald-700',
              )}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>
          </div>

          {/* Dropdown menu */}
          {showDropdown && (
            <div
              className={clsx(
                'absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px]',
                'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              )}
            >
              <button
                type="button"
                onClick={handleRun}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  'transition-all-fast',
                )}
              >
                <div className="font-medium">Run in Browser</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Client-side execution</div>
              </button>
              <button
                type="button"
                onClick={handleRunOnServer}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  'transition-all-fast',
                )}
              >
                <div className="font-medium">Run on Server</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Server-side, no CORS limits</div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stop button — visible only while running */}
      {anyExecuting && (
        <button
          type="button"
          onClick={handleStop}
          title="Stop execution"
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'bg-red-600 text-white hover:bg-red-700',
            'transition-all-fast active:scale-[0.97] shadow-sm',
          )}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="10" height="10" rx="1" />
          </svg>
          Stop
        </button>
      )}

      {/* Status indicator */}
      {showStatus && <StatusBadge status={status} size="md" />}

      {/* Elapsed timer */}
      {showStatus && (
        <span
          className={clsx(
            'text-[11px] font-mono tabular-nums',
            'text-[var(--color-text-muted)]',
          )}
          aria-label={`Elapsed: ${formatDuration(elapsed)}`}
        >
          {formatDuration(elapsed)}
        </span>
      )}

      {/* Clear button — only when there is history to clear */}
      {showStatus && !anyExecuting && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear execution results"
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[11px]',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            'hover:bg-[var(--color-surface)]',
            'transition-all-fast',
          )}
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
