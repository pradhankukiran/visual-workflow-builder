import { lazy, type ComponentType } from 'react';
import type { NodeType } from '@/types';

// Lazy-load each config panel for code-splitting
const HttpRequestConfigPanel = lazy(() => import('./HttpRequestConfigPanel'));
const JsonTransformConfigPanel = lazy(() => import('./JsonTransformConfigPanel'));
const ConditionalBranchConfigPanel = lazy(() => import('./ConditionalBranchConfigPanel'));
const DelayConfigPanel = lazy(() => import('./DelayConfigPanel'));
const LoopConfigPanel = lazy(() => import('./LoopConfigPanel'));
const MergeConfigPanel = lazy(() => import('./MergeConfigPanel'));
const CodeConfigPanel = lazy(() => import('./CodeConfigPanel'));
const ConsoleOutputConfigPanel = lazy(() => import('./ConsoleOutputConfigPanel'));
const WebhookTriggerConfigPanel = lazy(() => import('./WebhookTriggerConfigPanel'));
const ScheduleTriggerConfigPanel = lazy(() => import('./ScheduleTriggerConfigPanel'));
const VariableSetConfigPanel = lazy(() => import('./VariableSetConfigPanel'));
const VariableGetConfigPanel = lazy(() => import('./VariableGetConfigPanel'));
const LlmConfigPanel = lazy(() => import('./LlmConfigPanel'));
const EmailConfigPanel = lazy(() => import('./EmailConfigPanel'));

/**
 * Map of node types to their corresponding config panel components.
 */
const CONFIG_PANEL_MAP: Record<NodeType, ComponentType> = {
  httpRequest: HttpRequestConfigPanel,
  jsonTransform: JsonTransformConfigPanel,
  conditionalBranch: ConditionalBranchConfigPanel,
  delay: DelayConfigPanel,
  loop: LoopConfigPanel,
  merge: MergeConfigPanel,
  code: CodeConfigPanel,
  consoleOutput: ConsoleOutputConfigPanel,
  webhookTrigger: WebhookTriggerConfigPanel,
  scheduleTrigger: ScheduleTriggerConfigPanel,
  variableSet: VariableSetConfigPanel,
  variableGet: VariableGetConfigPanel,
  llm: LlmConfigPanel,
  email: EmailConfigPanel,
};

/**
 * Returns the config panel component for the given node type,
 * or null if no panel exists for that type.
 */
export function getConfigPanelForNodeType(nodeType: NodeType): ComponentType | null {
  return CONFIG_PANEL_MAP[nodeType] ?? null;
}
