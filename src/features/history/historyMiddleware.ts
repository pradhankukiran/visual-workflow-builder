import { isAnyOf, type Middleware } from '@reduxjs/toolkit';
import type { RootReducerState } from '../../app/rootReducer';
import {
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  updateNodeData,
  onConnect,
} from '../workflow/workflowSlice';
import { captureSnapshot, type WorkflowSnapshot } from './historyActions';

/**
 * Matcher that identifies workflow actions which should trigger a
 * history snapshot capture.
 *
 * M16: loadWorkflow is excluded — loading a different workflow should not
 * create undo entries (prevents cross-workflow undo).
 */
const isHistoryTriggerAction = isAnyOf(
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  updateNodeData,
  onConnect,
);

/**
 * Redux middleware that captures the workflow state BEFORE certain
 * actions mutate it, enabling undo/redo.
 *
 * Uses the classic middleware signature: (store) => (next) => (action) => {}
 */
export const historyMiddleware: Middleware<object, RootReducerState> =
  (store) => (next) => (action) => {
    // Only capture a snapshot for actions that modify the workflow graph
    if (isHistoryTriggerAction(action)) {
      const state = store.getState();
      const wf = state.workflow;

      const snapshot: WorkflowSnapshot = {
        nodes: JSON.parse(JSON.stringify(wf.nodes)),
        edges: JSON.parse(JSON.stringify(wf.edges)),
        viewport: { ...wf.viewport },
        name: wf.name,
        description: wf.description,
      };

      // Dispatch captureSnapshot BEFORE the action is processed
      store.dispatch(captureSnapshot(snapshot));
    }

    // Let the action continue through the middleware chain
    return next(action);
  };
