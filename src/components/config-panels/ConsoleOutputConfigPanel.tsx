import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import type { ConsoleOutputConfig } from '@/types';

type OutputFormat = ConsoleOutputConfig['format'];

const FORMATS: { value: OutputFormat; label: string; description: string }[] = [
  {
    value: 'json',
    label: 'JSON',
    description: 'Output data as formatted JSON with syntax highlighting.',
  },
  {
    value: 'text',
    label: 'Plain Text',
    description: 'Output data as a plain text string.',
  },
  {
    value: 'table',
    label: 'Table',
    description: 'Output array data as a formatted table with columns.',
  },
];

export default function ConsoleOutputConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as ConsoleOutputConfig | undefined;

  const handleFormatChange = useCallback(
    (format: OutputFormat) => {
      updateConfig('format', format);
    },
    [updateConfig],
  );

  const handleLabelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('label', e.target.value || undefined);
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Output Format */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Output Format
        </label>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
                'border transition-all-fast',
                config.format === f.value
                  ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-muted)]',
              )}
            >
              <input
                type="radio"
                name="outputFormat"
                value={f.value}
                checked={config.format === f.value}
                onChange={() => handleFormatChange(f.value)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <div className="flex-1 min-w-0">
                <div
                  className={clsx(
                    'text-xs font-semibold',
                    config.format === f.value
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text)]',
                  )}
                >
                  {f.label}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                  {f.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Label (optional)
        </label>
        <input
          type="text"
          value={config.label ?? ''}
          onChange={handleLabelChange}
          placeholder="e.g., API Response"
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Console output label"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          An optional label shown in the execution console to identify this output.
        </p>
      </div>
    </div>
  );
}
