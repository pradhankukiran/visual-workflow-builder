import type { ServerWorkflowNode, ServerWorkflowEdge } from './types';

/**
 * Build an adjacency list (forward direction: source → targets).
 */
function buildAdjacencyList(
  nodes: ServerWorkflowNode[],
  edges: ServerWorkflowEdge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    const targets = adj.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    }
  }

  return adj;
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns an ordered array of node IDs such that for every edge (u, v),
 * u comes before v in the ordering.
 *
 * @throws Error if the graph contains a cycle.
 */
export function topologicalSort(
  nodes: ServerWorkflowNode[],
  edges: ServerWorkflowEdge[],
): string[] {
  if (nodes.length === 0) return [];

  const adj = buildAdjacencyList(nodes, edges);
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: string[] = [];

  let front = 0;
  while (front < queue.length) {
    const current = queue[front++];
    sorted.push(current);

    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error(
      'Workflow graph contains a cycle. Topological sort is not possible.',
    );
  }

  return sorted;
}

/**
 * Get all node IDs downstream (transitively reachable) from the given node.
 */
export function getDownstreamNodes(
  nodeId: string,
  edges: ServerWorkflowEdge[],
): string[] {
  const adj = new Map<string, string[]>();

  for (const edge of edges) {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    adj.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const queue = [nodeId];

  let front = 0;
  while (front < queue.length) {
    const current = queue[front++];
    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Get direct parent node IDs (immediate predecessors) for the given node.
 */
export function getDirectParents(
  nodeId: string,
  edges: ServerWorkflowEdge[],
): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

/**
 * Get target node IDs connected via error edges from the given node.
 */
export function getErrorBranchTargets(
  nodeId: string,
  edges: { source: string; target: string; data?: { edgeType?: string } }[],
): string[] {
  return edges
    .filter(e => e.source === nodeId && e.data?.edgeType === 'error')
    .map(e => e.target);
}

/**
 * Get all nodes reachable ONLY through normal (non-error) edges from the given node.
 */
export function getNormalDownstream(
  nodeId: string,
  edges: { source: string; target: string; data?: { edgeType?: string } }[],
): Set<string> {
  const normalEdges = edges.filter(e => e.data?.edgeType !== 'error');
  const directTargets = normalEdges.filter(e => e.source === nodeId).map(e => e.target);
  const result = new Set<string>();
  const queue = [...directTargets];
  let front = 0;
  while (front < queue.length) {
    const current = queue[front++];
    if (result.has(current)) continue;
    result.add(current);
    normalEdges.filter(e => e.source === current).forEach(e => queue.push(e.target));
  }
  return result;
}

/**
 * For a conditional branch node, return which downstream nodes belong to the
 * true branch and which belong to the false branch based on edge conditions.
 */
export function getConditionalBranches(
  nodeId: string,
  edges: ServerWorkflowEdge[],
): { trueBranch: string[]; falseBranch: string[] } {
  const trueRoots: string[] = [];
  const falseRoots: string[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      const condition = edge.data?.condition;
      if (condition === 'true') {
        trueRoots.push(edge.target);
      } else if (condition === 'false') {
        falseRoots.push(edge.target);
      }
    }
  }

  // Only follow normal (non-error) edges to avoid error edges causing incorrect shared-node detection
  const normalEdges = edges.filter(e => e.data?.edgeType !== 'error');

  const trueSet = new Set<string>(trueRoots);
  const falseSet = new Set<string>(falseRoots);

  for (const root of trueRoots) {
    for (const downstream of getDownstreamNodes(root, normalEdges)) {
      trueSet.add(downstream);
    }
  }

  for (const root of falseRoots) {
    for (const downstream of getDownstreamNodes(root, normalEdges)) {
      falseSet.add(downstream);
    }
  }

  // Nodes reachable from both branches are merge points — exclude from both
  const shared = new Set<string>();
  for (const id of trueSet) {
    if (falseSet.has(id)) {
      shared.add(id);
    }
  }

  return {
    trueBranch: Array.from(trueSet).filter((id) => !shared.has(id)),
    falseBranch: Array.from(falseSet).filter((id) => !shared.has(id)),
  };
}
