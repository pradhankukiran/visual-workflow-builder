import { useCallback, useRef } from 'react';
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
import { loadSnapshot } from '@/features/workflow/workflowSlice';

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

  // Use refs to always read the latest state when undo/redo is called,
  // avoiding new object creation every render that would invalidate useCallback.
  const nodes = useAppSelector(selectAllNodes);
  const edges = useAppSelector(selectAllEdges);
  const viewport = useAppSelector(selectViewport);
  const meta = useAppSelector(selectWorkflowMeta);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const metaRef = useRef(meta);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewportRef.current = viewport;
  metaRef.current = meta;

  // Keep refs for history state to avoid stale closures on rapid undo/redo
  const canUndoRef = useRef(canUndo);
  const canRedoRef = useRef(canRedo);
  const lastSnapshotRef = useRef(lastSnapshot);
  const nextSnapshotRef = useRef(nextSnapshot);
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;
  lastSnapshotRef.current = lastSnapshot;
  nextSnapshotRef.current = nextSnapshot;

  const handleUndo = useCallback(() => {
    if (!canUndoRef.current || !lastSnapshotRef.current) return;

    // Read the target snapshot before dispatch pops it from the stack.
    const target = lastSnapshotRef.current;

    // Build current snapshot from refs (always fresh, no stale closures).
    const current: WorkflowSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
      viewport: viewportRef.current,
      name: metaRef.current.name,
      description: metaRef.current.description,
    };

    // Dispatch undo with the current state so it's saved to the redo stack.
    dispatch(undo(current));

    // Restore the workflow to the target (previous) state atomically.
    dispatch(loadSnapshot(target));
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    if (!canRedoRef.current || !nextSnapshotRef.current) return;

    // Read the target snapshot before dispatch pops it from the stack.
    const target = nextSnapshotRef.current;

    // Build current snapshot from refs (always fresh, no stale closures).
    const current: WorkflowSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
      viewport: viewportRef.current,
      name: metaRef.current.name,
      description: metaRef.current.description,
    };

    // Dispatch redo with the current state so it's saved to the undo stack.
    dispatch(redo(current));

    // Restore the workflow to the target (next) state atomically.
    dispatch(loadSnapshot(target));
  }, [dispatch]);

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  } as const;
}
