import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import type { DelayConfig } from '@/types';

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export default function DelayConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as DelayConfig | undefined;

  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateConfig('type', e.target.value as 'fixed' | 'random');
    },
    [updateConfig],
  );

  const handleDurationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        updateConfig('duration', val);
      }
    },
    [updateConfig],
  );

  const handleMaxDurationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        updateConfig('maxDuration', val);
      }
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Delay Type */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Delay Type
        </label>
        <select
          value={config.type}
          onChange={handleTypeChange}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast cursor-pointer',
          )}
          aria-label="Delay type"
        >
          <option value="fixed">Fixed</option>
          <option value="random">Random</option>
        </select>
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          {config.type === 'fixed'
            ? 'Pauses execution for an exact duration.'
            : 'Pauses execution for a random duration between the minimum and maximum.'}
        </p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {config.type === 'random' ? 'Min Duration (ms)' : 'Duration (ms)'}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={config.duration}
            onChange={handleDurationChange}
            min={0}
            step={100}
            className={clsx(
              'flex-1 px-3 py-2 rounded-md text-xs',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label="Duration in milliseconds"
          />
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 min-w-[50px] text-right">
            = {formatMs(config.duration)}
          </span>
        </div>
      </div>

      {/* Max Duration (random only) */}
      {config.type === 'random' && (
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Max Duration (ms)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.maxDuration ?? config.duration * 2}
              onChange={handleMaxDurationChange}
              min={config.duration}
              step={100}
              className={clsx(
                'flex-1 px-3 py-2 rounded-md text-xs',
                'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
                'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
                'outline-none focus:border-[var(--color-accent)]',
                'transition-all-fast',
              )}
              aria-label="Maximum duration in milliseconds"
            />
            <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 min-w-[50px] text-right">
              = {formatMs(config.maxDuration ?? config.duration * 2)}
            </span>
          </div>
          {(config.maxDuration ?? config.duration * 2) < config.duration && (
            <p className="text-[10px] text-[var(--color-error)]">
              Max duration must be greater than or equal to the min duration.
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div
        className={clsx(
          'px-3 py-2.5 rounded-lg text-xs',
          'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
          'text-[var(--color-text-muted)]',
        )}
      >
        {config.type === 'fixed' ? (
          <span>
            Will pause for exactly <strong className="text-[var(--color-text)]">{formatMs(config.duration)}</strong>
          </span>
        ) : (
          <span>
            Will pause for a random duration between{' '}
            <strong className="text-[var(--color-text)]">{formatMs(config.duration)}</strong> and{' '}
            <strong className="text-[var(--color-text)]">{formatMs(config.maxDuration ?? config.duration * 2)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
