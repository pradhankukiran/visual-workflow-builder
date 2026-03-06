/**
 * Server engine type definitions.
 *
 * Self-contained — no imports from src/.
 * Mirrors the client types but uses simplified node/edge shapes
 * (no React Flow dependency).
 */

// ─── Node Types ─────────────────────────────────────────────────────────────

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
  | 'variableGet'
  | 'llm'
  | 'email';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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

export type LogicalOperator = 'and' | 'or';

export interface BranchCondition {
  field: string;
  operator: ComparisonOperator;
  value: string;
  logicalOp: LogicalOperator;
}

// ─── Retry Config ───────────────────────────────────────────────────────────

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

// ─── Per-Type Config Interfaces ─────────────────────────────────────────────

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string;
  timeout: number;
  followRedirects: boolean;
  retry?: RetryConfig;
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
  retry?: RetryConfig;
}

export interface ConsoleOutputConfig {
  format: 'json' | 'text' | 'table';
  label?: string;
}

export interface WebhookTriggerConfig {
  path: string;
  method: HttpMethod;
  headers: Record<string, string>;
  /** Test data used during client-side "Run in Browser" execution */
  testData?: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: string;  // JSON string
    queryParams?: Record<string, string>;
  };
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

export type LlmProvider = 'anthropic' | 'openai';

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  credentialId?: string;
}

export interface EmailConfig {
  to: string;
  from: string;
  subject: string;
  body: string;
  bodyType: 'text' | 'html';
  apiKey: string;
  credentialId?: string;
}

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
  | VariableGetConfig
  | LlmConfig
  | EmailConfig;

// ─── Simplified Node & Edge (no React Flow) ─────────────────────────────────

export interface ServerWorkflowNodeData {
  label: string;
  type: NodeType;
  config: NodeConfig;
}

export interface ServerWorkflowNode {
  id: string;
  data: ServerWorkflowNodeData;
}

export interface ServerWorkflowEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    condition?: 'true' | 'false';
    edgeType?: 'default' | 'error';
  };
}

export interface ServerWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: ServerWorkflowNode[];
  edges: ServerWorkflowEdge[];
}

// ─── Execution Types ────────────────────────────────────────────────────────

export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface ExecutionLog {
  id: string;
  timestamp: string;
  nodeId?: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
  duration?: number;
}

export interface ExecutionRun {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  nodeStatuses: Record<string, NodeExecutionResult>;
  logs: ExecutionLog[];
  error?: string;
}

export interface ExecutionCallbacks {
  onNodeStart: (nodeId: string) => void;
  onNodeComplete: (nodeId: string, result: NodeExecutionResult) => void;
  onNodeError: (nodeId: string, error: string) => void;
  onLog: (log: ExecutionLog) => void;
}

/** Lightweight summary for execution list (no node outputs). */
export interface ExecutionRunSummary {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  nodeCount: number;
}
