import type { Node } from '@xyflow/react';

/**
 * All supported node types in the visual workflow builder.
 */
export type NodeType =
  | 'httpRequest'
  | 'jsonTransform'
  | 'conditionalBranch'
  | 'delay'
  | 'loop'
  | 'merge'
  | 'code'
  | 'consoleOutput'
  | 'webhookTrigger'
  | 'scheduleTrigger'
  | 'variableSet'
  | 'variableGet';

/**
 * HTTP methods supported by the HTTP Request node.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Comparison operators for conditional branch logic.
 */
export type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'
  | 'exists'
  | 'notExists';

/**
 * Logical operator for combining multiple conditions.
 */
export type LogicalOperator = 'and' | 'or';

/**
 * A single condition used in conditional branch nodes.
 */
export interface BranchCondition {
  field: string;
  operator: ComparisonOperator;
  value: string;
  logicalOp: LogicalOperator;
}

// ─── Per-Type Config Interfaces ──────────────────────────────────────────────

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string;
  timeout: number;
  followRedirects: boolean;
}

export interface JsonTransformConfig {
  expression: string;
  inputMapping: Record<string, string>;
}

export interface ConditionalBranchConfig {
  conditions: BranchCondition[];
}

export interface DelayConfig {
  duration: number;
  type: 'fixed' | 'random';
  maxDuration?: number;
}

export interface LoopConfig {
  maxIterations: number;
  breakCondition?: string;
  loopOver?: string;
}

export interface MergeConfig {
  strategy: 'waitAll' | 'waitAny' | 'combineArrays';
  timeout?: number;
}

export interface CodeConfig {
  code: string;
  language: 'javascript';
}

export interface ConsoleOutputConfig {
  format: 'json' | 'text' | 'table';
  label?: string;
}

export interface WebhookTriggerConfig {
  path: string;
  method: HttpMethod;
  headers: Record<string, string>;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone: string;
  enabled: boolean;
}

export interface VariableSetConfig {
  variableName: string;
  value: string;
}

export interface VariableGetConfig {
  variableName: string;
  defaultValue?: string;
}

// ─── Union of All Config Types ───────────────────────────────────────────────

export type NodeConfig =
  | HttpRequestConfig
  | JsonTransformConfig
  | ConditionalBranchConfig
  | DelayConfig
  | LoopConfig
  | MergeConfig
  | CodeConfig
  | ConsoleOutputConfig
  | WebhookTriggerConfig
  | ScheduleTriggerConfig
  | VariableSetConfig
  | VariableGetConfig;

// ─── Workflow Node Data ──────────────────────────────────────────────────────

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  config: NodeConfig;
  isValid: boolean;
  validationErrors: string[];
  [key: string]: unknown;
}

/**
 * A workflow node extends React Flow's Node with strongly-typed data.
 */
export type WorkflowNode = Node<WorkflowNodeData, string>;
