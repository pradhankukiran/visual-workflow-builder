import { isAnyOf } from '@reduxjs/toolkit';
import { startAppListening } from '@/app/listenerMiddleware';
import {
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  updateNodeData,
  onConnect,
  setNodes,
  setEdges,
  markSaved,
} from './workflowSlice';
import { selectWorkflowForSave, selectAllNodes, selectAllEdges } from './workflowSelectors';
import { addToast } from '@/features/toast/toastSlice';
import { setValidationResult } from '@/features/validation/validationSlice';
import { validateWorkflow } from '@/features/validation/validationEngine';
import { workflowLibraryApi } from '@/features/workflowLibrary/workflowLibraryApi';
import { AUTO_SAVE_DEBOUNCE_MS } from '@/constants/defaults';
import { now } from '@/utils/dateUtils';

/**
 * Matcher for workflow mutation actions that should trigger
 * auto-save and auto-validate.
 */
const isWorkflowMutation = isAnyOf(
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  updateNodeData,
  onConnect,
  setNodes,
  setEdges,
);

// ─── Auto-save listener (debounced) ──────────────────────────────────────────

startAppListening({
  matcher: isWorkflowMutation,
  effect: async (_action, listenerApi) => {
    // Cancel any previously pending auto-save for this listener instance.
    listenerApi.cancelActiveListeners();

    // Debounce: wait before saving.
    await listenerApi.delay(AUTO_SAVE_DEBOUNCE_MS);

    // Build the workflow object for persistence.
    const state = listenerApi.getState();
    const workflowData = selectWorkflowForSave(state);

    // Preserve createdAt from the RTK Query cache if available
    const cachedResult = workflowLibraryApi.endpoints.getWorkflow.select(workflowData.id)(state);
    const createdAt = cachedResult?.data?.createdAt ?? now();

    const workflow = {
      id: workflowData.id,
      name: workflowData.name,
      description: workflowData.description,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      viewport: workflowData.viewport,
      createdAt,
      updatedAt: now(),
      tags: [] as string[],
      isTemplate: false,
    };

    try {
      await listenerApi.dispatch(
        workflowLibraryApi.endpoints.saveWorkflow.initiate(workflow),
      ).unwrap();

      listenerApi.dispatch(markSaved());
      listenerApi.dispatch(
        addToast({ type: 'info', message: 'Workflow auto-saved' }),
      );
    } catch (error) {
      console.error('[workflowListeners] Auto-save failed:', error);
      listenerApi.dispatch(
        addToast({ type: 'error', message: 'Auto-save failed — check your connection' }),
      );
    }
  },
});

// ─── Auto-validate listener (debounced) ──────────────────────────────────────

startAppListening({
  matcher: isWorkflowMutation,
  effect: async (_action, listenerApi) => {
    // Cancel any previously pending validation.
    listenerApi.cancelActiveListeners();

    // Shorter debounce for validation feedback.
    await listenerApi.delay(500);

    const state = listenerApi.getState();
    const nodes = selectAllNodes(state);
    const edges = selectAllEdges(state);

    const result = validateWorkflow(nodes, edges);

    listenerApi.dispatch(setValidationResult(result));
  },
});
