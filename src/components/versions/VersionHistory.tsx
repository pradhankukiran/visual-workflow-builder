import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { useGetVersionsQuery, useRestoreVersionMutation } from '@/features/versions/versionsApi';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { loadWorkflow } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import type { Workflow } from '@/types';

export function VersionHistory({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const workflowId = useAppSelector((state) => state.workflow.id);
  const { data: versions, isLoading } = useGetVersionsQuery(workflowId, { skip: !workflowId });
  const [restoreVersion] = useRestoreVersionMutation();
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null);

  const handleRestoreConfirm = useCallback(async () => {
    if (isRestoring || !confirmVersionId) return;
    setIsRestoring(true);
    try {
      const result = await restoreVersion({ workflowId, versionId: confirmVersionId }).unwrap();
      if (result && typeof result === 'object' && 'nodes' in result && 'edges' in result) {
        dispatch(loadWorkflow(result as Workflow));
        onClose();
      } else {
        dispatch(addToast({ type: 'error', message: 'Invalid version data received' }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to restore version' }));
    } finally {
      setIsRestoring(false);
      setConfirmVersionId(null);
    }
  }, [isRestoring, confirmVersionId, restoreVersion, workflowId, onClose, dispatch]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Version History</h3>
        <button onClick={onClose} aria-label="Close version history" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>
      {isLoading && <p className="text-xs text-[var(--color-text-muted)]">Loading...</p>}
      {versions?.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          No versions yet. Versions are saved automatically when you save the workflow.
        </p>
      )}
      {versions?.map((v) => (
        <div
          key={v.versionId}
          className="flex items-center justify-between p-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
        >
          <div>
            <p className="text-xs font-medium text-[var(--color-text)]">
              {new Date(v.timestamp).toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {v.nodeCount} nodes · {v.edgeCount} edges
            </p>
          </div>
          {confirmVersionId === v.versionId ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-[var(--color-text-muted)]">Restore?</span>
              <button
                onClick={handleRestoreConfirm}
                disabled={isRestoring}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                  'bg-[var(--color-accent)] text-white',
                  'hover:opacity-90 disabled:opacity-50',
                )}
              >
                {isRestoring ? '...' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmVersionId(null)}
                disabled={isRestoring}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  'disabled:opacity-50',
                )}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmVersionId(v.versionId)}
              disabled={isRestoring}
              className="px-2 py-1 text-[10px] font-medium rounded bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
            >
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
