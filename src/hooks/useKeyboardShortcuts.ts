import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { undo, redo, type WorkflowSnapshot } from '@/features/history/historyActions';
import {
  selectLastSnapshot,
  selectNextSnapshot,
  selectCanUndo,
  selectCanRedo,
} from '@/features/history/historySelectors';
import {
  selectAllNodes,
  selectAllEdges,
  selectViewport,
  selectWorkflowMeta,
} from '@/features/workflow/workflowSelectors';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { deselectNode, closeConfigPanel } from '@/features/ui/uiSlice';
import {
  removeNode,
  markSaved,
  setNodes,
  setEdges,
  setViewport,
  setWorkflowMeta,
  addNode,
} from '@/features/workflow/workflowSlice';
import { selectNodeById } from '@/features/workflow/workflowSelectors';
import { generateNodeId } from '@/utils/idGenerator';
import type { RootState } from '@/app/store';
import type { WorkflowNode } from '@/types';

/** Offset when duplicating via keyboard shortcut. */
const DUPLICATE_OFFSET = { x: 40, y: 40 };

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
  dispatch(setWorkflowMeta({ name: snapshot.name, description: snapshot.description }));
}

/**
 * Registers global keyboard shortcuts for the workflow builder.
 *
 * Shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Delete / Backspace: Delete selected node
 * - Ctrl+D: Duplicate selected node
 * - Ctrl+S: Save workflow (prevents default browser save dialog)
 * - Escape: Close config panel and deselect node
 */
export function useKeyboardShortcuts() {
  const dispatch = useAppDispatch();
  const selectedNodeId = useAppSelector(selectSelectedNodeId);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const lastSnapshot = useAppSelector(selectLastSnapshot);
  const nextSnapshot = useAppSelector(selectNextSnapshot);

  // Current workflow state for undo/redo round-tripping
  const nodes = useAppSelector(selectAllNodes);
  const edges = useAppSelector(selectAllEdges);
  const viewport = useAppSelector(selectViewport);
  const meta = useAppSelector(selectWorkflowMeta);

  // We need to read the selected node inside the event handler.
  // Since hooks can't be called conditionally, we select it here.
  const selectedNode = useAppSelector((state: RootState) =>
    selectedNodeId ? selectNodeById(state, selectedNodeId) : undefined,
  );

  // Use refs to avoid stale closures in the event handler while keeping
  // the effect dependency array stable.
  const canUndoRef = useRef(canUndo);
  const canRedoRef = useRef(canRedo);
  const lastSnapshotRef = useRef(lastSnapshot);
  const nextSnapshotRef = useRef(nextSnapshot);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const selectedNodeRef = useRef(selectedNode);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const metaRef = useRef(meta);
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;
  lastSnapshotRef.current = lastSnapshot;
  nextSnapshotRef.current = nextSnapshot;
  selectedNodeIdRef.current = selectedNodeId;
  selectedNodeRef.current = selectedNode;
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewportRef.current = viewport;
  metaRef.current = meta;

  useEffect(() => {
    function getCurrentSnapshot(): WorkflowSnapshot {
      return {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        viewport: viewportRef.current,
        name: metaRef.current.name,
        description: metaRef.current.description,
      };
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();

      // Don't intercept shortcuts when the user is typing in an input field,
      // textarea, or contenteditable element.
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
      ) {
        // Still handle Escape in inputs to blur/close panel
        if (event.key === 'Escape') {
          dispatch(deselectNode());
          dispatch(closeConfigPanel());
          (target as HTMLElement).blur();
        }
        return;
      }

      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      // ─── Ctrl+Z → Undo ─────────────────────────────────────────────
      if (isCtrlOrMeta && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndoRef.current && lastSnapshotRef.current) {
          const target = lastSnapshotRef.current;
          dispatch(undo(getCurrentSnapshot()));
          applySnapshot(dispatch, target);
        }
        return;
      }

      // ─── Ctrl+Y or Ctrl+Shift+Z → Redo ─────────────────────────────
      if (
        (isCtrlOrMeta && event.key === 'y') ||
        (isCtrlOrMeta && event.key === 'z' && event.shiftKey)
      ) {
        event.preventDefault();
        if (canRedoRef.current && nextSnapshotRef.current) {
          const target = nextSnapshotRef.current;
          dispatch(redo(getCurrentSnapshot()));
          applySnapshot(dispatch, target);
        }
        return;
      }

      // ─── Delete / Backspace → Remove Selected Node ──────────────────
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedNodeIdRef.current
      ) {
        event.preventDefault();
        dispatch(removeNode(selectedNodeIdRef.current));
        dispatch(deselectNode());
        dispatch(closeConfigPanel());
        return;
      }

      // ─── Ctrl+D → Duplicate Selected Node ──────────────────────────
      if (isCtrlOrMeta && event.key === 'd' && selectedNodeRef.current) {
        event.preventDefault();
        const currentNode = selectedNodeRef.current;
        const newId = generateNodeId();
        const clonedNode: WorkflowNode = {
          id: newId,
          type: currentNode.type,
          position: {
            x: (currentNode.position?.x ?? 0) + DUPLICATE_OFFSET.x,
            y: (currentNode.position?.y ?? 0) + DUPLICATE_OFFSET.y,
          },
          data: {
            ...currentNode.data,
            config: structuredClone(currentNode.data.config),
            validationErrors: [...currentNode.data.validationErrors],
          },
        };
        dispatch(addNode(clonedNode));
        return;
      }

      // ─── Ctrl+S → Save Workflow ─────────────────────────────────────
      if (isCtrlOrMeta && event.key === 's') {
        event.preventDefault();
        dispatch(markSaved());
        return;
      }

      // ─── Escape → Close Config Panel, Deselect ─────────────────────
      if (event.key === 'Escape') {
        dispatch(deselectNode());
        dispatch(closeConfigPanel());
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
}
