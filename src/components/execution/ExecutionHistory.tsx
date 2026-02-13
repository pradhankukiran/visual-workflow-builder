import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { setCurrentRun } from '@/features/execution/executionSlice';
import {
  useGetExecutionsQuery,
  useGetExecutionQuery,
  type ExecutionRunSummary,
} from '@/features/execution/executionApi';
import { formatDuration, timeAgo } from '@/utils/dateUtils';
import StatusBadge from '@/components/shared/StatusBadge';

/**
 * Execution history panel showing past server-side runs.
 * Fetches from the execution API and allows clicking into a run
 * to view its node-by-node results.
 */
export default function ExecutionHistory() {
  const workflowId = useAppSelector((state) => state.workflow.id);
  const dispatch = useAppDispatch();

  const [expanded, setExpanded] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: runs, isLoading, isError } = useGetExecutionsQuery(workflowId, {
    skip: !expanded,
  });

  // H10/M12: Fetch full run details when a run is selected, track loading state
  const {
    data: selectedRun,
    isLoading: isDetailLoading,
    isFetching: isDetailFetching,
    isError: isDetailError,
  } = useGetExecutionQuery(selectedRunId!, {
    skip: !selectedRunId,
  });

  const handleSelectRun = useCallback((run: ExecutionRunSummary) => {
    if (selectedRunId === run.id) {
      setSelectedRunId(null);
    } else {
      setSelectedRunId(run.id);
    }
  }, [selectedRunId]);

  const handleLoadRun = useCallback(() => {
    // M12: Guard — only load if the fetched run matches the selected ID
    if (selectedRun && selectedRun.id === selectedRunId) {
      dispatch(setCurrentRun(selectedRun));
      setSelectedRunId(null);
    }
  }, [dispatch, selectedRun, selectedRunId]);

  return (
    <div className="border-t border-[var(--color-border)]">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-1.5 text-xs',
          'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          'hover:bg-[var(--color-surface)]',
          'transition-all-fast',
        )}
      >
        <span className="font-medium">Execution History</span>
        <svg
          className={clsx('w-3 h-3 transition-transform', expanded && 'rotate-180')}
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
          {isLoading && (
            <p className="text-[10px] text-[var(--color-text-muted)] py-2">Loading...</p>
          )}

          {isError && (
            <p className="text-[10px] text-[var(--color-error)] py-2">Failed to load history</p>
          )}

          {!isLoading && !isError && (!runs || runs.length === 0) && (
            <p className="text-[10px] text-[var(--color-text-muted)] py-2">
              No server executions yet
            </p>
          )}

          {runs && runs.length > 0 && (
            <div className="space-y-1">
              {runs.map((run) => {
                const duration = run.completedAt
                  ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
                  : undefined;
                const isSelected = selectedRunId === run.id;

                return (
                  <div key={run.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRun(run)}
                      className={clsx(
                        'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
                        'transition-all-fast',
                        isSelected
                          ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30'
                          : 'hover:bg-[var(--color-surface)] border border-transparent',
                      )}
                    >
                      <StatusBadge status={run.status} size="sm" />
                      <span className="flex-1 text-[var(--color-text-muted)] text-[10px] truncate">
                        {timeAgo(run.startedAt)}
                      </span>
                      {duration !== undefined && (
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                          {formatDuration(duration)}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {run.nodeCount} nodes
                      </span>
                    </button>

                    {/* Expanded run details */}
                    {isSelected && isDetailLoading && (
                      <p className="ml-4 mt-1 text-[10px] text-[var(--color-text-muted)]">
                        Loading run details...
                      </p>
                    )}
                    {isSelected && isDetailError && (
                      <p className="ml-4 mt-1 text-[10px] text-[var(--color-error)]">
                        Failed to load run details
                      </p>
                    )}
                    {isSelected && selectedRun && selectedRun.id === selectedRunId && !isDetailFetching && (
                      <div className="ml-4 mt-1 space-y-1">
                        {Object.values(selectedRun.nodeStatuses).map((ns) => (
                          <div
                            key={ns.nodeId}
                            className={clsx(
                              'flex items-center gap-2 px-2 py-1 rounded text-[10px]',
                              'bg-[var(--color-surface)]',
                            )}
                          >
                            <span
                              className={clsx(
                                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                ns.status === 'completed' && 'bg-emerald-500',
                                ns.status === 'failed' && 'bg-red-500',
                                ns.status === 'skipped' && 'bg-gray-400',
                                ns.status === 'running' && 'bg-blue-500',
                                ns.status === 'pending' && 'bg-gray-300',
                              )}
                            />
                            <span className="flex-1 truncate text-[var(--color-text)]">
                              {ns.nodeId}
                            </span>
                            {ns.duration !== undefined && (
                              <span className="font-mono text-[var(--color-text-muted)]">
                                {formatDuration(ns.duration)}
                              </span>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={handleLoadRun}
                          className={clsx(
                            'w-full text-center px-2 py-1 rounded text-[10px] font-medium',
                            'bg-[var(--color-accent)] text-white',
                            'hover:opacity-90 transition-all-fast',
                          )}
                        >
                          Load into canvas
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
