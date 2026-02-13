import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type {
  WorkflowNode,
  WorkflowNodeData,
  WorkflowEdge,
  WorkflowViewport,
  Workflow,
} from '../../types';
import {
  DEFAULT_VIEWPORT,
  DEFAULT_WORKFLOW_NAME,
  DEFAULT_WORKFLOW_DESCRIPTION,
} from '../../constants/defaults';
import { generateEdgeId, generateWorkflowId } from '../../utils/idGenerator';
import { now } from '../../utils/dateUtils';
import { resetApp, importWorkflow } from './workflowActions';
import { workflowLibraryApi } from '../workflowLibrary/workflowLibraryApi';

// ─── Slice State ─────────────────────────────────────────────────────────────

export interface WorkflowState {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: WorkflowViewport;
  isDirty: boolean;
  lastSavedAt?: string;
}

const initialState: WorkflowState = {
  id: generateWorkflowId(),
  name: DEFAULT_WORKFLOW_NAME,
  description: DEFAULT_WORKFLOW_DESCRIPTION,
  nodes: [],
  edges: [],
  viewport: { ...DEFAULT_VIEWPORT },
  isDirty: false,
  lastSavedAt: undefined,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    /** Replace all nodes. */
    setNodes(state, action: PayloadAction<WorkflowNode[]>) {
      state.nodes = action.payload;
      state.isDirty = true;
    },

    /** Replace all edges. */
    setEdges(state, action: PayloadAction<WorkflowEdge[]>) {
      state.edges = action.payload;
      state.isDirty = true;
    },

    /** Add a single node to the canvas. */
    addNode(state, action: PayloadAction<WorkflowNode>) {
      state.nodes.push(action.payload);
      state.isDirty = true;
    },

    /** Remove a node by ID (also removes connected edges). */
    removeNode(state, action: PayloadAction<string>) {
      const nodeId = action.payload;
      state.nodes = state.nodes.filter((n) => n.id !== nodeId);
      state.edges = state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
      state.isDirty = true;
    },

    /** Update the data payload for a specific node. */
    updateNodeData(
      state,
      action: PayloadAction<{
        nodeId: string;
        data: Partial<WorkflowNodeData>;
      }>,
    ) {
      const { nodeId, data } = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.data = { ...node.data, ...data };
        state.isDirty = true;
      }
    },

    /** Update the position of a single node. */
    updateNodePosition(
      state,
      action: PayloadAction<{
        nodeId: string;
        position: { x: number; y: number };
      }>,
    ) {
      const { nodeId, position } = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.position = position;
        state.isDirty = true;
      }
    },

    /** Add a single edge. */
    addEdge(state, action: PayloadAction<WorkflowEdge>) {
      state.edges.push(action.payload);
      state.isDirty = true;
    },

    /** Remove an edge by ID. */
    removeEdge(state, action: PayloadAction<string>) {
      state.edges = state.edges.filter((e) => e.id !== action.payload);
      state.isDirty = true;
    },

    /** Apply React Flow node changes (drag, select, remove, etc.). */
    onNodesChange(state, action: PayloadAction<NodeChange<WorkflowNode>[]>) {
      state.nodes = applyNodeChanges(action.payload, state.nodes);
      state.isDirty = true;
    },

    /** Apply React Flow edge changes (select, remove, etc.). */
    onEdgesChange(state, action: PayloadAction<EdgeChange<WorkflowEdge>[]>) {
      state.edges = applyEdgeChanges(action.payload, state.edges);
      state.isDirty = true;
    },

    /** Handle a new connection between two nodes. */
    onConnect(state, action: PayloadAction<Connection>) {
      const connection = action.payload;
      const newEdge: WorkflowEdge = {
        id: generateEdgeId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      };
      state.edges.push(newEdge);
      state.isDirty = true;
    },

    /** Update the canvas viewport (pan/zoom). */
    setViewport(state, action: PayloadAction<WorkflowViewport>) {
      state.viewport = action.payload;
    },

    /** Update workflow metadata (name, description). */
    setWorkflowMeta(
      state,
      action: PayloadAction<{ name?: string; description?: string }>,
    ) {
      if (action.payload.name !== undefined) {
        state.name = action.payload.name;
      }
      if (action.payload.description !== undefined) {
        state.description = action.payload.description;
      }
      state.isDirty = true;
    },

    /** Load a full workflow into the canvas. */
    loadWorkflow(state, action: PayloadAction<Workflow>) {
      const w = action.payload;
      state.id = w.id;
      state.name = w.name;
      state.description = w.description;
      state.nodes = w.nodes;
      state.edges = w.edges;
      state.viewport = w.viewport;
      state.isDirty = false;
      state.lastSavedAt = w.updatedAt;
    },

    /** Reset to a blank new workflow. */
    newWorkflow(state) {
      state.id = generateWorkflowId();
      state.name = DEFAULT_WORKFLOW_NAME;
      state.description = DEFAULT_WORKFLOW_DESCRIPTION;
      state.nodes = [];
      state.edges = [];
      state.viewport = { ...DEFAULT_VIEWPORT };
      state.isDirty = false;
      state.lastSavedAt = undefined;
    },

    /** Mark the workflow as saved (clears isDirty). */
    markSaved(state) {
      state.isDirty = false;
      state.lastSavedAt = now();
    },

    /** Explicitly mark the workflow as dirty. */
    markDirty(state) {
      state.isDirty = true;
    },
  },
  extraReducers: (builder) => {
    // Handle the cross-slice resetApp action
    builder.addCase(resetApp, () => {
      return {
        ...initialState,
        id: generateWorkflowId(),
      };
    });

    // Handle the cross-slice importWorkflow action
    builder.addCase(importWorkflow, (state, action) => {
      const w = action.payload;
      state.id = w.id;
      state.name = w.name;
      state.description = w.description;
      state.nodes = w.nodes;
      state.edges = w.edges;
      state.viewport = w.viewport;
      state.isDirty = false;
      state.lastSavedAt = w.updatedAt;
    });

    // When a workflow is loaded via RTK Query, populate the active canvas state
    builder.addMatcher(
      workflowLibraryApi.endpoints.getWorkflow.matchFulfilled,
      (state, action) => {
        const w = action.payload;
        state.id = w.id;
        state.name = w.name;
        state.description = w.description;
        state.nodes = w.nodes;
        state.edges = w.edges;
        state.viewport = w.viewport;
        state.isDirty = false;
        state.lastSavedAt = w.updatedAt;
      },
    );
  },
});

export const {
  setNodes,
  setEdges,
  addNode,
  removeNode,
  updateNodeData,
  updateNodePosition,
  addEdge,
  removeEdge,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setViewport,
  setWorkflowMeta,
  loadWorkflow,
  newWorkflow,
  markSaved,
  markDirty,
} = workflowSlice.actions;

export default workflowSlice.reducer;
