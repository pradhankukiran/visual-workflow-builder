import type {
  WorkflowNode,
  WorkflowEdge,
  ValidationResult,
  ValidationError,
  NodeType,
  HttpRequestConfig,
  ConditionalBranchConfig,
  CodeConfig,
  VariableSetConfig,
  VariableGetConfig,
  LoopConfig,
} from '../../types';
import { detectCycles, findDisconnectedNodes } from '../../engine/graphUtils';

// ─── Trigger Types ────────────────────────────────────────────────────────────

const TRIGGER_TYPES: Set<NodeType> = new Set(['webhookTrigger', 'scheduleTrigger']);

// ─── Per-Node Validators ──────────────────────────────────────────────────────

function validateHttpRequest(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as HttpRequestConfig;

  if (!config.url || config.url.trim() === '') {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `HTTP Request "${node.data.label}": URL must not be empty`,
      code: 'HTTP_URL_EMPTY',
    });
  }

  if (config.timeout !== undefined && config.timeout < 0) {
    errors.push({
      nodeId: node.id,
      type: 'warning',
      message: `HTTP Request "${node.data.label}": timeout is negative, will use default`,
      code: 'HTTP_TIMEOUT_NEGATIVE',
    });
  }

  return errors;
}

function validateConditionalBranch(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as ConditionalBranchConfig;

  if (!config.conditions || config.conditions.length === 0) {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `Conditional Branch "${node.data.label}": must have at least one condition`,
      code: 'CONDITIONAL_NO_CONDITIONS',
    });
  }

  return errors;
}

function validateCode(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as CodeConfig;

  if (!config.code || config.code.trim() === '') {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `Code "${node.data.label}": code must not be empty`,
      code: 'CODE_EMPTY',
    });
  }

  return errors;
}

function validateVariableSet(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as VariableSetConfig;

  if (!config.variableName || config.variableName.trim() === '') {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `Variable Set "${node.data.label}": variable name must not be empty`,
      code: 'VARSET_NAME_EMPTY',
    });
  }

  return errors;
}

function validateVariableGet(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as VariableGetConfig;

  if (!config.variableName || config.variableName.trim() === '') {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `Variable Get "${node.data.label}": variable name must not be empty`,
      code: 'VARGET_NAME_EMPTY',
    });
  }

  return errors;
}

function validateLoop(node: WorkflowNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.data.config as LoopConfig;

  if (!config.maxIterations || config.maxIterations <= 0) {
    errors.push({
      nodeId: node.id,
      type: 'error',
      message: `Loop "${node.data.label}": maxIterations must be greater than 0`,
      code: 'LOOP_MAX_ITERATIONS_INVALID',
    });
  }

  return errors;
}

/**
 * Dispatch per-node validation based on node type.
 */
function validateNode(node: WorkflowNode): ValidationError[] {
  switch (node.data.type) {
    case 'httpRequest':
      return validateHttpRequest(node);
    case 'conditionalBranch':
      return validateConditionalBranch(node);
    case 'code':
      return validateCode(node);
    case 'variableSet':
      return validateVariableSet(node);
    case 'variableGet':
      return validateVariableGet(node);
    case 'loop':
      return validateLoop(node);
    default:
      return [];
  }
}

// ─── Edge Validators ──────────────────────────────────────────────────────────

function validateEdges(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for duplicate edges between the same source/target
  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.source}→${edge.target}`;
    if (edgeKeys.has(key)) {
      errors.push({
        edgeId: edge.id,
        type: 'warning',
        message: `Duplicate edge between ${edge.source} and ${edge.target}`,
        code: 'EDGE_DUPLICATE',
      });
    }
    edgeKeys.add(key);
  }

  // Validate conditional branch edges: must have both true and false branches
  const conditionalNodes = nodes.filter(
    (n) => n.data.type === 'conditionalBranch',
  );

  for (const condNode of conditionalNodes) {
    const outEdges = edges.filter((e) => e.source === condNode.id);
    const hasTrue = outEdges.some((e) => e.data?.condition === 'true');
    const hasFalse = outEdges.some((e) => e.data?.condition === 'false');

    if (!hasTrue && !hasFalse && outEdges.length > 0) {
      // Has outgoing edges but none marked with conditions — warning
      errors.push({
        nodeId: condNode.id,
        type: 'warning',
        message: `Conditional Branch "${condNode.data.label}": outgoing edges should have true/false conditions`,
        code: 'CONDITIONAL_EDGES_UNLABELED',
      });
    } else if (hasTrue && !hasFalse) {
      errors.push({
        nodeId: condNode.id,
        type: 'warning',
        message: `Conditional Branch "${condNode.data.label}": missing "false" branch edge`,
        code: 'CONDITIONAL_MISSING_FALSE_BRANCH',
      });
    } else if (!hasTrue && hasFalse) {
      errors.push({
        nodeId: condNode.id,
        type: 'warning',
        message: `Conditional Branch "${condNode.data.label}": missing "true" branch edge`,
        code: 'CONDITIONAL_MISSING_TRUE_BRANCH',
      });
    }
  }

  return errors;
}

// ─── Main Validation Function ─────────────────────────────────────────────────

/**
 * Validate a workflow's nodes and edges.
 *
 * Checks for:
 * - Empty workflows
 * - Missing trigger nodes
 * - Graph cycles
 * - Disconnected nodes
 * - Per-node configuration errors
 * - Edge validation (duplicates, conditional branch completeness)
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Workflow-level checks ────────────────────────────────────────────────

  // Empty workflow
  if (nodes.length === 0) {
    errors.push({
      type: 'warning',
      message: 'Workflow is empty — add some nodes to get started',
      code: 'WORKFLOW_EMPTY',
    });

    return {
      isValid: true, // warnings don't block execution
      errors,
    };
  }

  // No trigger nodes
  const hasTrigger = nodes.some((n) => TRIGGER_TYPES.has(n.data.type));
  if (!hasTrigger) {
    errors.push({
      type: 'error',
      message: 'Workflow needs at least one trigger node (Webhook Trigger or Schedule Trigger)',
      code: 'WORKFLOW_NO_TRIGGER',
    });
  }

  // ── Cycle detection ──────────────────────────────────────────────────────

  const cycles = detectCycles(nodes, edges);
  for (const cycle of cycles) {
    const cyclePath = cycle.join(' → ');
    errors.push({
      type: 'error',
      message: `Cycle detected: ${cyclePath}`,
      code: 'WORKFLOW_CYCLE',
    });
  }

  // ── Disconnected nodes ───────────────────────────────────────────────────

  const disconnected = findDisconnectedNodes(nodes, edges);
  for (const nodeId of disconnected) {
    const node = nodes.find((n) => n.id === nodeId);
    const label = node?.data.label ?? nodeId;
    errors.push({
      nodeId,
      type: 'warning',
      message: `Node "${label}" is not connected to any trigger and will not be executed`,
      code: 'NODE_DISCONNECTED',
    });
  }

  // ── Per-node validation ──────────────────────────────────────────────────

  for (const node of nodes) {
    errors.push(...validateNode(node));
  }

  // ── Edge validation ──────────────────────────────────────────────────────

  errors.push(...validateEdges(nodes, edges));

  // ── Compute isValid ──────────────────────────────────────────────────────

  const hasErrors = errors.some((e) => e.type === 'error');

  return {
    isValid: !hasErrors,
    errors,
  };
}
