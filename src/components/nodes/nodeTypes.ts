import type { NodeTypes } from '@xyflow/react';
import HttpRequestNode from './HttpRequestNode';
import JsonTransformNode from './JsonTransformNode';
import ConditionalBranchNode from './ConditionalBranchNode';
import DelayNode from './DelayNode';
import LoopNode from './LoopNode';
import MergeNode from './MergeNode';
import CodeNode from './CodeNode';
import ConsoleOutputNode from './ConsoleOutputNode';
import WebhookTriggerNode from './WebhookTriggerNode';
import ScheduleTriggerNode from './ScheduleTriggerNode';
import VariableSetNode from './VariableSetNode';
import VariableGetNode from './VariableGetNode';
import LlmNode from './LlmNode';
import EmailNode from './EmailNode';

/**
 * Maps each NodeType string to its corresponding React Flow custom node component.
 * Passed to the <ReactFlow nodeTypes={...}> prop.
 */
export const nodeTypes: NodeTypes = {
  httpRequest: HttpRequestNode,
  jsonTransform: JsonTransformNode,
  conditionalBranch: ConditionalBranchNode,
  delay: DelayNode,
  loop: LoopNode,
  merge: MergeNode,
  code: CodeNode,
  consoleOutput: ConsoleOutputNode,
  webhookTrigger: WebhookTriggerNode,
  scheduleTrigger: ScheduleTriggerNode,
  variableSet: VariableSetNode,
  variableGet: VariableGetNode,
  llm: LlmNode,
  email: EmailNode,
};
