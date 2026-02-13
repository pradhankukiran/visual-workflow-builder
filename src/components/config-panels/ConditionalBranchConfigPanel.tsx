import { useCallback, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import type {
  ConditionalBranchConfig,
  BranchCondition,
  ComparisonOperator,
  LogicalOperator,
} from '@/types';

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'eq', label: 'equals (==)' },
  { value: 'neq', label: 'not equals (!=)' },
  { value: 'gt', label: 'greater than (>)' },
  { value: 'lt', label: 'less than (<)' },
  { value: 'gte', label: 'greater or equal (>=)' },
  { value: 'lte', label: 'less or equal (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'exists', label: 'exists' },
  { value: 'notExists', label: 'not exists' },
];

const VALUE_HIDDEN_OPERATORS = new Set<ComparisonOperator>(['exists', 'notExists']);

const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  eq: '==',
  neq: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  matches: 'matches',
  exists: 'exists',
  notExists: 'not exists',
};

export default function ConditionalBranchConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as ConditionalBranchConfig | undefined;

  const conditions = config?.conditions ?? [];

  const handleConditionFieldChange = useCallback(
    (index: number, field: string) => {
      if (!selectedNode) return;
      const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
      const updated = currentConditions.map((c, i) =>
        i === index ? { ...c, field } : c,
      );
      updateConfig('conditions', updated);
    },
    [updateConfig, selectedNode],
  );

  const handleConditionOperatorChange = useCallback(
    (index: number, operator: ComparisonOperator) => {
      if (!selectedNode) return;
      const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
      const updated = currentConditions.map((c, i) =>
        i === index ? { ...c, operator } : c,
      );
      updateConfig('conditions', updated);
    },
    [updateConfig, selectedNode],
  );

  const handleConditionValueChange = useCallback(
    (index: number, value: string) => {
      if (!selectedNode) return;
      const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
      const updated = currentConditions.map((c, i) =>
        i === index ? { ...c, value } : c,
      );
      updateConfig('conditions', updated);
    },
    [updateConfig, selectedNode],
  );

  const handleLogicalOpChange = useCallback(
    (index: number, logicalOp: LogicalOperator) => {
      if (!selectedNode) return;
      const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
      const updated = currentConditions.map((c, i) =>
        i === index ? { ...c, logicalOp } : c,
      );
      updateConfig('conditions', updated);
    },
    [updateConfig, selectedNode],
  );

  const handleAddCondition = useCallback(() => {
    if (!selectedNode) return;
    const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
    const newCondition: BranchCondition = {
      field: '',
      operator: 'eq',
      value: '',
      logicalOp: 'and',
    };
    updateConfig('conditions', [...currentConditions, newCondition]);
  }, [updateConfig, selectedNode]);

  const handleRemoveCondition = useCallback(
    (index: number) => {
      if (!selectedNode) return;
      const currentConditions = (selectedNode.data.config as ConditionalBranchConfig).conditions;
      if (currentConditions.length <= 1) return;
      updateConfig(
        'conditions',
        currentConditions.filter((_, i) => i !== index),
      );
    },
    [updateConfig, selectedNode],
  );

  // Build a visual preview of the conditions
  const preview = useMemo(() => {
    if (conditions.length === 0) return 'No conditions defined';

    return conditions
      .map((c, i) => {
        const fieldPart = c.field || '???';
        const opLabel = OPERATOR_LABELS[c.operator];
        const valuePart = VALUE_HIDDEN_OPERATORS.has(c.operator)
          ? ''
          : ` ${c.value || '???'}`;
        const condStr = `${fieldPart} ${opLabel}${valuePart}`;

        if (i === 0) return condStr;
        return `${c.logicalOp.toUpperCase()} ${condStr}`;
      })
      .join(' ');
  }, [conditions]);

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Conditions
      </label>

      {/* Condition Rows */}
      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="space-y-2">
            {/* Logical operator between conditions */}
            {index > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <select
                  value={condition.logicalOp}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    handleLogicalOpChange(index, e.target.value as LogicalOperator)
                  }
                  className={clsx(
                    'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                    'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
                    'text-[var(--color-accent)]',
                    'outline-none focus:border-[var(--color-accent)]',
                    'cursor-pointer',
                  )}
                  aria-label={`Logical operator between condition ${index} and ${index + 1}`}
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
            )}

            {/* Condition row */}
            <div
              className={clsx(
                'p-3 rounded-lg space-y-2 group',
                'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                  Condition {index + 1}
                </span>
                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(index)}
                    className={clsx(
                      'p-1 rounded-md transition-all-fast',
                      'text-[var(--color-text-muted)]',
                      'opacity-0 group-hover:opacity-100',
                      'hover:text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
                    )}
                    title="Remove condition"
                    aria-label={`Remove condition ${index + 1}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Field */}
              <ExpressionInput
                value={condition.field}
                onChange={(val) => handleConditionFieldChange(index, val)}
                placeholder="{{$input.status}}"
                label="Field"
              />

              {/* Operator */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Operator
                </label>
                <select
                  value={condition.operator}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    handleConditionOperatorChange(index, e.target.value as ComparisonOperator)
                  }
                  className={clsx(
                    'w-full px-3 py-2 rounded-md text-xs',
                    'bg-[var(--color-surface)] border border-[var(--color-border)]',
                    'text-[var(--color-text)]',
                    'outline-none focus:border-[var(--color-accent)]',
                    'transition-all-fast cursor-pointer',
                  )}
                  aria-label={`Operator for condition ${index + 1}`}
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value (hidden for exists/notExists) */}
              {!VALUE_HIDDEN_OPERATORS.has(condition.operator) && (
                <ExpressionInput
                  value={condition.value}
                  onChange={(val) => handleConditionValueChange(index, val)}
                  placeholder="expected value"
                  label="Value"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Condition */}
      <button
        type="button"
        onClick={handleAddCondition}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
          'text-[var(--color-accent)] font-medium',
          'border border-dashed border-[var(--color-border)]',
          'hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)]',
          'transition-all-fast w-full justify-center',
        )}
        aria-label="Add new condition"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 2v8M2 6h8" />
        </svg>
        Add Condition
      </button>

      {/* Preview */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Preview
        </label>
        <div
          className={clsx(
            'px-3 py-2.5 rounded-lg text-xs leading-relaxed',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'font-mono',
          )}
        >
          <span className="text-[var(--color-warning)] font-bold">IF </span>
          <span className="text-[var(--color-text)]">{preview}</span>
        </div>
      </div>
    </div>
  );
}
