import type { WorkflowViewport, Workflow } from '../types';

/**
 * Default viewport for a new canvas.
 */
export const DEFAULT_VIEWPORT: WorkflowViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

/**
 * Default position when adding a new node (center of a typical viewport).
 */
export const DEFAULT_NODE_POSITION = {
  x: 250,
  y: 250,
};

/**
 * Spacing offset applied when multiple nodes are added in sequence.
 */
export const NODE_POSITION_OFFSET = {
  x: 0,
  y: 80,
};

/**
 * Default workflow name for new untitled workflows.
 */
export const DEFAULT_WORKFLOW_NAME = 'Untitled Workflow';

/**
 * Default workflow description.
 */
export const DEFAULT_WORKFLOW_DESCRIPTION = '';

/**
 * Create a fresh, empty workflow object.
 */
export function createDefaultWorkflow(id: string): Workflow {
  const now = new Date().toISOString();
  return {
    id,
    name: DEFAULT_WORKFLOW_NAME,
    description: DEFAULT_WORKFLOW_DESCRIPTION,
    nodes: [],
    edges: [],
    viewport: { ...DEFAULT_VIEWPORT },
    createdAt: now,
    updatedAt: now,
    tags: [],
    isTemplate: false,
  };
}

/**
 * Maximum number of undo history steps.
 */
export const MAX_HISTORY_SIZE = 50;

/**
 * Auto-save debounce interval in milliseconds.
 */
export const AUTO_SAVE_DEBOUNCE_MS = 2000;

/**
 * Default toast notification duration in milliseconds.
 */
export const DEFAULT_TOAST_DURATION = 5000;

/**
 * localStorage key prefix for the application.
 */
export const STORAGE_KEY_PREFIX = 'vwb';

/**
 * localStorage key for the workflow library index.
 */
export const STORAGE_WORKFLOWS_INDEX_KEY = `${STORAGE_KEY_PREFIX}:workflows`;

/**
 * localStorage key for a specific workflow by ID.
 */
export function workflowStorageKey(id: string): string {
  return `${STORAGE_KEY_PREFIX}:workflow:${id}`;
}
