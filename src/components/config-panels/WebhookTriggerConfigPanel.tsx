import { useCallback, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import MethodSelector from '@/components/shared/MethodSelector';
import KeyValueEditor from '@/components/shared/KeyValueEditor';
import type { WebhookTriggerConfig, HttpMethod } from '@/types';

function recordToEntries(record: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function entriesToRecord(entries: Array<{ key: string; value: string }>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key.trim()) {
      record[entry.key] = entry.value;
    }
  }
  return record;
}

export default function WebhookTriggerConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as WebhookTriggerConfig | undefined;

  const headerEntries = useMemo(
    () => (config ? recordToEntries(config.headers) : []),
    [config],
  );

  const handleMethodChange = useCallback(
    (method: HttpMethod) => updateConfig('method', method),
    [updateConfig],
  );

  const handlePathChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('path', e.target.value);
    },
    [updateConfig],
  );

  const handleHeadersChange = useCallback(
    (entries: Array<{ key: string; value: string }>) => {
      updateConfig('headers', entriesToRecord(entries));
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Method */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          HTTP Method
        </label>
        <MethodSelector value={config.method} onChange={handleMethodChange} />
      </div>

      {/* Path */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Webhook Path
        </label>
        <input
          type="text"
          value={config.path}
          onChange={handlePathChange}
          placeholder="/webhook/my-endpoint"
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs font-mono',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Webhook endpoint path"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          The URL path that triggers this workflow. Example: <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">/webhook/orders</code>
        </p>
      </div>

      {/* Expected Headers */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Expected Headers
        </label>
        <KeyValueEditor
          entries={headerEntries}
          onChange={handleHeadersChange}
          keyPlaceholder="Header Name"
          valuePlaceholder="Expected Value"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Headers that incoming requests must include. Requests without matching headers will be rejected.
        </p>
      </div>

      {/* Preview */}
      <div
        className={clsx(
          'px-3 py-2.5 rounded-lg text-xs font-mono',
          'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
          'text-[var(--color-text-muted)]',
        )}
      >
        <span className="text-[var(--color-success)] font-bold">{config.method}</span>{' '}
        <span className="text-[var(--color-text)]">{config.path || '/webhook'}</span>
      </div>
    </div>
  );
}
