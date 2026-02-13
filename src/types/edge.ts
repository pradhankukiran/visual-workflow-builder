import type { Edge } from '@xyflow/react';

/**
 * Data attached to workflow edges.
 */
export interface WorkflowEdgeData {
  label?: string;
  condition?: 'true' | 'false';
  [key: string]: unknown;
}

/**
 * A workflow edge extends React Flow's Edge with strongly-typed data.
 */
export type WorkflowEdge = Edge<WorkflowEdgeData>;
