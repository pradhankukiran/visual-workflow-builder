import { createAction } from '@reduxjs/toolkit';
import type { WorkflowNode, WorkflowEdge, WorkflowViewport } from '../../types';

/**
 * A snapshot of the workflow state for undo/redo history.
 */
export interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: WorkflowViewport;
  name: string;
  description: string;
}

/**
 * Capture the current workflow state before a mutation.
 */
export const captureSnapshot = createAction<WorkflowSnapshot>(
  'history/captureSnapshot',
);

/**
 * Undo the last workflow change.
 *
 * Payload is the CURRENT workflow state so it can be saved to the redo
 * (future) stack before the past snapshot is restored.
 */
export const undo = createAction<WorkflowSnapshot>('history/undo');

/**
 * Redo the last undone workflow change.
 *
 * Payload is the CURRENT workflow state so it can be saved to the undo
 * (past) stack before the future snapshot is restored.
 */
export const redo = createAction<WorkflowSnapshot>('history/redo');
