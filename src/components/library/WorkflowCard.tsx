import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { useAppDispatch } from '@/app/hooks';
import {
  useDeleteWorkflowMutation,
  useSaveWorkflowMutation,
  workflowLibraryApi,
} from '@/features/workflowLibrary/workflowLibraryApi';
import { loadWorkflow } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import { cloneWorkflow } from '@/utils/cloneWorkflow';
import { timeAgo } from '@/utils/dateUtils';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { WorkflowMetadata } from '@/types';

interface WorkflowCardProps {
  workflow: WorkflowMetadata;
  onLoad?: () => void;
}

export default function WorkflowCard({ workflow, onLoad }: WorkflowCardProps) {
  const dispatch = useAppDispatch();
  const [deleteWorkflow] = useDeleteWorkflowMutation();
  const [saveWorkflowMutation] = useSaveWorkflowMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleLoad = useCallback(async () => {
    try {
      const full = await dispatch(
        workflowLibraryApi.endpoints.getWorkflow.initiate(workflow.id),
      ).unwrap();
      dispatch(loadWorkflow(full));
      dispatch(
        addToast({ type: 'success', message: `Loaded "${workflow.name}"` }),
      );
      onLoad?.();
    } catch {
      dispatch(
        addToast({ type: 'error', message: `Failed to load "${workflow.name}"` }),
      );
    }
  }, [dispatch, workflow.id, workflow.name, onLoad]);

  const handleDuplicate = useCallback(async () => {
    try {
      const full = await dispatch(
        workflowLibraryApi.endpoints.getWorkflow.initiate(workflow.id),
      ).unwrap();
      const cloned = cloneWorkflow(full);
      await saveWorkflowMutation(cloned).unwrap();
      dispatch(
        addToast({ type: 'success', message: `Duplicated "${workflow.name}"` }),
      );
    } catch {
      dispatch(
        addToast({ type: 'error', message: `Failed to duplicate "${workflow.name}"` }),
      );
    }
  }, [dispatch, workflow.id, workflow.name, saveWorkflowMutation]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteWorkflow(workflow.id).unwrap();
      dispatch(
        addToast({ type: 'success', message: `Deleted "${workflow.name}"` }),
      );
    } catch {
      dispatch(
        addToast({ type: 'error', message: `Failed to delete "${workflow.name}"` }),
      );
    }
    setConfirmDelete(false);
  }, [deleteWorkflow, dispatch, workflow.id, workflow.name]);

  const truncatedDescription =
    workflow.description.length > 100
      ? `${workflow.description.slice(0, 100)}...`
      : workflow.description;

  return (
    <>
      <div
        className={clsx(
          'group flex flex-col p-4 rounded-lg',
          'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
          'hover:border-[var(--color-text-muted)] hover:shadow-md',
          'transition-all-fast cursor-pointer',
        )}
        onClick={handleLoad}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLoad();
          }
        }}
        aria-label={`Load workflow: ${workflow.name}`}
      >
        {/* Title */}
        <h3 className="text-sm font-semibold text-[var(--color-text)] truncate mb-1">
          {workflow.name}
        </h3>

        {/* Description */}
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mb-3 min-h-[2.5em]">
          {truncatedDescription || 'No description'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className={clsx(
              'flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]',
              'px-1.5 py-0.5 rounded-md',
              'bg-[var(--color-surface)]',
            )}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-50">
              <rect x="1" y="1" width="8" height="8" rx="2" />
            </svg>
            {workflow.nodeCount} node{workflow.nodeCount !== 1 ? 's' : ''}
          </span>
          <span
            className={clsx(
              'flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]',
              'px-1.5 py-0.5 rounded-md',
              'bg-[var(--color-surface)]',
            )}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50">
              <path d="M2 5h6" />
            </svg>
            {workflow.edgeCount} edge{workflow.edgeCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Footer: date + actions */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border)]">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {timeAgo(workflow.updatedAt)}
          </span>

          {/* Action buttons (stop propagation so card click doesn't fire) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all-fast">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
              className={clsx(
                'p-1.5 rounded-md text-[var(--color-text-muted)]',
                'hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                'transition-all-fast',
              )}
              title="Duplicate workflow"
              aria-label={`Duplicate "${workflow.name}"`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="7" height="7" rx="1" />
                <path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className={clsx(
                'p-1.5 rounded-md text-[var(--color-text-muted)]',
                'hover:text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
                'transition-all-fast',
              )}
              title="Delete workflow"
              aria-label={`Delete "${workflow.name}"`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 3h8M4.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M9.5 3l-.5 7a1 1 0 01-1 1h-4a1 1 0 01-1-1L2.5 3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
