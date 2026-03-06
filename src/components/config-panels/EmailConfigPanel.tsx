import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import CredentialSelector from '@/components/shared/CredentialSelector';
import type { EmailConfig } from '@/types';

// ─── Shared input class ─────────────────────────────────────────────────────

const inputClasses = clsx(
  'w-full px-3 py-2 rounded-md text-xs',
  'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
  'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:border-[var(--color-accent)]',
  'transition-all-fast',
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmailConfigPanel() {
  const { selectedNode, updateConfig, updateConfigBatch } = useNodeConfigPanel();

  const config = selectedNode?.data.config as EmailConfig | undefined;

  const handleToChange = useCallback(
    (value: string) => updateConfig('to', value),
    [updateConfig],
  );

  const handleFromChange = useCallback(
    (value: string) => updateConfig('from', value),
    [updateConfig],
  );

  const handleSubjectChange = useCallback(
    (value: string) => updateConfig('subject', value),
    [updateConfig],
  );

  const handleBodyTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => updateConfig('bodyType', e.target.value),
    [updateConfig],
  );

  const handleBodyChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => updateConfig('body', e.target.value),
    [updateConfig],
  );

  const handleCredentialChange = useCallback(
    (credentialId: string | undefined) => {
      if (credentialId) {
        updateConfigBatch({ credentialId, apiKey: '' });
      } else {
        updateConfig('credentialId', credentialId);
      }
    },
    [updateConfig, updateConfigBatch],
  );

  const handleApiKeyChange = useCallback(
    (key: string) => updateConfig('apiKey', key),
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* To */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.to}
          onChange={handleToChange}
          placeholder="recipient@example.com"
          label="To"
        />
      </div>

      {/* From */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.from}
          onChange={handleFromChange}
          placeholder="you@yourdomain.com"
          label="From"
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.subject}
          onChange={handleSubjectChange}
          placeholder="Email subject"
          label="Subject"
        />
      </div>

      {/* Body Type */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Body Type
        </label>
        <select
          value={config.bodyType}
          onChange={handleBodyTypeChange}
          className={inputClasses}
          aria-label="Body Type"
        >
          <option value="text">Text</option>
          <option value="html">HTML</option>
        </select>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Body
        </label>
        <textarea
          value={config.body}
          onChange={handleBodyChange}
          placeholder={config.bodyType === 'html' ? '<h1>Hello</h1>' : 'Email body text...'}
          rows={6}
          className={clsx(inputClasses, 'resize-y font-mono')}
          aria-label="Email Body"
        />
      </div>

      {/* API Key / Credential */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Resend API Key
        </label>
        <CredentialSelector
          value={config.credentialId}
          onChange={handleCredentialChange}
          apiKey={config.apiKey}
          onApiKeyChange={handleApiKeyChange}
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Resend API key. Get one at resend.com/api-keys
        </p>
      </div>
    </div>
  );
}
