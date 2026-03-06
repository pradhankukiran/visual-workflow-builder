import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import { useAppSelector } from '@/app/hooks';
import MethodSelector from '@/components/shared/MethodSelector';
import KeyValueEditor from '@/components/shared/KeyValueEditor';
import JsonEditor from '@/components/shared/JsonEditor';
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
  const workflowId = useAppSelector((state) => state.workflow.id);
  const lastSavedAt = useAppSelector((state) => state.workflow.lastSavedAt);

  const config = selectedNode?.data.config as WebhookTriggerConfig | undefined;
  const [copied, setCopied] = useState(false);
  const [testDataOpen, setTestDataOpen] = useState(false);

  const headerEntries = useMemo(
    () => (config ? recordToEntries(config.headers) : []),
    [config?.headers],
  );

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhooks/${workflowId}`;
  }, [workflowId]);

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

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable or permission denied — silently ignore
    });
  }, [webhookUrl]);

  const updateTestData = useCallback(
    (field: string, value: unknown) => {
      updateConfig('testData', { ...config?.testData, [field]: value });
    },
    [updateConfig, config?.testData],
  );

  const testHeaderEntries = useMemo(
    () => (config ? recordToEntries(config.testData?.headers ?? {}) : []),
    [config?.testData?.headers],
  );

  const testQueryEntries = useMemo(
    () => (config ? recordToEntries(config.testData?.queryParams ?? {}) : []),
    [config?.testData?.queryParams],
  );

  const handleTestMethodChange = useCallback(
    (method: HttpMethod) => updateTestData('method', method),
    [updateTestData],
  );

  const handleTestHeadersChange = useCallback(
    (entries: Array<{ key: string; value: string }>) => {
      updateTestData('headers', entriesToRecord(entries));
    },
    [updateTestData],
  );

  const handleTestQueryChange = useCallback(
    (entries: Array<{ key: string; value: string }>) => {
      updateTestData('queryParams', entriesToRecord(entries));
    },
    [updateTestData],
  );

  const handleTestBodyChange = useCallback(
    (body: string) => updateTestData('body', body),
    [updateTestData],
  );

  const handleClearTestData = useCallback(() => {
    updateConfig('testData', undefined);
  }, [updateConfig]);

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

      {/* Webhook URL */}
      {lastSavedAt && (
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Webhook URL
          </label>
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            )}
          >
            <span className="flex-1 truncate text-[var(--color-text)]">{webhookUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy webhook URL"
              className={clsx(
                'flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium',
                'transition-all-fast',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
            Send HTTP requests to this URL to trigger the workflow on the server.
          </p>
        </div>
      )}

      {/* Test Data */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setTestDataOpen((prev) => !prev)}
          className={clsx(
            'flex items-center gap-1.5 w-full text-left',
            'text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]',
            'hover:text-[var(--color-text)] transition-all-fast',
          )}
        >
          <svg
            className={clsx(
              'w-3 h-3 transition-transform',
              testDataOpen && 'rotate-90',
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Test Data
        </button>

        {testDataOpen && (
          <div className="space-y-4 pt-1">
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              Used when running in browser. Ignored when triggered by real HTTP requests.
            </p>

            {/* Test Method */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Test Method
              </label>
              <MethodSelector
                value={config.testData?.method ?? config.method}
                onChange={handleTestMethodChange}
              />
            </div>

            {/* Test Headers */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Test Headers
              </label>
              <KeyValueEditor
                entries={testHeaderEntries}
                onChange={handleTestHeadersChange}
                keyPlaceholder="Header Name"
                valuePlaceholder="Header Value"
              />
            </div>

            {/* Test Query Params */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Test Query Params
              </label>
              <KeyValueEditor
                entries={testQueryEntries}
                onChange={handleTestQueryChange}
                keyPlaceholder="Param Name"
                valuePlaceholder="Param Value"
              />
            </div>

            {/* Test Body */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Test Body
              </label>
              <JsonEditor
                value={config.testData?.body ?? '{}'}
                onChange={handleTestBodyChange}
              />
            </div>

            {/* Clear Test Data */}
            <button
              type="button"
              onClick={handleClearTestData}
              className={clsx(
                'px-3 py-1.5 rounded-md text-[10px] font-medium',
                'bg-[var(--color-surface)] border border-[var(--color-border)]',
                'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                'transition-all-fast',
              )}
            >
              Clear Test Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
