import type { Workflow, WorkflowMetadata } from '../types';
import {
  STORAGE_WORKFLOWS_INDEX_KEY,
  workflowStorageKey,
} from '../constants/defaults';

/**
 * Load a value from localStorage and parse it as JSON.
 * Returns `null` if the key doesn't exist or parsing fails.
 */
export function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[localStorage] Failed to load key "${key}"`);
    return null;
  }
}

/**
 * Serialize a value to JSON and save it to localStorage.
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[localStorage] Failed to save key "${key}"`, error);
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[localStorage] Failed to remove key "${key}"`, error);
  }
}

// ─── Workflow-Specific Helpers ───────────────────────────────────────────────

/**
 * Load the index of all saved workflow metadata entries.
 */
function loadWorkflowIndex(): WorkflowMetadata[] {
  return loadFromStorage<WorkflowMetadata[]>(STORAGE_WORKFLOWS_INDEX_KEY) ?? [];
}

/**
 * Persist the workflow metadata index.
 */
function saveWorkflowIndex(index: WorkflowMetadata[]): void {
  saveToStorage(STORAGE_WORKFLOWS_INDEX_KEY, index);
}

/**
 * Get metadata for all saved workflows.
 */
export function getAllWorkflows(): WorkflowMetadata[] {
  return loadWorkflowIndex();
}

/**
 * Save a full workflow object (updates both the index and the workflow data).
 */
export function saveWorkflow(workflow: Workflow): void {
  try {
    // Save the full workflow document
    saveToStorage(workflowStorageKey(workflow.id), workflow);

    // Update the metadata index
    const index = loadWorkflowIndex();
    const meta: WorkflowMetadata = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      tags: workflow.tags,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    };

    const existingIdx = index.findIndex((m) => m.id === workflow.id);
    if (existingIdx >= 0) {
      index[existingIdx] = meta;
    } else {
      index.push(meta);
    }

    saveWorkflowIndex(index);
  } catch (error) {
    console.error(
      `[localStorage] Failed to save workflow "${workflow.id}"`,
      error,
    );
  }
}

/**
 * Delete a workflow from storage (removes both the index entry and the data).
 */
export function deleteWorkflow(id: string): void {
  try {
    removeFromStorage(workflowStorageKey(id));

    const index = loadWorkflowIndex();
    const filtered = index.filter((m) => m.id !== id);
    saveWorkflowIndex(filtered);
  } catch (error) {
    console.error(`[localStorage] Failed to delete workflow "${id}"`, error);
  }
}

/**
 * Load a full workflow by ID. Returns `null` if not found.
 */
export function loadWorkflow(id: string): Workflow | null {
  return loadFromStorage<Workflow>(workflowStorageKey(id));
}
