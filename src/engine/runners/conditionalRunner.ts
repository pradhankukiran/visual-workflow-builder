import { get } from 'lodash-es';
import type { ConditionalBranchConfig, BranchCondition } from '../../types';
import type { ExecutionContext } from '../ExecutionContext';

export interface ConditionEvaluation {
  field: string;
  operator: string;
  expectedValue: string;
  actualValue: unknown;
  result: boolean;
}

export interface ConditionalRunnerResult {
  result: boolean;
  evaluatedConditions: ConditionEvaluation[];
}

/**
 * Resolve the actual value for a condition field from the execution context.
 * Supports expression templates `{{...}}` or direct lodash `get()` paths
 * against all node outputs.
 */
function resolveFieldValue(field: string, context: ExecutionContext): unknown {
  if (field.includes('{{')) {
    return context.resolveExpression(field);
  }

  // Try to resolve as a path in node outputs
  const allOutputs = context.getAllOutputs();
  return get(allOutputs, field);
}

/**
 * Evaluate a single condition.
 */
function evaluateCondition(
  condition: BranchCondition,
  context: ExecutionContext,
): ConditionEvaluation {
  const actualValue = resolveFieldValue(condition.field, context);
  const expectedValue = condition.value;

  let result = false;

  switch (condition.operator) {
    case 'eq': {
      const strActual = typeof actualValue === 'object' && actualValue !== null
        ? JSON.stringify(actualValue)
        : String(actualValue);
      result = strActual === expectedValue;
      break;
    }

    case 'neq': {
      const strActual = typeof actualValue === 'object' && actualValue !== null
        ? JSON.stringify(actualValue)
        : String(actualValue);
      result = strActual !== expectedValue;
      break;
    }

    case 'gt': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      break;
    }

    case 'lt': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      break;
    }

    case 'gte': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
      break;
    }

    case 'lte': {
      const numActual = actualValue === '' || actualValue === null || actualValue === undefined ? NaN : Number(actualValue);
      const numExpected = expectedValue === '' ? NaN : Number(expectedValue);
      result = !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
      break;
    }

    case 'contains':
      result = String(actualValue).includes(expectedValue);
      break;

    case 'startsWith':
      result = String(actualValue).startsWith(expectedValue);
      break;

    case 'endsWith':
      result = String(actualValue).endsWith(expectedValue);
      break;

    case 'matches': {
      try {
        const regex = new RegExp(expectedValue);
        result = regex.test(String(actualValue));
      } catch {
        result = false;
      }
      break;
    }

    case 'exists':
      result = actualValue !== undefined && actualValue !== null;
      break;

    case 'notExists':
      result = actualValue === undefined || actualValue === null;
      break;

    default:
      result = false;
  }

  return {
    field: condition.field,
    operator: condition.operator,
    expectedValue,
    actualValue,
    result,
  };
}

/**
 * Execute a Conditional Branch node.
 *
 * Evaluates all conditions against the execution context and combines them
 * using the specified logical operators (and/or). The first condition's
 * logicalOp is ignored (it starts the chain).
 *
 * Returns the boolean result and details of each evaluated condition.
 */
export async function runConditional(
  config: ConditionalBranchConfig,
  context: ExecutionContext,
): Promise<ConditionalRunnerResult> {
  if (config.conditions.length === 0) {
    return {
      result: true,
      evaluatedConditions: [],
    };
  }

  const evaluatedConditions: ConditionEvaluation[] = [];

  // Evaluate all conditions
  for (const condition of config.conditions) {
    evaluatedConditions.push(evaluateCondition(condition, context));
  }

  // Combine results using logical operators
  // The first condition establishes the initial value.
  // Subsequent conditions combine with the running result via their logicalOp.
  let combinedResult = evaluatedConditions[0].result;

  for (let i = 1; i < config.conditions.length; i++) {
    const logicalOp = config.conditions[i].logicalOp;
    const conditionResult = evaluatedConditions[i].result;

    if (logicalOp === 'and') {
      combinedResult = combinedResult && conditionResult;
    } else {
      combinedResult = combinedResult || conditionResult;
    }
  }

  return {
    result: combinedResult,
    evaluatedConditions,
  };
}
