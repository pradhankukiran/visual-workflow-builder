/**
 * API-layer type definitions.
 *
 * Duplicated from src/types because API routes run in a separate
 * Node.js runtime and cannot use Vite path aliases or import from src/.
 */

export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: unknown[];
  edges: unknown[];
  viewport: WorkflowViewport;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isTemplate: boolean;
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
}

// ─── Response Envelope ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
