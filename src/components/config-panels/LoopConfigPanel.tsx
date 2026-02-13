import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import type { LoopConfig } from '@/types';

export default function LoopConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as LoopConfig | undefined;

  const handleMaxIterationsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 1) {
        updateConfig('maxIterations', val);
      }
    },
    [updateConfig],
  );

  const handleLoopOverChange = useCallback(
    (value: string) => {
      updateConfig('loopOver', value || undefined);
    },
    [updateConfig],
  );

  const handleBreakConditionChange = useCallback(
    (value: string) => {
      updateConfig('breakCondition', value || undefined);
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Max Iterations */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Max Iterations
        </label>
        <input
          type="number"
          value={config.maxIterations}
          onChange={handleMaxIterationsChange}
          min={1}
          max={10000}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Maximum number of iterations"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Safety limit to prevent infinite loops. The loop will stop after this many iterations.
        </p>
      </div>

      {/* Loop Over */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.loopOver ?? ''}
          onChange={handleLoopOverChange}
          placeholder="{{$input.items}}"
          label="Loop Over (optional)"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          An expression referencing an array to iterate over. Each iteration receives the current item as input. Leave empty to use a counter-based loop.
        </p>
      </div>

      {/* Break Condition */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.breakCondition ?? ''}
          onChange={handleBreakConditionChange}
          placeholder="{{$item.done === true}}"
          label="Break Condition (optional)"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          An expression that is evaluated each iteration. If it evaluates to truthy, the loop stops early.
        </p>
      </div>

      {/* Help Card */}
      <div
        className={clsx(
          'px-3 py-3 rounded-lg text-xs leading-relaxed space-y-2',
          'bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)]',
          'border border-[color-mix(in_srgb,var(--color-info)_20%,transparent)]',
          'text-[var(--color-text-muted)]',
        )}
      >
        <div className="font-semibold text-[var(--color-info)]">How loops work</div>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            If <strong>Loop Over</strong> is set, each iteration receives the next array item.
          </li>
          <li>
            If <strong>Loop Over</strong> is empty, the loop runs as a counter from 0 to maxIterations.
          </li>
          <li>
            The <strong>Break Condition</strong> is checked at the start of each iteration.
          </li>
          <li>
            Available variables inside the loop: <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">$item</code>,{' '}
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">$index</code>,{' '}
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">$total</code>.
          </li>
        </ul>
      </div>
    </div>
  );
}
