import type { Workflow, WorkflowNode, WorkflowEdge } from '../types';
import {
  generateNodeId,
  generateEdgeId,
  generateWorkflowId,
} from './idGenerator';
import { now } from './dateUtils';

/**
 * Deep clone a workflow, generating fresh IDs for the workflow itself,
 * all nodes, and all edges. Edge source/target references are remapped
 * to the new node IDs.
 *
 * @param workflow - The original workflow to clone.
 * @param newName  - Optional new name for the cloned workflow.
 * @returns A new workflow with all IDs regenerated.
 */
export function cloneWorkflow(
  workflow: Workflow,
  newName?: string,
): Workflow {
  // Build a mapping from old node IDs to new node IDs
  const nodeIdMap = new Map<string, string>();
  for (const node of workflow.nodes) {
    nodeIdMap.set(node.id, generateNodeId());
  }

  // Clone nodes with new IDs
  const clonedNodes: WorkflowNode[] = workflow.nodes.map((node) => ({
    ...node,
    id: nodeIdMap.get(node.id)!,
    position: { ...node.position },
    data: {
      ...node.data,
      config: structuredClone(node.data.config),
      validationErrors: [...node.data.validationErrors],
    },
  }));

  // Clone edges with new IDs and remapped source/target
  const clonedEdges: WorkflowEdge[] = workflow.edges.map((edge) => ({
    ...edge,
    id: generateEdgeId(),
    source: nodeIdMap.get(edge.source) ?? edge.source,
    target: nodeIdMap.get(edge.target) ?? edge.target,
    data: edge.data ? { ...edge.data } : undefined,
  }));

  const timestamp = now();

  return {
    id: generateWorkflowId(),
    name: newName ?? `${workflow.name} (Copy)`,
    description: workflow.description,
    nodes: clonedNodes,
    edges: clonedEdges,
    viewport: { ...workflow.viewport },
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: [...workflow.tags],
    isTemplate: false,
  };
}
