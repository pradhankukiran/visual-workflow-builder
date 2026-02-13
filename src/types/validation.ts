/**
 * Severity level for a validation issue.
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * A single validation error or warning.
 */
export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: ValidationSeverity;
  message: string;
  code: string;
}

/**
 * The result of validating a workflow.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
