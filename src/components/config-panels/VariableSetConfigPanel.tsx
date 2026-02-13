import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import type { VariableSetConfig } from '@/types';

export default function VariableSetConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as VariableSetConfig | undefined;

  const handleVariableNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('variableName', e.target.value);
    },
    [updateConfig],
  );

  const handleValueChange = useCallback(
    (value: string) => updateConfig('value', value),
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Variable Name */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Variable Name
        </label>
        <input
          type="text"
          value={config.variableName}
          onChange={handleVariableNameChange}
          placeholder="myVariable"
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs font-mono',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Variable name"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          The name of the workflow variable to store the value in. Use alphanumeric characters and underscores.
        </p>
      </div>

      {/* Value */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.value}
          onChange={handleValueChange}
          placeholder="{{$input.result}}"
          label="Value"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          The value to store. Use expressions to reference data from upstream nodes.
        </p>
      </div>

      {/* Preview */}
      {config.variableName && (
        <div
          className={clsx(
            'px-3 py-2.5 rounded-lg text-xs font-mono',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
          )}
        >
          <span className="text-[var(--color-accent)]">$vars.</span>
          <span className="text-[var(--color-text)]">{config.variableName}</span>
          <span className="text-[var(--color-text-muted)]"> = </span>
          <span className="text-[var(--color-success)]">{config.value || 'undefined'}</span>
        </div>
      )}
    </div>
  );
}
