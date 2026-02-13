import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import type { MergeConfig } from '@/types';

type MergeStrategy = MergeConfig['strategy'];

const STRATEGIES: { value: MergeStrategy; label: string; description: string }[] = [
  {
    value: 'waitAll',
    label: 'Wait All',
    description:
      'Wait for all incoming branches to complete before continuing. All branch outputs are collected into an object keyed by source node ID.',
  },
  {
    value: 'waitAny',
    label: 'Wait Any',
    description:
      'Continue as soon as any one incoming branch completes. The output of the first completed branch is passed downstream.',
  },
  {
    value: 'combineArrays',
    label: 'Combine Arrays',
    description:
      'Wait for all branches and combine their array outputs into a single concatenated array.',
  },
];

export default function MergeConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as MergeConfig | undefined;

  const handleStrategyChange = useCallback(
    (strategy: MergeStrategy) => {
      updateConfig('strategy', strategy);
    },
    [updateConfig],
  );

  const handleTimeoutChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      if (val === '') {
        updateConfig('timeout', undefined);
        return;
      }
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) {
        updateConfig('timeout', num);
      }
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Strategy */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Merge Strategy
        </label>
        <div className="space-y-2">
          {STRATEGIES.map((s) => (
            <label
              key={s.value}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
                'border transition-all-fast',
                config.strategy === s.value
                  ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-muted)]',
              )}
            >
              <input
                type="radio"
                name="mergeStrategy"
                value={s.value}
                checked={config.strategy === s.value}
                onChange={() => handleStrategyChange(s.value)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <div className="flex-1 min-w-0">
                <div
                  className={clsx(
                    'text-xs font-semibold',
                    config.strategy === s.value
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text)]',
                  )}
                >
                  {s.label}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                  {s.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Timeout */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Timeout (ms, optional)
        </label>
        <input
          type="number"
          value={config.timeout ?? ''}
          onChange={handleTimeoutChange}
          min={0}
          step={1000}
          placeholder="No timeout"
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Merge timeout in milliseconds"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Maximum time to wait for all branches. Leave empty for no timeout.
          {config.timeout && config.timeout > 0 && (
            <span className="text-[var(--color-text)]">
              {' '}Currently: {(config.timeout / 1000).toFixed(1)}s
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
