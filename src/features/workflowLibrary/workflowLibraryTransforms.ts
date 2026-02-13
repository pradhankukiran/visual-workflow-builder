import type { Workflow, WorkflowMetadata } from '@/types';

/**
 * Extract lightweight metadata from a full workflow object.
 * Used for listing workflows without loading the full graph data.
 */
export function workflowToMetadata(workflow: Workflow): WorkflowMetadata {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    tags: workflow.tags,
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length,
  };
}

/**
 * Sort workflows by updatedAt date in descending order (most recent first).
 * Returns a new array without mutating the original.
 */
export function sortWorkflowsByDate(workflows: WorkflowMetadata[]): WorkflowMetadata[] {
  return [...workflows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Filter workflows by a search query. Matches against name, description, and tags.
 * The search is case-insensitive and matches partial strings.
 */
export function filterWorkflows(
  workflows: WorkflowMetadata[],
  query: string,
): WorkflowMetadata[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return workflows;

  return workflows.filter((w) => {
    const nameMatch = w.name.toLowerCase().includes(normalizedQuery);
    const descMatch = w.description.toLowerCase().includes(normalizedQuery);
    const tagMatch = w.tags.some((tag) =>
      tag.toLowerCase().includes(normalizedQuery),
    );
    return nameMatch || descMatch || tagMatch;
  });
}
