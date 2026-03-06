import type { WorkflowNode, WorkflowEdge } from '../types';

/**
 * Build an adjacency list (forward direction: source → targets).
 */
export function buildAdjacencyList(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
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
 * Build a reverse adjacency list (target → sources).
 */
function buildReverseAdjacencyList(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    const sources = adj.get(edge.target);
    if (sources) {
      sources.push(edge.source);
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
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
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

  // Start with nodes that have no incoming edges
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
 * Detect all cycles in the graph using DFS-based cycle detection.
 * Returns an array of cycle paths, where each path is an array of node IDs
 * forming the cycle. Returns an empty array if no cycles exist.
 */
export function detectCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string[][] {
  const adj = buildAdjacencyList(nodes, edges);
  const cycles: string[][] = [];

  const WHITE = 0; // unvisited
  const GRAY = 1; // in current DFS path
  const BLACK = 2; // fully explored

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const node of nodes) {
    color.set(node.id, WHITE);
  }

  function dfs(nodeId: string, path: string[]): void {
    color.set(nodeId, GRAY);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor);

      if (neighborColor === GRAY) {
        // Found a cycle — extract it from the path
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // close the cycle
          cycles.push(cycle);
        }
      } else if (neighborColor === WHITE) {
        parent.set(neighbor, nodeId);
        dfs(neighbor, path);
      }
    }

    path.pop();
    color.set(nodeId, BLACK);
  }

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) {
      parent.set(node.id, null);
      dfs(node.id, []);
    }
  }

  return cycles;
}

/**
 * Find nodes that are not reachable from any trigger/start node.
 * A trigger node is one with type 'webhookTrigger' or 'scheduleTrigger'.
 * If no trigger nodes exist, nodes with no incoming edges are considered starts.
 * Returns an array of disconnected node IDs.
 */
export function findDisconnectedNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string[] {
  if (nodes.length === 0) return [];

  const adj = buildAdjacencyList(nodes, edges);

  // Find trigger nodes
  let startNodes = nodes.filter(
    (n) =>
      n.data.type === 'webhookTrigger' || n.data.type === 'scheduleTrigger',
  );

  // If no triggers, use nodes with no incoming edges as start points
  if (startNodes.length === 0) {
    const hasIncoming = new Set<string>();
    for (const edge of edges) {
      hasIncoming.add(edge.target);
    }
    startNodes = nodes.filter((n) => !hasIncoming.has(n.id));
  }

  // BFS from all start nodes
  const reachable = new Set<string>();
  const queue = startNodes.map((n) => n.id);

  for (const id of queue) {
    reachable.add(id);
  }

  let front = 0;
  while (front < queue.length) {
    const current = queue[front++];
    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return nodes.filter((n) => !reachable.has(n.id)).map((n) => n.id);
}

/**
 * Get all node IDs downstream (transitively reachable) from the given node.
 */
export function getDownstreamNodes(
  nodeId: string,
  edges: WorkflowEdge[],
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
 * Get all node IDs upstream (transitively reaching) from the given node.
 */
export function getUpstreamNodes(
  nodeId: string,
  edges: WorkflowEdge[],
): string[] {
  const reverseAdj = new Map<string, string[]>();

  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) {
      reverseAdj.set(edge.target, []);
    }
    reverseAdj.get(edge.target)!.push(edge.source);
  }

  const visited = new Set<string>();
  const queue = [nodeId];

  let front = 0;
  while (front < queue.length) {
    const current = queue[front++];
    const neighbors = reverseAdj.get(current) ?? [];
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
 * Unlike `getUpstreamNodes`, this does NOT traverse transitively.
 */
export function getDirectParents(nodeId: string, edges: WorkflowEdge[]): string[] {
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
  edges: WorkflowEdge[],
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

  // Get transitive downstream for each branch root, excluding error edges
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

  // Nodes reachable from both branches are not exclusively on one branch,
  // so remove them from both exclusive lists
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
