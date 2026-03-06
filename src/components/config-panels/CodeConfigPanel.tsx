import { useCallback } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import CodeEditor from '@/components/shared/CodeEditor';
import type { CodeConfig, RetryConfig } from '@/types';

export default function CodeConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as CodeConfig | undefined;

  const handleCodeChange = useCallback(
    (code: string) => updateConfig('code', code),
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Language Indicator */}
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
            'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]',
            'text-[var(--color-success)]',
            'border border-[color-mix(in_srgb,var(--color-success)_20%,transparent)]',
          )}
        >
          {config.language}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          Custom code execution
        </span>
      </div>

      {/* Code Editor */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Code
        </label>
        <CodeEditor
          value={config.code}
          onChange={handleCodeChange}
          language={config.language}
          placeholder="// Write your code here\nreturn input;"
        />
      </div>

      {/* Retry Settings */}
      <details className="group">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] select-none">
          Retry Settings
        </summary>
        <div className="mt-2 space-y-3 pl-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="codeRetryEnabled"
              checked={config.retry?.enabled ?? false}
              onChange={(e) =>
                updateConfig('retry', {
                  enabled: e.target.checked,
                  maxRetries: config.retry?.maxRetries ?? 3,
                  initialDelayMs: config.retry?.initialDelayMs ?? 1000,
                  backoffMultiplier: config.retry?.backoffMultiplier ?? 2,
                } satisfies RetryConfig)
              }
              className={clsx(
                'w-4 h-4 rounded-md border border-[var(--color-border)]',
                'accent-[var(--color-accent)]',
              )}
            />
            <label
              htmlFor="codeRetryEnabled"
              className="text-xs text-[var(--color-text)] cursor-pointer select-none"
            >
              Enable Retry
            </label>
          </div>
          {config.retry?.enabled && (
            <>
              <div className="space-y-1">
                <label className="block text-[10px] text-[var(--color-text-muted)]">
                  Max Retries
                </label>
                <input
                  type="number"
                  value={config.retry.maxRetries}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1)
                      updateConfig('retry', { ...config.retry!, maxRetries: val });
                  }}
                  min={1}
                  max={10}
                  className={clsx(
                    'w-full px-3 py-1.5 rounded-md text-xs',
                    'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
                    'text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]',
                    'transition-all-fast',
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-[var(--color-text-muted)]">
                  Initial Delay (ms)
                </label>
                <input
                  type="number"
                  value={config.retry.initialDelayMs}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0)
                      updateConfig('retry', { ...config.retry!, initialDelayMs: val });
                  }}
                  min={0}
                  step={100}
                  className={clsx(
                    'w-full px-3 py-1.5 rounded-md text-xs',
                    'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
                    'text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]',
                    'transition-all-fast',
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-[var(--color-text-muted)]">
                  Backoff Multiplier
                </label>
                <input
                  type="number"
                  value={config.retry.backoffMultiplier}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1)
                      updateConfig('retry', { ...config.retry!, backoffMultiplier: val });
                  }}
                  min={1}
                  step={0.5}
                  className={clsx(
                    'w-full px-3 py-1.5 rounded-md text-xs',
                    'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
                    'text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]',
                    'transition-all-fast',
                  )}
                />
              </div>
            </>
          )}
        </div>
      </details>

      {/* Help Card */}
      <div
        className={clsx(
          'px-3 py-3 rounded-lg text-xs leading-relaxed space-y-2',
          'bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)]',
          'border border-[color-mix(in_srgb,var(--color-info)_20%,transparent)]',
          'text-[var(--color-text-muted)]',
        )}
      >
        <div className="font-semibold text-[var(--color-info)]">Available Variables</div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)] shrink-0 text-[11px]">input</code>
            <span>Data from upstream nodes</span>
          </li>
          <li className="flex items-start gap-2">
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)] shrink-0 text-[11px]">context</code>
            <span>Workflow variables and execution metadata</span>
          </li>
        </ul>
        <div className="pt-1 border-t border-[color-mix(in_srgb,var(--color-info)_15%,transparent)]">
          <p>Return a value to pass it downstream to the next node in the workflow.</p>
        </div>
      </div>
    </div>
  );
}
