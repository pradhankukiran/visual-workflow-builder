/**
 * Overall status of a workflow execution run.
 */
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Status of an individual node during execution.
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Log level for execution log entries.
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * A single log entry produced during workflow execution.
 */
export interface ExecutionLog {
  id: string;
  timestamp: string;
  nodeId?: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * Result of executing a single node.
 */
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
  duration?: number;
}

/**
 * A complete execution run tracking status of all nodes.
 */
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

/**
 * Callback functions invoked during workflow execution for real-time updates.
 */
export interface ExecutionCallbacks {
  onNodeStart: (nodeId: string) => void;
  onNodeComplete: (nodeId: string, result: NodeExecutionResult) => void;
  onNodeError: (nodeId: string, error: string) => void;
  onLog: (log: ExecutionLog) => void;
}
