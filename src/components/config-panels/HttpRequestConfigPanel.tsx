import { useCallback, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import MethodSelector from '@/components/shared/MethodSelector';
import ExpressionInput from '@/components/shared/ExpressionInput';
import KeyValueEditor from '@/components/shared/KeyValueEditor';
import CodeEditor from '@/components/shared/CodeEditor';
import type { HttpRequestConfig, HttpMethod } from '@/types';

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

export default function HttpRequestConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as HttpRequestConfig | undefined;

  const headerEntries = useMemo(
    () => (config ? recordToEntries(config.headers) : []),
    [config?.headers],
  );

  const handleMethodChange = useCallback(
    (method: HttpMethod) => updateConfig('method', method),
    [updateConfig],
  );

  const handleUrlChange = useCallback(
    (url: string) => updateConfig('url', url),
    [updateConfig],
  );

  const handleHeadersChange = useCallback(
    (entries: Array<{ key: string; value: string }>) => {
      updateConfig('headers', entriesToRecord(entries));
    },
    [updateConfig],
  );

  const handleBodyChange = useCallback(
    (body: string) => updateConfig('body', body),
    [updateConfig],
  );

  const handleTimeoutChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        updateConfig('timeout', val);
      }
    },
    [updateConfig],
  );

  const handleFollowRedirectsChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('followRedirects', e.target.checked);
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  const showBody = config.method !== 'GET';

  return (
    <div className="space-y-4">
      {/* Method */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          HTTP Method
        </label>
        <MethodSelector value={config.method} onChange={handleMethodChange} />
      </div>

      {/* URL */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.url}
          onChange={handleUrlChange}
          placeholder="https://api.example.com/data"
          label="URL"
        />
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Headers
        </label>
        <KeyValueEditor
          entries={headerEntries}
          onChange={handleHeadersChange}
          keyPlaceholder="Header Name"
          valuePlaceholder="Header Value"
        />
      </div>

      {/* Body (hidden for GET) */}
      {showBody && (
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Request Body
          </label>
          <CodeEditor
            value={config.body}
            onChange={handleBodyChange}
            language="json"
            placeholder='{\n  "key": "value"\n}'
          />
        </div>
      )}

      {/* Timeout */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Timeout (ms)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={config.timeout}
            onChange={handleTimeoutChange}
            min={0}
            step={1000}
            className={clsx(
              'flex-1 px-3 py-2 rounded-md text-xs',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label="Request timeout in milliseconds"
          />
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
            = {(config.timeout / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Follow Redirects */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="followRedirects"
          checked={config.followRedirects}
          onChange={handleFollowRedirectsChange}
          className={clsx(
            'w-4 h-4 rounded-md border border-[var(--color-border)]',
            'accent-[var(--color-accent)]',
          )}
        />
        <label
          htmlFor="followRedirects"
          className="text-xs text-[var(--color-text)] cursor-pointer select-none"
        >
          Follow Redirects
        </label>
      </div>
    </div>
  );
}
