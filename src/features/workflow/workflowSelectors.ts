import {
  createSelector,
  createDraftSafeSelector,
} from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { WorkflowNode, WorkflowEdge, NodeType, Workflow } from '../../types';

// ─── Base Selectors ──────────────────────────────────────────────────────────

const selectWorkflowState = (state: RootState) => state.workflow;

/** Select all nodes on the canvas. */
export const selectAllNodes = createSelector(
  selectWorkflowState,
  (wf): WorkflowNode[] => wf.nodes,
);

/** Select all edges on the canvas. */
export const selectAllEdges = createSelector(
  selectWorkflowState,
  (wf): WorkflowEdge[] => wf.edges,
);

/** Select a single node by ID. Returns undefined if not found. */
export const selectNodeById = createSelector(
  [selectAllNodes, (_state: RootState, nodeId: string) => nodeId],
  (nodes, nodeId): WorkflowNode | undefined =>
    nodes.find((n) => n.id === nodeId),
);

/** Select a single edge by ID. Returns undefined if not found. */
export const selectEdgeById = createSelector(
  [selectAllEdges, (_state: RootState, edgeId: string) => edgeId],
  (edges, edgeId): WorkflowEdge | undefined =>
    edges.find((e) => e.id === edgeId),
);

/** Select the current canvas viewport. */
export const selectViewport = createSelector(
  selectWorkflowState,
  (wf) => wf.viewport,
);

/** Select workflow metadata (id, name, description, lastSavedAt). */
export const selectWorkflowMeta = createSelector(
  [
    (state: RootState) => state.workflow.id,
    (state: RootState) => state.workflow.name,
    (state: RootState) => state.workflow.description,
    (state: RootState) => state.workflow.lastSavedAt,
  ],
  (id, name, description, lastSavedAt) => ({ id, name, description, lastSavedAt }),
);

/** Select whether the workflow has unsaved changes. */
export const selectWorkflowIsDirty = createSelector(
  selectWorkflowState,
  (wf) => wf.isDirty,
);

/** Select sync status for the Header indicator. */
export const selectSyncStatus = createSelector(
  [
    (state: RootState) => state.workflow.isSyncing,
    (state: RootState) => state.workflow.lastSyncedAt,
    (state: RootState) => state.workflow.syncError,
    (state: RootState) => state.workflow.isDirty,
  ],
  (isSyncing, lastSyncedAt, syncError, isDirty) => ({ isSyncing, lastSyncedAt, syncError, isDirty }),
);

/** Select all nodes of a specific type. */
export const selectNodesByType = createSelector(
  [selectAllNodes, (_state: RootState, nodeType: NodeType) => nodeType],
  (nodes, nodeType): WorkflowNode[] =>
    nodes.filter((n) => n.data.type === nodeType),
);

/** Select nodes that are directly connected to a given node (neighbors). */
export const selectConnectedNodes = createSelector(
  [
    selectAllNodes,
    selectAllEdges,
    (_state: RootState, nodeId: string) => nodeId,
  ],
  (nodes, edges, nodeId): WorkflowNode[] => {
    const connectedIds = new Set<string>();

    for (const edge of edges) {
      if (edge.source === nodeId) {
        connectedIds.add(edge.target);
      }
      if (edge.target === nodeId) {
        connectedIds.add(edge.source);
      }
    }

    return nodes.filter((n) => connectedIds.has(n.id));
  },
);

/**
 * Select the full workflow in a shape suitable for persistence.
 */
export const selectWorkflowForSave = createSelector(
  selectWorkflowState,
  (wf): Omit<Workflow, 'createdAt' | 'updatedAt' | 'tags' | 'isTemplate'> => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
    nodes: wf.nodes,
    edges: wf.edges,
    viewport: wf.viewport,
  }),
);

// ─── Draft-Safe Selector Example ─────────────────────────────────────────────

/**
 * Draft-safe selector that can be used inside `createSlice` reducers
 * when reading from the state that is being mutated by Immer.
 */
export const selectNodeCountDraftSafe = createDraftSafeSelector(
  (state: { nodes: WorkflowNode[] }) => state.nodes,
  (nodes) => nodes.length,
);
