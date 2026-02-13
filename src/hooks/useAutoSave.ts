import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectWorkflowIsDirty,
  selectWorkflowForSave,
  selectWorkflowMeta,
} from '@/features/workflow/workflowSelectors';
import { markSaved } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import { useSaveWorkflowMutation } from '@/features/workflowLibrary/workflowLibraryApi';
import { now } from '@/utils/dateUtils';

/**
 * Custom hook for manual save and save-state inspection.
 *
 * Auto-save is handled by the workflow listener middleware (debounced).
 * This hook provides:
 *
 * - `isSaving`   — briefly `true` while a manual save is in progress
 * - `lastSavedAt` — ISO timestamp of the last save (from Redux)
 * - `isDirty`    — whether the workflow has unsaved changes
 * - `saveNow()`  — trigger an immediate manual save
 */
export function useAutoSave() {
  const dispatch = useAppDispatch();

  const isDirty = useAppSelector(selectWorkflowIsDirty);
  const workflowData = useAppSelector(selectWorkflowForSave);
  const meta = useAppSelector(selectWorkflowMeta);

  const [saveWorkflow, { isLoading: isSaving }] = useSaveWorkflowMutation();

  const saveNow = useCallback(async () => {
    try {
      const workflow = {
        id: workflowData.id,
        name: workflowData.name,
        description: workflowData.description,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        viewport: workflowData.viewport,
        createdAt: now(),
        updatedAt: now(),
        tags: [] as string[],
        isTemplate: false,
      };

      await saveWorkflow(workflow).unwrap();
      dispatch(markSaved());
      dispatch(addToast({ type: 'success', message: 'Workflow saved' }));
    } catch (error) {
      console.error('[useAutoSave] Manual save failed:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to save workflow' }));
    }
  }, [dispatch, workflowData, saveWorkflow]);

  return {
    isSaving,
    lastSavedAt: meta.lastSavedAt,
    isDirty,
    saveNow,
  } as const;
}
