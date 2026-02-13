import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useGetWorkflowsQuery } from '@/features/workflowLibrary/workflowLibraryApi';
import {
  sortWorkflowsByDate,
  filterWorkflows,
} from '@/features/workflowLibrary/workflowLibraryTransforms';
import { WORKFLOW_LIST_POLL_INTERVAL_MS } from '@/constants/defaults';
import { useAppDispatch } from '@/app/hooks';
import { newWorkflow } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import WorkflowCard from './WorkflowCard';
import EmptyState from '@/components/shared/EmptyState';

interface WorkflowLibraryProps {
  isActive?: boolean;
  onClose?: () => void;
}

export default function WorkflowLibrary({ isActive = true, onClose }: WorkflowLibraryProps) {
  const dispatch = useAppDispatch();
  const { data: workflows, isLoading, isError, refetch } = useGetWorkflowsQuery(undefined, {
    skip: !isActive,
    pollingInterval: WORKFLOW_LIST_POLL_INTERVAL_MS,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    const filtered = filterWorkflows(workflows, searchQuery);
    return sortWorkflowsByDate(filtered);
  }, [workflows, searchQuery]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleNewWorkflow = useCallback(() => {
    dispatch(newWorkflow());
    dispatch(addToast({ type: 'info', message: 'Created new workflow' }));
    onClose?.();
  }, [dispatch, onClose]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Workflow Library
        </h2>
        <button
          type="button"
          onClick={handleNewWorkflow}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:bg-[var(--color-accent-hover)]',
            'transition-all-fast active:scale-[0.98]',
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 2v8M2 6h8" />
          </svg>
          New Workflow
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          >
            <circle cx="6" cy="6" r="4" />
            <path d="M9 9l3.5 3.5" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search workflows..."
            className={clsx(
              'w-full pl-9 pr-3 py-2 rounded-md text-xs',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label="Search workflows"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className={clsx(
                'w-6 h-6 rounded-full border-2',
                'border-[var(--color-border)] border-t-[var(--color-accent)]',
                'animate-spin',
              )}
            />
          </div>
        )}

        {/* Error */}
        {isError && (
          <EmptyState
            icon="\u26A0\uFE0F"
            title="Failed to load workflows"
            description="There was an error loading your saved workflows. Please try again."
            action={{ label: 'Retry', onClick: refetch }}
          />
        )}

        {/* Empty state */}
        {!isLoading && !isError && workflows && workflows.length === 0 && (
          <EmptyState
            icon="\uD83D\uDCC1"
            title="No saved workflows"
            description="Create your first workflow to get started. Your workflows will be saved locally."
            action={{ label: 'New Workflow', onClick: handleNewWorkflow }}
          />
        )}

        {/* No search results */}
        {!isLoading &&
          !isError &&
          workflows &&
          workflows.length > 0 &&
          filteredWorkflows.length === 0 && (
            <EmptyState
              icon="\uD83D\uDD0D"
              title="No results found"
              description={`No workflows matching "${searchQuery}". Try a different search term.`}
            />
          )}

        {/* Workflow grid */}
        {!isLoading && filteredWorkflows.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onLoad={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
