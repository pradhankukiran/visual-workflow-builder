import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectSelectedNodeId,
} from '@/features/ui/uiSelectors';
import { deselectNode, closeConfigPanel } from '@/features/ui/uiSlice';
import { updateNodeData, removeNode } from '@/features/workflow/workflowSlice';
import { selectNodeById } from '@/features/workflow/workflowSelectors';
import type { WorkflowNode, NodeConfig } from '@/types';
import type { RootState, AppDispatch } from '@/app/store';

/**
 * Return type for useNodeConfigPanel.
 */
interface NodeConfigPanelHook {
  /** The currently selected node, or undefined if nothing is selected. */
  selectedNode: WorkflowNode | undefined;
  /** Update a single field in the node's config. Merges with existing config. */
  updateConfig: (field: string, value: unknown) => void;
  /** Close the config panel and deselect the node. */
  closePanel: () => void;
  /** Delete the selected node and close the panel. */
  deleteNode: () => void;
  /** Update multiple fields in the node's config at once. */
  updateConfigBatch: (updates: Partial<NodeConfig>) => void;
  /** Update the node's label. */
  updateLabel: (label: string) => void;
}

/**
 * Custom hook for managing the node configuration panel.
 * Provides the selected node and action handlers for config changes,
 * panel dismissal, and node deletion.
 */
export function useNodeConfigPanel(): NodeConfigPanelHook {
  const dispatch = useAppDispatch();
  const selectedNodeId = useAppSelector(selectSelectedNodeId);

  // Select the full node object if an ID is selected
  const selectedNode = useAppSelector((state: RootState) =>
    selectedNodeId ? selectNodeById(state, selectedNodeId) : undefined,
  );

  /**
   * Update a single field within the node's config object.
   * Performs a shallow merge with the existing config.
   * Uses a thunk to read the latest state at dispatch time, avoiding stale closures.
   */
  const updateConfig = useCallback(
    (field: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch((innerDispatch: AppDispatch, getState: () => RootState) => {
        const state = getState();
        const node = state.workflow.nodes.find((n: WorkflowNode) => n.id === selectedNodeId);
        if (!node) return;
        const updatedConfig = { ...node.data.config, [field]: value } as NodeConfig;
        innerDispatch(updateNodeData({ nodeId: selectedNodeId, data: { config: updatedConfig } }));
      });
    },
    [dispatch, selectedNodeId],
  );

  /**
   * Update multiple config fields at once.
   * Uses a thunk to read the latest state at dispatch time, avoiding stale closures.
   */
  const updateConfigBatch = useCallback(
    (updates: Partial<NodeConfig>) => {
      if (!selectedNodeId) return;
      dispatch((innerDispatch: AppDispatch, getState: () => RootState) => {
        const state = getState();
        const node = state.workflow.nodes.find((n: WorkflowNode) => n.id === selectedNodeId);
        if (!node) return;
        const updatedConfig = { ...node.data.config, ...updates } as NodeConfig;
        innerDispatch(updateNodeData({ nodeId: selectedNodeId, data: { config: updatedConfig } }));
      });
    },
    [dispatch, selectedNodeId],
  );

  /**
   * Update the node's display label.
   */
  const updateLabel = useCallback(
    (label: string) => {
      if (!selectedNodeId) return;
      dispatch(
        updateNodeData({
          nodeId: selectedNodeId,
          data: { label },
        }),
      );
    },
    [dispatch, selectedNodeId],
  );

  /**
   * Close the config panel and deselect the current node.
   */
  const closePanel = useCallback(() => {
    dispatch(deselectNode());
    dispatch(closeConfigPanel());
  }, [dispatch]);

  /**
   * Delete the currently selected node and close the panel.
   */
  const deleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    dispatch(removeNode(selectedNodeId));
    dispatch(deselectNode());
    dispatch(closeConfigPanel());
  }, [dispatch, selectedNodeId]);

  return useMemo(
    () => ({
      selectedNode,
      updateConfig,
      closePanel,
      deleteNode,
      updateConfigBatch,
      updateLabel,
    }),
    [selectedNode, updateConfig, closePanel, deleteNode, updateConfigBatch, updateLabel],
  );
}
