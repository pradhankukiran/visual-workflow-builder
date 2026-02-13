import { nanoid } from '@reduxjs/toolkit';

/**
 * Generate a unique ID for a workflow node.
 * Format: `node_<nanoid>`
 */
export function generateNodeId(): string {
  return `node_${nanoid()}`;
}

/**
 * Generate a unique ID for a workflow edge.
 * Format: `edge_<nanoid>`
 */
export function generateEdgeId(): string {
  return `edge_${nanoid()}`;
}

/**
 * Generate a unique ID for a workflow.
 * Format: `wf_<nanoid>`
 */
export function generateWorkflowId(): string {
  return `wf_${nanoid()}`;
}

/**
 * Generate a unique ID for an execution run.
 * Format: `exec_<nanoid>`
 */
export function generateExecutionId(): string {
  return `exec_${nanoid()}`;
}

/**
 * Generate a unique ID for an execution log entry.
 * Format: `log_<nanoid>`
 */
export function generateLogId(): string {
  return `log_${nanoid()}`;
}
