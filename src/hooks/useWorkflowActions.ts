import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  addNode,
  removeNode,
  onConnect,
  updateNodeData,
  newWorkflow,
} from '@/features/workflow/workflowSlice';
import { selectNodeById } from '@/features/workflow/workflowSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import { generateNodeId } from '@/utils/idGenerator';
import type { NodeType, WorkflowNode, WorkflowNodeData, NodeConfig } from '@/types';
import type { RootState } from '@/app/store';

/**
 * Offset applied when duplicating a node so the clone doesn't
 * stack directly on top of the original.
 */
const DUPLICATE_OFFSET = { x: 40, y: 40 };

/**
 * Custom hook that returns bound dispatchers for common workflow mutations.
 * Provides a clean API so components don't need to import action creators
 * or know about the dispatch mechanism.
 */
export function useWorkflowActions() {
  const dispatch = useAppDispatch();

  /**
   * Create and add a new node of the given type at the given position.
   */
  const addNodeAtPosition = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const definition = NODE_DEFINITIONS[type];
      const node: WorkflowNode = {
        id: generateNodeId(),
        type,
        position,
        data: {
          label: definition.label,
          type,
          config: structuredClone(definition.defaultConfig),
          isValid: true,
          validationErrors: [],
        } as WorkflowNodeData,
      };
      dispatch(addNode(node));
      return node.id;
    },
    [dispatch],
  );

  /**
   * Remove a node by its ID and all connected edges.
   */
  const removeNodeById = useCallback(
    (nodeId: string) => {
      dispatch(removeNode(nodeId));
    },
    [dispatch],
  );

  /**
   * Duplicate an existing node, placing the clone offset from the original.
   * Returns the new node's ID, or undefined if the source node was not found.
   */
  const duplicateNode = useCallback(
    (nodeId: string) => {
      // We need to read the current state to find the node.
      // We use a thunk-like pattern by dispatching a function if supported,
      // but since RTK doesn't require thunk setup, we rely on the
      // store import pattern. Instead, we use a selector inline:
      // Actually, we can't call useAppSelector inside a callback.
      // We'll use the dispatch/getState pattern via a thunk.

      // Since we are in a hook, the simplest way is to accept that
      // duplicateNode needs the current node data. We'll use the
      // store directly via a thunk approach.
      return dispatch((_dispatch, getState) => {
        const state = getState() as RootState;
        const sourceNode = selectNodeById(state, nodeId);
        if (!sourceNode) return undefined;

        const newId = generateNodeId();
        const clonedNode: WorkflowNode = {
          id: newId,
          type: sourceNode.type,
          position: {
            x: (sourceNode.position?.x ?? 0) + DUPLICATE_OFFSET.x,
            y: (sourceNode.position?.y ?? 0) + DUPLICATE_OFFSET.y,
          },
          data: {
            ...sourceNode.data,
            config: structuredClone(sourceNode.data.config),
            validationErrors: [...sourceNode.data.validationErrors],
          },
        };

        _dispatch(addNode(clonedNode));
        return newId;
      }) as unknown as string | undefined;
    },
    [dispatch],
  );

  /**
   * Create an edge connecting two nodes.
   */
  const connectNodes = useCallback(
    (sourceId: string, targetId: string) => {
      dispatch(
        onConnect({
          source: sourceId,
          target: targetId,
          sourceHandle: null,
          targetHandle: null,
        }),
      );
    },
    [dispatch],
  );

  /**
   * Update the config of a specific node, merging the partial config
   * with the existing config.
   */
  const updateNodeConfig = useCallback(
    (nodeId: string, config: Partial<NodeConfig>) => {
      dispatch((_dispatch, getState) => {
        const state = getState() as RootState;
        const node = selectNodeById(state, nodeId);
        if (!node) return;

        _dispatch(
          updateNodeData({
            nodeId,
            data: {
              config: { ...node.data.config, ...config } as NodeConfig,
            },
          }),
        );
      });
    },
    [dispatch],
  );

  /**
   * Clear the entire workflow and start fresh.
   */
  const clearWorkflow = useCallback(() => {
    dispatch(newWorkflow());
  }, [dispatch]);

  return {
    addNodeAtPosition,
    removeNodeById,
    duplicateNode,
    connectNodes,
    updateNodeConfig,
    clearWorkflow,
  };
}
