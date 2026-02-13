import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  Braces,
  GitBranch,
  Timer,
  Repeat,
  GitMerge,
  Code,
  Terminal,
  Webhook,
  Clock,
  Download,
  Upload,
} from 'lucide-react';
import type {
  NodeType,
  NodeConfig,
  HttpRequestConfig,
  JsonTransformConfig,
  ConditionalBranchConfig,
  DelayConfig,
  LoopConfig,
  MergeConfig,
  CodeConfig,
  ConsoleOutputConfig,
  WebhookTriggerConfig,
  ScheduleTriggerConfig,
  VariableSetConfig,
  VariableGetConfig,
} from '../types';

/**
 * Category grouping for the node palette sidebar.
 */
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'output' | 'data';

/**
 * Complete definition of a node type including UI metadata and default config.
 */
export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: NodeCategory;
  color: string;
  defaultConfig: NodeConfig;
}

// ─── Default Configs ─────────────────────────────────────────────────────────

const defaultHttpRequestConfig: HttpRequestConfig = {
  method: 'GET',
  url: '',
  headers: {},
  body: '',
  timeout: 30000,
  followRedirects: true,
};

const defaultJsonTransformConfig: JsonTransformConfig = {
  expression: '.',
  inputMapping: {},
};

const defaultConditionalBranchConfig: ConditionalBranchConfig = {
  conditions: [
    {
      field: '',
      operator: 'eq',
      value: '',
      logicalOp: 'and',
    },
  ],
};

const defaultDelayConfig: DelayConfig = {
  duration: 1000,
  type: 'fixed',
};

const defaultLoopConfig: LoopConfig = {
  maxIterations: 100,
};

const defaultMergeConfig: MergeConfig = {
  strategy: 'waitAll',
};

const defaultCodeConfig: CodeConfig = {
  code: '// Write your code here\nreturn input;',
  language: 'javascript',
};

const defaultConsoleOutputConfig: ConsoleOutputConfig = {
  format: 'json',
};

const defaultWebhookTriggerConfig: WebhookTriggerConfig = {
  path: '/webhook',
  method: 'POST',
  headers: {},
};

const defaultScheduleTriggerConfig: ScheduleTriggerConfig = {
  cron: '0 * * * *',
  timezone: 'UTC',
  enabled: true,
};

const defaultVariableSetConfig: VariableSetConfig = {
  variableName: '',
  value: '',
};

const defaultVariableGetConfig: VariableGetConfig = {
  variableName: '',
};

// ─── Node Definitions ────────────────────────────────────────────────────────

export const NODE_DEFINITIONS: Record<NodeType, NodeDefinition> = {
  httpRequest: {
    type: 'httpRequest',
    label: 'HTTP Request',
    description: 'Make an HTTP request to an external API or service',
    icon: Globe,
    category: 'action',
    color: '#3B82F6',
    defaultConfig: defaultHttpRequestConfig,
  },
  jsonTransform: {
    type: 'jsonTransform',
    label: 'JSON Transform',
    description: 'Transform JSON data using jq-like expressions',
    icon: Braces,
    category: 'data',
    color: '#8B5CF6',
    defaultConfig: defaultJsonTransformConfig,
  },
  conditionalBranch: {
    type: 'conditionalBranch',
    label: 'Conditional Branch',
    description: 'Branch the workflow based on conditions',
    icon: GitBranch,
    category: 'logic',
    color: '#F59E0B',
    defaultConfig: defaultConditionalBranchConfig,
  },
  delay: {
    type: 'delay',
    label: 'Delay',
    description: 'Pause execution for a specified duration',
    icon: Timer,
    category: 'logic',
    color: '#6B7280',
    defaultConfig: defaultDelayConfig,
  },
  loop: {
    type: 'loop',
    label: 'Loop',
    description: 'Iterate over items or repeat until a condition is met',
    icon: Repeat,
    category: 'logic',
    color: '#F97316',
    defaultConfig: defaultLoopConfig,
  },
  merge: {
    type: 'merge',
    label: 'Merge',
    description: 'Combine multiple branches back into one',
    icon: GitMerge,
    category: 'logic',
    color: '#14B8A6',
    defaultConfig: defaultMergeConfig,
  },
  code: {
    type: 'code',
    label: 'Code',
    description: 'Execute custom JavaScript code',
    icon: Code,
    category: 'action',
    color: '#10B981',
    defaultConfig: defaultCodeConfig,
  },
  consoleOutput: {
    type: 'consoleOutput',
    label: 'Console Output',
    description: 'Output data to the execution console',
    icon: Terminal,
    category: 'output',
    color: '#6366F1',
    defaultConfig: defaultConsoleOutputConfig,
  },
  webhookTrigger: {
    type: 'webhookTrigger',
    label: 'Webhook Trigger',
    description: 'Start the workflow when a webhook is received',
    icon: Webhook,
    category: 'trigger',
    color: '#EF4444',
    defaultConfig: defaultWebhookTriggerConfig,
  },
  scheduleTrigger: {
    type: 'scheduleTrigger',
    label: 'Schedule Trigger',
    description: 'Start the workflow on a cron schedule',
    icon: Clock,
    category: 'trigger',
    color: '#EC4899',
    defaultConfig: defaultScheduleTriggerConfig,
  },
  variableSet: {
    type: 'variableSet',
    label: 'Set Variable',
    description: 'Store a value in a workflow variable',
    icon: Download,
    category: 'data',
    color: '#0EA5E9',
    defaultConfig: defaultVariableSetConfig,
  },
  variableGet: {
    type: 'variableGet',
    label: 'Get Variable',
    description: 'Retrieve a value from a workflow variable',
    icon: Upload,
    category: 'data',
    color: '#22D3EE',
    defaultConfig: defaultVariableGetConfig,
  },
};

/**
 * All node types organized by category for the sidebar palette.
 */
export const NODE_CATEGORIES: Record<NodeCategory, NodeDefinition[]> =
  Object.values(NODE_DEFINITIONS).reduce(
    (acc, def) => {
      acc[def.category].push(def);
      return acc;
    },
    {
      trigger: [] as NodeDefinition[],
      action: [] as NodeDefinition[],
      logic: [] as NodeDefinition[],
      output: [] as NodeDefinition[],
      data: [] as NodeDefinition[],
    } as Record<NodeCategory, NodeDefinition[]>,
  );
