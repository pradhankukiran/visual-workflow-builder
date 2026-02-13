import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { executeWorkflow } from '@/features/execution/executionThunks';
import { clearExecutionHistory } from '@/features/execution/executionSlice';
import {
  selectCurrentRun,
  selectCurrentRunStatus,
  selectIsExecuting,
} from '@/features/execution/executionSelectors';
import { selectAllNodes } from '@/features/workflow/workflowSelectors';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDuration } from '@/utils/dateUtils';

/**
 * Main execution control bar.
 *
 * Provides Run / Stop / Clear buttons, an execution status indicator,
 * and a live elapsed-time counter while the workflow is executing.
 */
export default function ExecutionControls() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectCurrentRunStatus);
  const isExecuting = useAppSelector(selectIsExecuting);
  const currentRun = useAppSelector(selectCurrentRun);
  const nodes = useAppSelector(selectAllNodes);

  // Store the thunk promise so we can abort it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thunkPromiseRef = useRef<any>(null);

  // Elapsed time counter while running
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start / stop the elapsed timer based on execution state.
  useEffect(() => {
    if (isExecuting && currentRun?.startedAt) {
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
  }, [isExecuting, currentRun?.startedAt, currentRun?.completedAt]);

  const handleRun = useCallback(() => {
    if (isExecuting || nodes.length === 0) return;
    setElapsed(0);
    const promise = dispatch(executeWorkflow());
    thunkPromiseRef.current = promise;
  }, [dispatch, isExecuting, nodes.length]);

  const handleStop = useCallback(() => {
    if (thunkPromiseRef.current?.abort) {
      thunkPromiseRef.current.abort();
      thunkPromiseRef.current = null;
    }
  }, []);

  const handleClear = useCallback(() => {
    dispatch(clearExecutionHistory());
    setElapsed(0);
    thunkPromiseRef.current = null;
  }, [dispatch]);

  const isEmpty = nodes.length === 0;
  const showStatus = status !== 'idle';

  return (
    <div className="flex items-center gap-2">
      {/* Run button */}
      {!isExecuting && (
        <button
          type="button"
          onClick={handleRun}
          disabled={isExecuting || isEmpty}
          title={isEmpty ? 'Add nodes to your workflow first' : 'Run workflow'}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'transition-all-fast active:scale-[0.97]',
            isExecuting || isEmpty
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
      )}

      {/* Stop button — visible only while running */}
      {isExecuting && (
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
      {showStatus && !isExecuting && (
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
