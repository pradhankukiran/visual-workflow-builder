import type { VariableSetConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';
import { isExpression } from '../expressionEvaluator';

export interface VarSetRunnerResult {
  variable: string;
  value: unknown;
}

/**
 * Execute a Variable Set node.
 *
 * Resolves the value expression (if it contains `{{...}}` templates) and
 * stores the result as a named variable in the execution context.
 */
export async function runVariableSet(
  config: VariableSetConfig,
  context: ExecutionContext,
): Promise<VarSetRunnerResult> {
  let resolvedValue: unknown;

  if (isExpression(config.value)) {
    resolvedValue = context.resolveExpression(config.value);
  } else {
    // Try to parse as JSON, fall back to string
    try {
      resolvedValue = JSON.parse(config.value);
    } catch {
      resolvedValue = config.value;
    }
  }

  context.setVariable(config.variableName, resolvedValue);

  return {
    variable: config.variableName,
    value: resolvedValue,
  };
}
