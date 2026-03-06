import type {
  WorkflowNode,
  WorkflowEdge,
  ExecutionCallbacks,
  ExecutionLog,
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
  LlmConfig,
  EmailConfig,
} from '../types';
import type { ExecutionContext } from './ExecutionContext';
import { generateLogId } from '../utils/idGenerator';
import { now } from '../utils/dateUtils';

import { runHttpRequest } from './runners/httpRunner';
import { runJsonTransform } from './runners/jsonTransformRunner';
import { runConditional } from './runners/conditionalRunner';
import { runDelay } from './runners/delayRunner';
import { runLoop } from './runners/loopRunner';
import { runMerge } from './runners/mergeRunner';
import { runCode } from './runners/codeRunner';
import { runConsoleOutput } from './runners/consoleRunner';
import { runWebhookTrigger } from './runners/webhookRunner';
import { runScheduleTrigger } from './runners/scheduleRunner';
import { runVariableSet } from './runners/varSetRunner';
import { runVariableGet } from './runners/varGetRunner';
import { runLlm } from './runners/llmRunner';
import { runEmail } from './runners/emailRunner';

/**
 * Dispatch execution to the correct runner based on node type.
 *
 * Wraps execution with timing, logging, and uniform error handling.
 * The callbacks are invoked for real-time status updates.
 *
 * @returns The output produced by the runner.
 */
export async function runNode(
  node: WorkflowNode,
  context: ExecutionContext,
  callbacks: Partial<ExecutionCallbacks>,
  edges: WorkflowEdge[] = [],
): Promise<unknown> {
  const nodeType = node.data.type;
  const config = node.data.config;

  const logMessage = (level: ExecutionLog['level'], message: string, data?: unknown) => {
    if (callbacks.onLog) {
      callbacks.onLog({
        id: generateLogId(),
        timestamp: now(),
        nodeId: node.id,
        level,
        message,
        data,
      });
    }
  };

  logMessage('debug', `Starting execution of ${nodeType} node "${node.data.label}"`);

  const startTime = performance.now();

  try {
    let output: unknown;

    switch (nodeType) {
      case 'httpRequest':
        output = await runHttpRequest(config as HttpRequestConfig, context);
        break;

      case 'jsonTransform':
        output = await runJsonTransform(
          config as JsonTransformConfig,
          context,
          node.id,
          edges,
        );
        break;

      case 'conditionalBranch':
        output = await runConditional(
          config as ConditionalBranchConfig,
          context,
        );
        break;

      case 'delay':
        output = await runDelay(config as DelayConfig, context);
        break;

      case 'loop':
        output = await runLoop(config as LoopConfig, context);
        break;

      case 'merge':
        output = await runMerge(
          config as MergeConfig,
          context,
          node.id,
          edges,
        );
        break;

      case 'code':
        output = await runCode(
          config as CodeConfig,
          context,
          node.id,
          edges,
        );
        break;

      case 'consoleOutput':
        output = await runConsoleOutput(
          config as ConsoleOutputConfig,
          context,
          node.id,
          edges,
        );
        break;

      case 'webhookTrigger':
        output = await runWebhookTrigger(
          config as WebhookTriggerConfig,
          context,
        );
        break;

      case 'scheduleTrigger':
        output = await runScheduleTrigger(
          config as ScheduleTriggerConfig,
          context,
        );
        break;

      case 'variableSet':
        output = await runVariableSet(config as VariableSetConfig, context);
        break;

      case 'variableGet':
        output = await runVariableGet(config as VariableGetConfig, context);
        break;

      case 'llm':
        output = await runLlm(config as LlmConfig, context);
        break;

      case 'email':
        output = await runEmail(config as EmailConfig, context);
        break;

      default: {
        const exhaustiveCheck: never = nodeType;
        throw new Error(`Unknown node type: ${exhaustiveCheck}`);
      }
    }

    const duration = Math.round(performance.now() - startTime);
    logMessage('info', `Node "${node.data.label}" completed in ${duration}ms`, {
      duration,
    });

    return output;
  } catch (error: unknown) {
    const duration = Math.round(performance.now() - startTime);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logMessage('error', `Node "${node.data.label}" failed after ${duration}ms: ${errorMessage}`, {
      duration,
      error: errorMessage,
    });

    throw error;
  }
}
