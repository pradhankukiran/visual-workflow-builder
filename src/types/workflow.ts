import type { WorkflowNode } from './node';
import type { WorkflowEdge } from './edge';

/**
 * Viewport state for the canvas (position and zoom).
 */
export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Full workflow document including nodes, edges, and metadata.
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: WorkflowViewport;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isTemplate: boolean;
}

/**
 * Lightweight workflow metadata used for listing/browsing workflows
 * without loading the full graph data.
 */
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
