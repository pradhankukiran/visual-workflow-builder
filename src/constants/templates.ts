import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
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
} from '@/types';
import { generateWorkflowId, generateNodeId, generateEdgeId } from '@/utils/idGenerator';
import { now } from '@/utils/dateUtils';
import { NODE_DEFINITIONS } from './nodeDefinitions';

// ─── Layout Constants ───────────────────────────────────────────────────────

/** Horizontal gap between sequential nodes (must exceed max-width: 280px). */
const X_STEP = 320;

/** Starting x position for the first node. */
const X_START = 100;

/** Baseline y position for linear flows. */
const Y_BASE = 250;

/** Vertical offset for branching paths above/below baseline. */
const Y_BRANCH_OFFSET = 150;

/** Helper: x position for the nth node (0-indexed). */
function xAt(index: number): number {
  return X_START + index * X_STEP;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  type: WorkflowNode['data']['type'],
  label: string,
  position: { x: number; y: number },
  configOverrides: Record<string, unknown> = {},
): WorkflowNode {
  const def = NODE_DEFINITIONS[type];
  return {
    id,
    type,
    position,
    data: {
      label,
      type,
      config: { ...def.defaultConfig, ...configOverrides },
      isValid: true,
      validationErrors: [],
    },
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  options?: {
    sourceHandle?: string;
    targetHandle?: string;
    data?: WorkflowEdge['data'];
  },
): WorkflowEdge {
  return {
    id,
    source,
    target,
    ...(options?.sourceHandle ? { sourceHandle: options.sourceHandle } : {}),
    ...(options?.targetHandle ? { targetHandle: options.targetHandle } : {}),
    ...(options?.data ? { data: options.data } : {}),
  };
}

// ─── Template 1: Simple API Call ─────────────────────────────────────────────

function createSimpleApiCall(): Workflow {
  const n1 = generateNodeId();
  const n2 = generateNodeId();
  const n3 = generateNodeId();
  const e1 = generateEdgeId();
  const e2 = generateEdgeId();
  const ts = now();

  return {
    id: generateWorkflowId(),
    name: 'Simple API Call',
    description: 'A basic workflow that receives a webhook, makes an HTTP GET request, and outputs the result to console.',
    nodes: [
      makeNode(n1, 'webhookTrigger', 'Webhook Trigger', { x: xAt(0), y: Y_BASE }, {
        path: '/api/trigger',
        method: 'POST',
        headers: {},
      } satisfies WebhookTriggerConfig),
      makeNode(n2, 'httpRequest', 'Fetch Post', { x: xAt(1), y: Y_BASE }, {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: {},
        body: '',
        timeout: 30000,
        followRedirects: true,
      } satisfies HttpRequestConfig),
      makeNode(n3, 'consoleOutput', 'Print Result', { x: xAt(2), y: Y_BASE }, {
        format: 'json',
        label: 'API Response',
      } satisfies ConsoleOutputConfig),
    ],
    edges: [
      makeEdge(e1, n1, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e2, n2, n3, { sourceHandle: 'source', targetHandle: 'target' }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: ts,
    updatedAt: ts,
    tags: ['api', 'beginner'],
    isTemplate: true,
  };
}

// ─── Template 2: API with Transform ──────────────────────────────────────────

function createApiWithTransform(): Workflow {
  const n1 = generateNodeId();
  const n2 = generateNodeId();
  const n3 = generateNodeId();
  const n4 = generateNodeId();
  const e1 = generateEdgeId();
  const e2 = generateEdgeId();
  const e3 = generateEdgeId();
  const ts = now();

  return {
    id: generateWorkflowId(),
    name: 'API with Transform',
    description: 'Fetches a list of users from an API, transforms the response to extract names, and outputs the result.',
    nodes: [
      makeNode(n1, 'webhookTrigger', 'Webhook Trigger', { x: xAt(0), y: Y_BASE }, {
        path: '/api/users',
        method: 'POST',
        headers: {},
      } satisfies WebhookTriggerConfig),
      makeNode(n2, 'httpRequest', 'Fetch Users', { x: xAt(1), y: Y_BASE }, {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users',
        headers: {},
        body: '',
        timeout: 30000,
        followRedirects: true,
      } satisfies HttpRequestConfig),
      makeNode(n3, 'jsonTransform', 'Extract Names', { x: xAt(2), y: Y_BASE }, {
        expression: '[].name',
        inputMapping: {},
      } satisfies JsonTransformConfig),
      makeNode(n4, 'consoleOutput', 'Print Names', { x: xAt(3), y: Y_BASE }, {
        format: 'json',
        label: 'User Names',
      } satisfies ConsoleOutputConfig),
    ],
    edges: [
      makeEdge(e1, n1, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e2, n2, n3, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e3, n3, n4, { sourceHandle: 'source', targetHandle: 'target' }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: ts,
    updatedAt: ts,
    tags: ['api', 'transform'],
    isTemplate: true,
  };
}

// ─── Template 3: Conditional Routing ─────────────────────────────────────────

function createConditionalRouting(): Workflow {
  const n1 = generateNodeId();
  const n2 = generateNodeId();
  const n3 = generateNodeId();
  const n4 = generateNodeId();
  const n5 = generateNodeId();
  const e1 = generateEdgeId();
  const e2 = generateEdgeId();
  const e3 = generateEdgeId();
  const e4 = generateEdgeId();
  const ts = now();

  return {
    id: generateWorkflowId(),
    name: 'Conditional Routing',
    description: 'Makes an HTTP request and routes to different outputs based on whether the response status is 200.',
    nodes: [
      makeNode(n1, 'webhookTrigger', 'Webhook Trigger', { x: xAt(0), y: Y_BASE }, {
        path: '/api/check',
        method: 'POST',
        headers: {},
      } satisfies WebhookTriggerConfig),
      makeNode(n2, 'httpRequest', 'API Call', { x: xAt(1), y: Y_BASE }, {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: {},
        body: '',
        timeout: 30000,
        followRedirects: true,
      } satisfies HttpRequestConfig),
      makeNode(n3, 'conditionalBranch', 'Check Status', { x: xAt(2), y: Y_BASE }, {
        conditions: [
          {
            field: 'statusCode',
            operator: 'eq',
            value: '200',
            logicalOp: 'and',
          },
        ],
      } satisfies ConditionalBranchConfig),
      makeNode(n4, 'consoleOutput', 'Success Output', { x: xAt(3), y: Y_BASE - Y_BRANCH_OFFSET }, {
        format: 'json',
        label: 'Success',
      } satisfies ConsoleOutputConfig),
      makeNode(n5, 'consoleOutput', 'Error Output', { x: xAt(3), y: Y_BASE + Y_BRANCH_OFFSET }, {
        format: 'text',
        label: 'Error',
      } satisfies ConsoleOutputConfig),
    ],
    edges: [
      makeEdge(e1, n1, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e2, n2, n3, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e3, n3, n4, { sourceHandle: 'true', targetHandle: 'target', data: { condition: 'true', label: 'true' } }),
      makeEdge(e4, n3, n5, { sourceHandle: 'false', targetHandle: 'target', data: { condition: 'false', label: 'false' } }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: ts,
    updatedAt: ts,
    tags: ['conditional', 'routing'],
    isTemplate: true,
  };
}

// ─── Template 4: Loop with Delay ─────────────────────────────────────────────

function createLoopWithDelay(): Workflow {
  const n1 = generateNodeId();
  const n2 = generateNodeId();
  const n3 = generateNodeId();
  const n4 = generateNodeId();
  const n5 = generateNodeId();
  const e1 = generateEdgeId();
  const e2 = generateEdgeId();
  const e3 = generateEdgeId();
  const e4 = generateEdgeId();
  const eLoop = generateEdgeId();
  const ts = now();

  // Loop body nodes are offset below baseline so the loop-back edge is visible.
  const yBody = Y_BASE + 140;

  return {
    id: generateWorkflowId(),
    name: 'Loop with Delay',
    description: 'Runs on a schedule, loops 3 times over an API call with a 1-second delay between each iteration.',
    nodes: [
      makeNode(n1, 'scheduleTrigger', 'Schedule Trigger', { x: xAt(0), y: Y_BASE }, {
        cron: '0 */6 * * *',
        timezone: 'UTC',
        enabled: true,
      } satisfies ScheduleTriggerConfig),
      makeNode(n2, 'loop', 'Loop 3x', { x: xAt(1), y: Y_BASE }, {
        maxIterations: 3,
      } satisfies LoopConfig),
      makeNode(n3, 'httpRequest', 'Fetch Post', { x: xAt(2), y: yBody }, {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: {},
        body: '',
        timeout: 30000,
        followRedirects: true,
      } satisfies HttpRequestConfig),
      makeNode(n4, 'delay', 'Wait 1s', { x: xAt(3), y: yBody }, {
        duration: 1000,
        type: 'fixed',
      } satisfies DelayConfig),
      makeNode(n5, 'consoleOutput', 'Print Result', { x: xAt(4), y: Y_BASE }, {
        format: 'json',
        label: 'Loop Output',
      } satisfies ConsoleOutputConfig),
    ],
    edges: [
      makeEdge(e1, n1, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e2, n2, n3, { sourceHandle: 'loop', targetHandle: 'target' }),
      makeEdge(e3, n3, n4, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(eLoop, n4, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e4, n2, n5, { sourceHandle: 'source', targetHandle: 'target' }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: ts,
    updatedAt: ts,
    tags: ['loop', 'delay', 'schedule'],
    isTemplate: true,
  };
}

// ─── Template 5: Variable Pipeline ───────────────────────────────────────────

function createVariablePipeline(): Workflow {
  const n1 = generateNodeId();
  const n2 = generateNodeId();
  const n3 = generateNodeId();
  const n4 = generateNodeId();
  const n5 = generateNodeId();
  const n6 = generateNodeId();
  const e1 = generateEdgeId();
  const e2 = generateEdgeId();
  const e3 = generateEdgeId();
  const e4 = generateEdgeId();
  const e5 = generateEdgeId();
  const e6 = generateEdgeId();
  const ts = now();

  // Two parallel branches feed into a merge node:
  //   Branch A (top):  Set API URL → Fetch Posts
  //   Branch B (bottom): Filter Results (code)
  // Then merge → output
  const yTop = Y_BASE - Y_BRANCH_OFFSET;
  const yBottom = Y_BASE + Y_BRANCH_OFFSET;

  return {
    id: generateWorkflowId(),
    name: 'Variable Pipeline',
    description: 'Sets a base API URL, fetches data in one branch while running a filter in another, merges results, and outputs.',
    nodes: [
      makeNode(n1, 'webhookTrigger', 'Webhook Trigger', { x: xAt(0), y: Y_BASE }, {
        path: '/api/pipeline',
        method: 'POST',
        headers: {},
      } satisfies WebhookTriggerConfig),
      // Branch A (top)
      makeNode(n2, 'variableSet', 'Set API URL', { x: xAt(1), y: yTop }, {
        variableName: 'apiUrl',
        value: 'https://jsonplaceholder.typicode.com',
      } satisfies VariableSetConfig),
      makeNode(n3, 'httpRequest', 'Fetch Posts', { x: xAt(2), y: yTop }, {
        method: 'GET',
        url: '{{$variables.apiUrl}}/posts',
        headers: {},
        body: '',
        timeout: 30000,
        followRedirects: true,
      } satisfies HttpRequestConfig),
      // Branch B (bottom)
      makeNode(n4, 'code', 'Filter Results', { x: xAt(1.5), y: yBottom }, {
        code: '// Filter posts to only include the first 5\nconst posts = Array.isArray(input) ? input : input?.data ?? [];\nreturn posts.slice(0, 5);',
        language: 'javascript',
      } satisfies CodeConfig),
      // Merge + output
      makeNode(n5, 'merge', 'Merge', { x: xAt(3), y: Y_BASE }, {
        strategy: 'waitAll',
      } satisfies MergeConfig),
      makeNode(n6, 'consoleOutput', 'Print Output', { x: xAt(4), y: Y_BASE }, {
        format: 'json',
        label: 'Pipeline Output',
      } satisfies ConsoleOutputConfig),
    ],
    edges: [
      // Webhook → Branch A (top)
      makeEdge(e1, n1, n2, { sourceHandle: 'source', targetHandle: 'target' }),
      makeEdge(e2, n2, n3, { sourceHandle: 'source', targetHandle: 'target' }),
      // Webhook → Branch B (bottom)
      makeEdge(e3, n1, n4, { sourceHandle: 'source', targetHandle: 'target' }),
      // Branch A → Merge (target-a)
      makeEdge(e4, n3, n5, { sourceHandle: 'source', targetHandle: 'target-a' }),
      // Branch B → Merge (target-b)
      makeEdge(e5, n4, n5, { sourceHandle: 'source', targetHandle: 'target-b' }),
      // Merge → output
      makeEdge(e6, n5, n6, { sourceHandle: 'source', targetHandle: 'target' }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: ts,
    updatedAt: ts,
    tags: ['variables', 'code', 'pipeline'],
    isTemplate: true,
  };
}

// ─── Exported Templates ──────────────────────────────────────────────────────

export interface WorkflowTemplate {
  /** Factory that creates a fresh Workflow with unique IDs each time. */
  create: () => Workflow;
  /** Display name of the template. */
  name: string;
  /** Short description for the template browser. */
  description: string;
  /** Tags for filtering. */
  tags: string[];
  /** Number of nodes in the template. */
  nodeCount: number;
}

/**
 * Pre-built workflow templates.
 *
 * Each template exposes a `create()` factory that generates a fresh Workflow
 * with unique IDs every time it is called, making it safe to use multiple
 * copies without ID collisions.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    create: createSimpleApiCall,
    name: 'Simple API Call',
    description: 'Webhook trigger, HTTP GET request, and console output.',
    tags: ['api', 'beginner'],
    nodeCount: 3,
  },
  {
    create: createApiWithTransform,
    name: 'API with Transform',
    description: 'Fetch data from an API, transform JSON, and output results.',
    tags: ['api', 'transform'],
    nodeCount: 4,
  },
  {
    create: createConditionalRouting,
    name: 'Conditional Routing',
    description: 'Route workflow execution based on API response status.',
    tags: ['conditional', 'routing'],
    nodeCount: 5,
  },
  {
    create: createLoopWithDelay,
    name: 'Loop with Delay',
    description: 'Iterate over API calls with a configurable delay between each.',
    tags: ['loop', 'delay', 'schedule'],
    nodeCount: 5,
  },
  {
    create: createVariablePipeline,
    name: 'Variable Pipeline',
    description: 'Parallel branches with variable setup, API call, code filter, merge, and output.',
    tags: ['variables', 'code', 'pipeline'],
    nodeCount: 6,
  },
];
