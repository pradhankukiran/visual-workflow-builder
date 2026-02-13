import type { VariableGetConfig } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface VarGetRunnerResult {
  variable: string;
  value: unknown;
  usedDefault: boolean;
}

/**
 * Execute a Variable Get node.
 *
 * Retrieves a named variable from the execution context. If the variable
 * does not exist, falls back to the configured `defaultValue`.
 */
export async function runVariableGet(
  config: VariableGetConfig,
  context: ExecutionContext,
): Promise<VarGetRunnerResult> {
  const stored = context.getVariable(config.variableName);

  if (stored !== undefined) {
    return {
      variable: config.variableName,
      value: stored,
      usedDefault: false,
    };
  }

  // Variable not found — use default
  let defaultValue: unknown = config.defaultValue;

  // Try to parse default as JSON, fall back to string
  if (typeof config.defaultValue === 'string') {
    try {
      defaultValue = JSON.parse(config.defaultValue);
    } catch {
      defaultValue = config.defaultValue;
    }
  }

  return {
    variable: config.variableName,
    value: defaultValue ?? null,
    usedDefault: true,
  };
}
