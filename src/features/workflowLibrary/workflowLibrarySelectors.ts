import { workflowLibraryApi } from './workflowLibraryApi';

/**
 * Select the workflow list from the getWorkflows query cache.
 * Returns undefined if the query hasn't been run yet.
 */
export const selectWorkflowList =
  workflowLibraryApi.endpoints.getWorkflows.select();

/**
 * Create a selector for a specific workflow by ID from the getWorkflow query cache.
 * Returns undefined if the query hasn't been run yet for this ID.
 */
export function selectWorkflowById(id: string) {
  return workflowLibraryApi.endpoints.getWorkflow.select(id);
}
