import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { undo, redo, type WorkflowSnapshot } from '@/features/history/historyActions';
import {
  selectCanUndo,
  selectCanRedo,
  selectLastSnapshot,
  selectNextSnapshot,
} from '@/features/history/historySelectors';
import {
  selectAllNodes,
  selectAllEdges,
  selectViewport,
  selectWorkflowMeta,
} from '@/features/workflow/workflowSelectors';
import { setNodes, setEdges, setViewport, setWorkflowMeta } from '@/features/workflow/workflowSlice';

/**
 * Build a snapshot of the current workflow state.
 */
function useCurrentSnapshot(): WorkflowSnapshot {
  const nodes = useAppSelector(selectAllNodes);
  const edges = useAppSelector(selectAllEdges);
  const viewport = useAppSelector(selectViewport);
  const meta = useAppSelector(selectWorkflowMeta);

  return {
    nodes,
    edges,
    viewport,
    name: meta.name,
    description: meta.description,
  };
}

/**
 * Apply a snapshot to the workflow slice.
 */
function applySnapshot(
  dispatch: ReturnType<typeof useAppDispatch>,
  snapshot: WorkflowSnapshot,
) {
  dispatch(setNodes(snapshot.nodes));
  dispatch(setEdges(snapshot.edges));
  dispatch(setViewport(snapshot.viewport));
  dispatch(
    setWorkflowMeta({
      name: snapshot.name,
      description: snapshot.description,
    }),
  );
}

/**
 * Custom hook for undo/redo workflow state management.
 *
 * The history stack is managed by the historySlice via `captureSnapshot`,
 * `undo`, and `redo` actions. This hook bridges the gap by:
 *
 * 1. Capturing the current workflow state before dispatching undo/redo
 *    so it can be saved to the opposite stack for round-tripping.
 * 2. Reading the target snapshot before the dispatch (since the dispatch
 *    will pop it from the stack).
 * 3. Applying the snapshot to the workflow slice so the canvas reflects
 *    the restored state.
 */
export function useUndoRedo() {
  const dispatch = useAppDispatch();

  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const lastSnapshot = useAppSelector(selectLastSnapshot);
  const nextSnapshot = useAppSelector(selectNextSnapshot);
  const currentSnapshot = useCurrentSnapshot();

  const handleUndo = useCallback(() => {
    if (!canUndo || !lastSnapshot) return;

    // Read the target snapshot before dispatch pops it from the stack.
    const target = lastSnapshot;

    // Dispatch undo with the current state so it's saved to the redo stack.
    dispatch(undo(currentSnapshot));

    // Restore the workflow to the target (previous) state.
    applySnapshot(dispatch, target);
  }, [dispatch, canUndo, lastSnapshot, currentSnapshot]);

  const handleRedo = useCallback(() => {
    if (!canRedo || !nextSnapshot) return;

    // Read the target snapshot before dispatch pops it from the stack.
    const target = nextSnapshot;

    // Dispatch redo with the current state so it's saved to the undo stack.
    dispatch(redo(currentSnapshot));

    // Restore the workflow to the target (next) state.
    applySnapshot(dispatch, target);
  }, [dispatch, canRedo, nextSnapshot, currentSnapshot]);

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } as const;
}
